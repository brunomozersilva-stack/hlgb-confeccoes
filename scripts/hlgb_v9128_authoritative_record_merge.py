from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

if 'v91.28 Multiusuário' in s:
    print('v91.28 already applied')
    raise SystemExit(0)
if 'v91.27 Multiusuário' not in s:
    raise SystemExit('expected v91.27 base not found')

# v91.28: the normalized record store is authoritative. When a browser must preserve
# local work, it still MUST receive every current cloud record. Pending local writes
# are the only records allowed to remain local-preferred until their sync completes.
pat=re.compile(r'''(\s*hlgbRecordSnapshotRows\(module,moduleRows\);\n)\s*if\(!preserveLocal\)db\[module\]=moduleRows\.filter\(r=>!r\.deleted_at\)\.map\(r=>hlgbRecordRowValue\(r,module\)\);''')
replacement=r'''\1      const remoteActive=moduleRows.filter(r=>!r.deleted_at).map(r=>hlgbRecordRowValue(r,module));
      if(!preserveLocal){
        db[module]=remoteActive;
      }else{
        // HLGB v91.28 AUTHORITATIVE RECORD MERGE
        // Old versions could keep the legacy/local list (for example 44 products),
        // advance the cloud cursor to the newest timestamp and therefore never add
        // the missing records. Merge the full server snapshot before advancing.
        const local=hlgbRecordLocalMap(module);
        const pendingNow=hlgbRecordPendingRead();
        const pendingOps=Array.isArray(pendingNow?.modules?.[module])?pendingNow.modules[module]:[];
        const pendingIds=new Set(pendingOps.filter(op=>op&&op.deleted!==true).map(op=>String(op.id)));
        for(const row of moduleRows){
          const rid=String(row?.entity_id??"");
          if(!rid)continue;
          if(row.deleted_at){
            if(!pendingIds.has(rid))local.delete(rid);
            continue;
          }
          // Cloud wins unless this exact record has a confirmed local pending write.
          if(!pendingIds.has(rid))local.set(rid,hlgbRecordRowValue(row,module));
        }
        // Local-only new records are preserved; the pending queue will sync them.
        db[module]=[...local.values()];
      }'''
s2,n=pat.subn(replacement,s,count=1)
if n!=1:
    raise SystemExit(f'authoritative merge target count={n}')
s=s2

# Clarify the legacy-pending bootstrap: preserveLocal now means "merge", never
# "ignore the server snapshot". This is documentation-only but prevents regressions.
s=s.replace(
'''       // Carrega apenas snapshots das tabelas por registro para poder reaplicar
       // operações locais pendentes sem substituir a cópia deste navegador.
       try{await hlgbLoadNormalizedCore({preserveLocal:true})}catch(e){}''',
'''       // v91.28: carrega e MESCLA o snapshot oficial. Nenhuma máquina pode ficar
       // presa numa lista antiga; somente registros com gravação pendente local têm prioridade.
       try{await hlgbLoadNormalizedCore({preserveLocal:true})}catch(e){console.warn("HLGB v91.28 merge de bootstrap",e)}''',
1)

# Add an explicit post-load coverage repair for the two critical modules that exposed
# the incident. It is additive and never deletes local work.
marker='''async function hlgbEnsureRecordsOnlineAfterLogin(){'''
addon=r'''
function hlgb928EnsureCloudCoverage(module){
  try{
    if(!HLGB_RECORD_MODULES.includes(module))return 0;
    const snap=hlgbRecordSnapshots?.[module];
    if(!(snap instanceof Map))return 0;
    const local=hlgbRecordLocalMap(module);let added=0;
    for(const [id,row] of snap.entries()){
      if(!row||row.deleted_at||local.has(String(id)))continue;
      const data=hlgbRecordClone(row.data);
      if(data&&typeof data==="object"){
        local.set(String(id),data);added++;
      }
    }
    if(added)db[module]=[...local.values()];
    return added;
  }catch(e){console.warn("HLGB v91.28 coverage",module,e);return 0}
}

'''
if marker not in s:
    raise SystemExit('ensure records marker not found')
s=s.replace(marker,addon+marker,1)

old='''    if(ok){
      localSaveOnly();
      // Recalcula a fila pendente com os snapshots recém-carregados. Se a fila era'''
new='''    if(ok){
      // Safety net: after the official full load, a browser may never contain fewer
      // cloud products/orders than the authoritative snapshots.
      const repairedProducts=hlgb928EnsureCloudCoverage("products");
      const repairedOrders=hlgb928EnsureCloudCoverage("orders");
      if(repairedProducts||repairedOrders)console.warn("HLGB v91.28 repaired local cloud gaps",{products:repairedProducts,orders:repairedOrders});
      localSaveOnly();
      // Recalcula a fila pendente com os snapshots recém-carregados. Se a fila era'''
if old not in s:
    raise SystemExit('post-load coverage target not found')
s=s.replace(old,new,1)

s=s.replace('v91.27 Multiusuário','v91.28 Multiusuário')
s=s.replace('Versão v91.27','Versão v91.28')
s=s.replace('>v91.27</small>','>v91.28</small>')

p.write_text(s,encoding='utf-8')
print('patched HLGB v91.28 authoritative cloud merge')
