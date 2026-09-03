from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

if 'v91.26 Multiusuário' in s:
    print('v91.26 already applied')
    raise SystemExit(0)

if 'v91.25 Multiusuário' not in s:
    raise SystemExit('expected v91.25 base not found')

# Never infer a cloud deletion merely because a record is absent from one browser's local state.
old='for(const [id,old] of snap){if(!hlgb924ProtectImplicitDelete(module,old)&&!old.deleted_at&&!local.has(id)){ops.push({id,data:hlgbRecordClone(old.data),deleted:true});any=true}}'
if old not in s:
    raise SystemExit('record pending implicit-delete target not found')
s=s.replace(old,'// v91.26: ausência local nunca gera exclusão automática na nuvem.',1)

# Old queued delete operations from stale browsers must not be replayed after an update.
old='for(const op of ops){if(op.deleted){if(!hlgb924ProtectImplicitDelete(module,{data:op.data}))local.delete(String(op.id))}else local.set(String(op.id),hlgbRecordClone(op.data))}'
if old not in s:
    raise SystemExit('record pending replay target not found')
s=s.replace(old,'for(const op of ops){if(!op.deleted)local.set(String(op.id),hlgbRecordClone(op.data))}',1)

# Normal synchronisation now only creates/updates records. Deletion must be an explicit user action.
old='for(const [id,old] of snap){if(!hlgb924ProtectImplicitDelete(module,old)&&!old.deleted_at&&!local.has(id))jobs.push({id,data:old.data,deleted:true})}'
if old not in s:
    raise SystemExit('record sync implicit-delete target not found')
s=s.replace(old,'// v91.26: nenhuma exclusão é inferida por diferença entre navegador e nuvem.',1)

# Product delete is already an explicit action; mark it so the server-side guard accepts only this intentional path.
old='const result=await hlgbRecordSaveWithRetry("products",id,product,deleted);'
new='const result=await hlgbRecordSaveWithRetry("products",id,deleted?{...hlgbRecordClone(product),__hlgb_explicit_delete:true}:product,deleted);'
if old not in s:
    raise SystemExit('direct product delete marker target not found')
s=s.replace(old,new,1)

# Make the generic delete button explicit for every record-mode module. This keeps intentional
# deletions working while automatic/stale deletion attempts remain blocked.
addon=r'''
<!-- HLGB v91.26 DATA INTEGRITY GUARD -->
<script>
(function(){
  const previousDel=window.del;
  window.del=async function(type,id){
    const isRecordMode=Array.isArray(window.HLGB_RECORD_MODULES||HLGB_RECORD_MODULES) && (window.HLGB_RECORD_MODULES||HLGB_RECORD_MODULES).includes(type);
    if(!isRecordMode)return previousDel(type,id);
    if(!confirm("Excluir este registro?"))return;
    if(!Array.isArray(db[type]))return;
    const removed=db[type].find(x=>String(x.id)===String(id));
    if(!removed){alert("Não consegui localizar esse registro para excluir. Atualize a tela e tente novamente.");return}
    try{
      if(!hlgbRecordReady){const ok=await hlgbEnsureRecordsOnlineAfterLogin();if(!ok)throw new Error("A nuvem não está pronta para confirmar a exclusão.")}
      const rid=typeof hlgbRecordId==='function'?hlgbRecordId(type,removed):String(id);
      const payload={...hlgbRecordClone(removed),__hlgb_explicit_delete:true};
      const confirmed=await hlgbRecordSaveWithRetry(type,rid,payload,true);
      if(!confirmed||confirmed.applied!==true)throw new Error("A nuvem não confirmou a exclusão.");
      db[type]=db[type].filter(x=>String(x.id)!==String(id));
      localSaveOnly();
      try{auditAction("Excluiu registro",`${type} — ${id}`)}catch(e){}
      if(type==='products'){
        if(typeof renderProducts==='function')renderProducts();
        if(typeof renderDash==='function')renderDash();
      }else if(type==='finance'){
        if(typeof renderFinance==='function')renderFinance();
        if(typeof renderDash==='function')renderDash();
      }else if(type==='purchases'){
        if(typeof renderPurchases==='function')renderPurchases();
        if(typeof renderFinance==='function')renderFinance();
      }else if(typeof renderAll==='function')renderAll();
    }catch(err){
      console.error('HLGB v91.26 explicit delete failed',err);
      if(!db[type].some(x=>String(x.id)===String(id)))db[type].push(removed);
      try{localSaveOnly()}catch(e){}
      try{if(typeof renderAll==='function')renderAll()}catch(e){}
      alert("A exclusão NÃO foi confirmada na nuvem. O registro foi mantido para evitar perda de dados.");
    }
  };
})();
</script>
'''
body=s.rfind('</body>')
if body<0:
    raise SystemExit('final body close not found')
s=s[:body]+addon+'\n'+s[body:]

s=s.replace('v91.25 Multiusuário','v91.26 Multiusuário')
s=s.replace('Versão v91.25','Versão v91.26')
s=s.replace('>v91.25</small>','>v91.26</small>')

p.write_text(s,encoding='utf-8')
print('patched HLGB v91.26: no implicit deletes + explicit delete guard')
