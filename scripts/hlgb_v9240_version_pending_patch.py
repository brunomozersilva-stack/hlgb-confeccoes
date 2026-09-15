from pathlib import Path

PATH = Path("app9240.html")
MARKER = "HLGB_V9240_VERSION_PENDING_SELF_HEAL"
LOGIN_OLD = '<b style="color:#6f3f59">Versão v92.13</b>'
LOGIN_NEW = '<b style="color:#6f3f59">Versão v92.40</b>'
PUBLIC_OLD = "window.hlgb955FlushNow=()=>flush955(true);window.hlgb955FlushSilent=()=>flush955(false);"
PUBLIC_NEW = """window.hlgb955FlushNow=async()=>{try{if(typeof window.hlgb955ReconcileServer==='function')await window.hlgb955ReconcileServer()}catch(_){}return flush955(true)};
window.hlgb955FlushSilent=async()=>{try{if(typeof window.hlgb955ReconcileServer==='function')await window.hlgb955ReconcileServer()}catch(_){}return flush955(false)};"""
ANCHOR = "window.hlgb955PendingCount=()=>count955();"
AUTH_OLD = "function cloudRestoreStoredAuth(allowExplicitRestore=false){\n  if(allowExplicitRestore!==true)return false;"
AUTH_NEW = "function cloudRestoreStoredAuth(allowExplicitRestore=true){"

INJECTION = r'''
/* HLGB_V9240_VERSION_PENDING_SELF_HEAL
   Confere a fila local diretamente no Supabase antes de reenviar.
   Se a resposta anterior se perdeu mas o dado já chegou ao servidor,
   remove apenas a pendência comprovadamente satisfeita. */
window.hlgb955ReconcileServer=async function(){
 if(flushBusy955||!cloudReady955())return false;
 flushBusy955=true;
 try{
  const pending=entries955().slice();
  let changed=false;
  for(const e of pending){
   if(!e||!e.key||!e.module||e.id==null)continue;
   try{
    const rows=await cloudRequest('hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at&module=eq.'+encodeURIComponent(String(e.module))+'&entity_id=eq.'+encodeURIComponent(String(e.id))+'&limit=1',{method:'GET'});
    const row=Array.isArray(rows)&&rows.length?rows[0]:null;
    if(!pendingSatisfied990(e,row))continue;
    await ack955(e.key,{applied:true,data:row.data,revision:row.revision,updated_at:row.updated_at},row.data);
    applyData955(e.module,e.id,row.data,!!row.deleted_at);
    changed=true;
   }catch(err){console.warn('[HLGB 92.40] conferência da pendência',e.module,e.id,err)}
  }
  if(changed){
   try{localSaveOnly()}catch(_){}
   console.info('[HLGB 92.40] pendências já confirmadas na nuvem foram conciliadas');
  }
  return count955()===0;
 }finally{
  flushBusy955=false;
  update955();
 }
};
function schedulePendingSelfHeal9240(){
 [700,2400,7000,15000].forEach(ms=>setTimeout(()=>window.hlgb955FlushSilent?.(),ms));
}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(schedulePendingSelfHeal9240,0);
else setTimeout(schedulePendingSelfHeal9240,1200);
window.addEventListener('online',()=>setTimeout(()=>window.hlgb955FlushSilent?.(),300));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(()=>window.hlgb955FlushSilent?.(),500)});
'''

s = PATH.read_text(encoding="utf-8")

if LOGIN_OLD in s:
    s = s.replace(LOGIN_OLD, LOGIN_NEW)
elif LOGIN_NEW not in s:
    raise SystemExit("rótulo de versão do login não encontrado")

if AUTH_OLD in s:
    s = s.replace(AUTH_OLD, AUTH_NEW, 1)
elif AUTH_NEW not in s:
    raise SystemExit("rotina de restauração de sessão não encontrada")

if MARKER not in s:
    if PUBLIC_OLD not in s:
        raise SystemExit("atalhos públicos da fila v91.59 não encontrados")
    s = s.replace(PUBLIC_OLD, PUBLIC_NEW, 1)
    if ANCHOR not in s:
        raise SystemExit("âncora da fila v91.59 não encontrada")
    s = s.replace(ANCHOR, ANCHOR + INJECTION, 1)

PATH.write_text(s, encoding="utf-8")
print("v92.40: versão, restauração de sessão e fila pendente corrigidas")

# A manutenção antiga retirava o corte local mesmo quando a nuvem recusava
# sua exclusão. O sincronizador então recriava o corte a cada login.
FIX_MARKER = "HLGB_V9240_REFRESH_MIRROR_QUEUE_FIX"
if FIX_MARKER not in s:
    def replace_once(old, new):
        global s
        if s.count(old) != 1:
            raise SystemExit("âncora de refresh ausente ou ambígua: " + old[:100])
        s = s.replace(old, new, 1)

    start = s.index("  for(const c of bad){", s.index("async function cleanupMirrorPlans9219(){"))
    end = s.index("  const ids=new Set(bad.map", start)
    s = s[:start] + "  // Apenas apresentação local; nunca excluir automaticamente na nuvem.\n" + s[end:]
    replace_once(
        "if(!o||o.invoiceReady||o.noteReady)return false;const st=norm9203(o.status);",
        "if(!o||o.invoiceReady||o.noteReady)return false;const st=norm9203(o.status);\n"
        "  if(o.workflowSourceOrderId&&(norm9203(o.cutStatus).includes('finalizado')||o.workflowStageReconciled===true))return false;"
    )
    replace_once(
        "host.insertBefore(box,before||null)",
        "host.insertBefore(box,before?.parentNode===host?before:host.firstElementChild)"
    )
    cancel = r'''
/* HLGB_V9240_REFRESH_MIRROR_QUEUE_FIX */
function isAutomaticMirrorDelete9240(e){
 return e?.module==='cuts'&&e.deleted===true&&e.data?.supersededV9219===true
  &&e.data?.supersededReason==='mirror_order_already_cut'
  &&e.data?.__hlgb_explicit_delete!==true;
}
async function cancelAutomaticMirrorDelete9240(e){
 if(!isAutomaticMirrorDelete9240(e))return false;
 const rows=await cloudRequest('hlgb_records?select=module,entity_id,data,deleted_at,revision,updated_at&module=eq.cuts&entity_id=eq.'+encodeURIComponent(String(e.id))+'&limit=1',{method:'GET'});
 const row=Array.isArray(rows)?rows[0]:null;
 // Uma exclusão já efetivada segue a conciliação normal; nunca restaurar aqui.
 if(!row||row.deleted_at)return false;
 const w=read955(),current=w.entries[e.key];
 // Uma edição concorrente não pode ser descartada após a consulta.
 if(!current||norm955(current)!==norm955(e))return false;
 let archive=JSON.parse(localStorage.getItem(ARC955)||'[]');
 if(!Array.isArray(archive))archive=[];
 archive.push({...C955(e),applied:false,cancelled:true,cancelledAt:now955(),
  cancellationReason:'Exclusão automática desativada; registro preservado na nuvem.',
  serverUpdatedAt:row.updated_at,serverRevision:row.revision});
 localStorage.setItem(ARC955,JSON.stringify(archive.slice(-MAX_ARCH955)));
 delete w.entries[e.key];write955(w);
 await idbDel955(e.key);
 const latest=read955().entries[e.key];if(latest)await idbPut955(latest);
 const map=hlgbRecordSnapshots?.cuts;if(map instanceof Map)map.set(String(e.id),C955(row));
 lastErr955='';update955();
 console.info('[HLGB 92.40] exclusão automática cancelada; corte preservado',e.id);
 return true;
}
'''
    replace_once("function pendingSatisfied990(e,s){", cancel + "\nfunction pendingSatisfied990(e,s){")
    replace_once("x?.opId&&x?.key&&x?.applied!==false", "x?.opId&&x?.key&&(x?.applied!==false||x?.cancelled===true)")
    replace_once("try{if(s&&pendingSatisfied990(e,s))", "try{if(await cancelAutomaticMirrorDelete9240(e)){changed=true;continue}if(s&&pendingSatisfied990(e,s))")
    replace_once("    if(!pendingSatisfied990(e,row))continue;", "    if(await cancelAutomaticMirrorDelete9240(e)){changed=true;continue}\n    if(!pendingSatisfied990(e,row))continue;")
    PATH.write_text(s, encoding="utf-8")
print("v92.40: ciclo de cortes espelho e montagem do histórico corrigidos")
