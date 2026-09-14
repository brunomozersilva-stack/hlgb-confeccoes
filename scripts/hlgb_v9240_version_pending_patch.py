from pathlib import Path

PATH = Path("app9240.html")
MARKER = "HLGB_V9240_VERSION_PENDING_SELF_HEAL"
LOGIN_OLD = '<b style="color:#6f3f59">Versão v92.13</b>'
LOGIN_NEW = '<b style="color:#6f3f59">Versão v92.40</b>'
PUBLIC_OLD = "window.hlgb955FlushNow=()=>flush955(true);window.hlgb955FlushSilent=()=>flush955(false);"
PUBLIC_NEW = """window.hlgb955FlushNow=async()=>{try{if(typeof window.hlgb955ReconcileServer==='function')await window.hlgb955ReconcileServer()}catch(_){}return flush955(true)};
window.hlgb955FlushSilent=async()=>{try{if(typeof window.hlgb955ReconcileServer==='function')await window.hlgb955ReconcileServer()}catch(_){}return flush955(false)};"""
ANCHOR = "window.hlgb955PendingCount=()=>count955();"

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

if MARKER not in s:
    if PUBLIC_OLD not in s:
        raise SystemExit("atalhos públicos da fila v91.59 não encontrados")
    s = s.replace(PUBLIC_OLD, PUBLIC_NEW, 1)
    if ANCHOR not in s:
        raise SystemExit("âncora da fila v91.59 não encontrada")
    s = s.replace(ANCHOR, ANCHOR + INJECTION, 1)

PATH.write_text(s, encoding="utf-8")
print("v92.40: versão visível corrigida e fila pendente com autorrecuperação")
