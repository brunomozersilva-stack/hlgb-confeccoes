from pathlib import Path

src=Path('app9232.html')
out=Path('app9233.html')
s=src.read_text(encoding='utf-8')

# Avança os carimbos visuais atuais para impedir que qualquer bloco antigo volte a exibir 92.32.
s=s.replace('v92.32','v92.33')

addon=r'''<!-- HLGB_V9233_ORDERS_PENDING_CLEANUP_START -->
<style>
/* A lista de pedidos deixa de aumentar a altura da página: quando houver muitos,
   a rolagem acontece dentro da própria lista e a paginação continua disponível. */
#pedidos #ordersTable{
  max-height:56vh;
  overflow:auto;
  border:1px solid var(--line);
  border-radius:12px;
  background:#fff;
  overscroll-behavior:contain;
}
#pedidos #ordersTable table{margin:0}
#pedidos #ordersTable thead th{
  position:sticky;
  top:0;
  z-index:3;
  box-shadow:0 1px 0 #e8dce2;
}
#pedidos #orderPagerBottom9229{
  position:sticky;
  bottom:0;
  z-index:2;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  flex-wrap:wrap;
  margin-top:8px;
  padding:10px 8px;
  background:#fffafb;
  border:1px solid var(--line);
  border-radius:10px;
}
@media(max-width:900px){#pedidos #ordersTable{max-height:52vh}}
</style>
<script>
(function(){
'use strict';
const WAL9233='hlgb_durable_wal_v1';
const ARC9233='hlgb_durable_wal_archive_v1';
const IDB9233='hlgb_durable_wal';
const STORE9233='entries';

function stamp9233(){
  try{document.title='HLGB Confecções — Sistema de Gestão v92.33 Multiusuário'}catch(e){}
  const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.33';
}

function relabelSecurity9233(){
  const h=document.querySelector('#hlgb955Panel h3');
  if(h)h.textContent='🔐 Segurança de gravação — v92.33';
  const m=document.querySelector('#hlgb955Panel .muted');
  if(m&&/Uma alteração só aparece/.test(m.textContent||''))m.textContent='O sistema só mostra “Salvo na nuvem” depois da confirmação do banco. Pendências reais continuam protegidas neste navegador.';
}

document.addEventListener('click',function(ev){
  if(ev.target?.closest?.('#hlgb955SaveBadge'))setTimeout(relabelSecurity9233,0);
},true);
window.addEventListener('focus',()=>setTimeout(stamp9233,20));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(stamp9233,20)});

function readWal9233(){
  try{const x=JSON.parse(localStorage.getItem(WAL9233)||'null');if(x&&x.entries&&typeof x.entries==='object')return x}catch(e){}
  return {schema:1,updatedAt:new Date().toISOString(),entries:{}};
}
function writeWal9233(w){w.schema=1;w.updatedAt=new Date().toISOString();localStorage.setItem(WAL9233,JSON.stringify(w))}
function archive9233(e){
  try{
    let a=JSON.parse(localStorage.getItem(ARC9233)||'[]');if(!Array.isArray(a))a=[];
    a.push({opId:e?.opId||'',key:e?.key||'',module:e?.module||'',id:String(e?.id||''),deleted:true,applied:true,alreadyAbsent:true,archivedAt:new Date().toISOString(),note:'Exclusão antiga já ausente na nuvem; removida da fila local pela v92.33.'});
    if(a.length>250)a=a.slice(-250);localStorage.setItem(ARC9233,JSON.stringify(a));
  }catch(_){}
}
async function idbDelete9233(key){
  try{
    const d=await new Promise((resolve,reject)=>{const r=indexedDB.open(IDB9233,1);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE9233))db.createObjectStore(STORE9233,{keyPath:'key'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    await new Promise((resolve,reject)=>{const tx=d.transaction(STORE9233,'readwrite');tx.objectStore(STORE9233).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});d.close();
  }catch(e){console.warn('[HLGB 92.33] não foi possível limpar IndexedDB',e)}
}

async function cleanupOrphanDeletes9233(){
  try{
    if(typeof cloudRequest!=='function')return 0;
    try{if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false)}catch(_){}
    const w=readWal9233(),entries=Object.entries(w.entries||{});let removed=0;
    for(const [key,e] of entries){
      if(!e||e.deleted!==true||(+e.attempts||0)<3||!e.module||e.id==null)continue;
      let rows=null;
      try{
        rows=await cloudRequest('hlgb_records?select=entity_id,deleted_at,revision,updated_at&module=eq.'+encodeURIComponent(String(e.module))+'&entity_id=eq.'+encodeURIComponent(String(e.id))+'&limit=1',{method:'GET'});
      }catch(err){console.warn('[HLGB 92.33] conferência de pendência',e.module,e.id,err);continue}
      if(!Array.isArray(rows))continue;
      const active=rows.some(r=>r&&!r.deleted_at);
      if(active)continue;
      archive9233(e);
      delete w.entries[key];
      await idbDelete9233(key);
      removed++;
    }
    if(removed){
      writeWal9233(w);
      document.getElementById('hlgb955Panel')?.remove();
      try{if(typeof window.hlgb955FlushSilent==='function')await window.hlgb955FlushSilent()}catch(_){}
      const badge=document.getElementById('hlgb955SaveBadge');
      const left=Object.keys(readWal9233().entries||{}).length;
      if(badge&&left===0){badge.className='ok';badge.textContent='✅ Salvo na nuvem';badge.title='Nenhuma alteração pendente.'}
      console.info('[HLGB 92.33] pendências de exclusão já ausentes removidas:',removed);
    }
    return removed;
  }catch(e){console.warn('[HLGB 92.33] limpeza de pendências antigas',e);return 0}
}
window.hlgbReconcilePending9233=cleanupOrphanDeletes9233;

function reinforceOrders9233(){
  const box=document.getElementById('ordersTable');if(!box)return;
  box.style.maxHeight='56vh';box.style.overflow='auto';
  const fs=document.getElementById('orderFilterSummary');
  if(fs&&document.querySelector('#pedidos.page.active')&&!document.getElementById('hlgbOrdersHint9233')){
    const hint=document.createElement('div');hint.id='hlgbOrdersHint9233';hint.className='sub';hint.style.margin='5px 0 8px';hint.textContent='A lista fica limitada nesta área. Pedidos adicionais vão para as próximas páginas, sem aumentar o tamanho da tela.';fs.insertAdjacentElement('afterend',hint);
  }
}
const oldRender9233=window.renderOrders;
if(typeof oldRender9233==='function')window.renderOrders=function(){const r=oldRender9233.apply(this,arguments);setTimeout(reinforceOrders9233,0);return r};

function boot9233(){stamp9233();reinforceOrders9233();cleanupOrphanDeletes9233();setTimeout(relabelSecurity9233,0)}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(boot9233,700);setTimeout(cleanupOrphanDeletes9233,2800);[1200,3500,7000,12000].forEach(ms=>setTimeout(stamp9233,ms))},0);
else{setTimeout(boot9233,1200);setTimeout(cleanupOrphanDeletes9233,3500)}
setTimeout(stamp9233,500);
console.log('[HLGB] v92.33 pedidos com altura fixa e reconciliação de pendências antigas');
})();
</script>
<!-- HLGB_V9233_ORDERS_PENDING_CLEANUP_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
out.write_text(s,encoding='utf-8')

Path('abrir.html').write_text('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.33</title><script>(function(){window.location.replace(\'./app9233.html?v=92.33&fresh=\'+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>',encoding='utf-8')
print('app9233.html e abrir.html gerados')
