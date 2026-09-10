from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9210_START -->'
END='<!-- HLGB_V9210_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

addon=r'''<!-- HLGB_V9210_START -->
<style id="hlgb-v9210-style">
.hlgb9210-missing-btn{margin:4px 4px 0 0!important;white-space:nowrap!important}
</style>
<script id="hlgb-v9210-script">
(function(){
'use strict';
const clone9210=o=>{try{return structuredClone(o)}catch(e){return JSON.parse(JSON.stringify(o))}};
const q9210=v=>Math.max(0,+v||0);
const esc9210=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today9210=()=>typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10);

function appOpen9210(){
  const app=document.getElementById('appShell');
  if(!app)return false;
  try{return getComputedStyle(app).display!=='none'}catch(e){return app.style.display==='block'}
}

async function ensureCloud9210(){
  if(!appOpen9210())throw new Error('O sistema ainda não terminou de abrir.');
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  try{
    if(typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function')await hlgbEnsureRecordsOnlineAfterLogin();
  }catch(e){
    if(typeof hlgbEnsureRecordsOnlineAfterLogin==='function')await hlgbEnsureRecordsOnlineAfterLogin();
  }
  const saver=(typeof window.hlgbRecordSaveWithRetry==='function')?window.hlgbRecordSaveWithRetry:(typeof hlgbRecordSaveWithRetry==='function'?hlgbRecordSaveWithRetry:null);
  if(!saver)throw new Error('A gravação por registro ainda não carregou.');
  return saver;
}

async function saveRow9210(module,row,deleted=false){
  const saver=await ensureCloud9210();
  const out=await saver(module,String(row.id),clone9210(row),!!deleted);
  if(!out||out.applied!==true)throw new Error('A nuvem não confirmou '+module+'.');
  return out.data||row;
}
function upsert9210(module,row){
  db[module]=Array.isArray(db[module])?db[module]:[];
  const i=db[module].findIndex(x=>String(x.id)===String(row.id));
  if(i>=0)db[module][i]=clone9210(row);else db[module].push(clone9210(row));
}
function remove9210(module,id){db[module]=(db[module]||[]).filter(x=>String(x.id)!==String(id))}
function product9210(f){return (db.products||[]).find(p=>String(p.id)===String(f?.productId))||null}
function order9210(f){return (db.orders||[]).find(o=>String(o.id)===String(f?.orderId))||null}
function price9210(o,pid,p){try{return o&&typeof missingProductUnitPrice==='function'?q9210(missingProductUnitPrice(o,pid)):q9210(p?.price)}catch(e){return q9210(p?.price)}}
function cost9210(pid){try{return typeof missingProductUnitCost==='function'?q9210(missingProductUnitCost(pid)):0}catch(e){return 0}}

window.hlgbRegisterFactionMissing9210=function(id){
  const f=(db.factions||[]).find(x=>String(x.id)===String(id));
  if(!f){alert('Este envio não foi encontrado. Atualize a tela e tente novamente.');return}
  const o=order9210(f),p=product9210(f),sent=q9210(f.sent),done=q9210(f.done),def=q9210(f.defects),waste=q9210(f.waste),available=sent>0?Math.max(0,sent-done-def-waste):0,label=p?.name||f.description||'Produto';
  if(sent>0&&available<=0){alert('Este envio não tem peças pendentes para registrar como falta.');return}
  openModal('Registrar peças faltantes — facção',
    '<div class="cards">'+
      '<div class="card"><small>Facção</small><strong style="font-size:18px">'+esc9210(f.name||'-')+'</strong></div>'+
      '<div class="card"><small>Modelo</small><strong style="font-size:18px">'+esc9210(label)+'</strong></div>'+
      '<div class="card"><small>Enviado</small><strong>'+sent.toLocaleString('pt-BR')+'</strong></div>'+
      '<div class="card"><small>Disponível para contabilizar</small><strong>'+available.toLocaleString('pt-BR')+'</strong></div>'+
    '</div>'+
    '<div class="grid">'+
      '<div class="field"><label>Quantidade faltante agora</label><input id="facMissingQty9210" type="number" min="1" step="1" '+(available>0?'max="'+available+'"':'')+'></div>'+
      '<div class="field"><label>Data</label><input id="facMissingDate9210" type="date" value="'+today9210()+'"></div>'+
      '<div class="field"><label>Já faltante/perda</label><input value="'+waste.toLocaleString('pt-BR')+' peça(s)" disabled></div>'+
    '</div>'+
    '<div class="field" style="margin-top:10px"><label>Observação</label><input id="facMissingNote9210" placeholder="Ex.: não voltou da facção / verificar com a costureira"></div>'+
    '<div id="facMissingStatus9210" class="sub" style="margin:10px 0">A falta só será confirmada depois que as duas gravações forem aceitas pela nuvem. Se houver falha, o botão continuará disponível para tentar novamente.</div>'+
    '<button type="button" class="primary modalSave" id="facMissingSave9210">☁️ Registrar falta</button>',
    async()=>{
      const btn=document.getElementById('facMissingSave9210');
      const status=document.getElementById('facMissingStatus9210');
      const qty=Math.floor(q9210(document.getElementById('facMissingQty9210')?.value));
      if(qty<=0){alert('Informe a quantidade faltante.');return false}
      if(sent>0&&qty>available){alert('A quantidade faltante não pode ultrapassar '+available.toLocaleString('pt-BR')+' peça(s).');return false}
      const date=document.getElementById('facMissingDate9210')?.value||today9210(),note=(document.getElementById('facMissingNote9210')?.value||'').trim();
      const key='faction:'+f.id+':Peça faltante',oldM=(db.missingPieces||[]).find(m=>String(m.sourceKey||'')===key)||null;
      const nextF=clone9210(f);nextF.waste=waste+qty;nextF.lastMissingRegisteredAt=date;nextF.updatedAt=new Date().toISOString();
      const recovered=q9210(oldM?.recoveredQty);
      const nextM=oldM?clone9210(oldM):{id:Date.now()+Math.floor(Math.random()*1000000),sourceKey:key,sourceType:'Facção',factionId:f.id,issueType:'Peça faltante',orderId:o?.id||f.orderId||'',client:o?.client||f.client||'',clientId:o?.clientId||null,productId:f.productId||null,product:label,color:'',size:'',recoveredQty:0,date,deliveryDate:o?.date||f.deliveryDate||f.dueDate||'',unitPrice:price9210(o,f.productId,p),unitCost:cost9210(f.productId),note:'Registrado em Envios para facção — '+String(f.name||''),status:'Em aberto',history:[],issueHistory:[]};
      nextM.sourceType='Facção';nextM.factionId=f.id;nextM.orderId=o?.id||f.orderId||nextM.orderId||'';nextM.client=o?.client||f.client||nextM.client||'';nextM.clientId=o?.clientId||nextM.clientId||null;nextM.productId=f.productId||nextM.productId||null;nextM.product=label;nextM.originalQty=nextF.waste;nextM.remainingQty=Math.max(0,nextF.waste-recovered);nextM.date=date;nextM.deliveryDate=o?.date||f.deliveryDate||f.dueDate||nextM.deliveryDate||'';nextM.unitPrice=price9210(o,f.productId,p)||q9210(nextM.unitPrice);nextM.unitCost=cost9210(f.productId)||q9210(nextM.unitCost);nextM.status=nextM.remainingQty<=0?'Resolvido':(recovered>0?'Parcial':'Em aberto');nextM.note=note?('Facção '+String(f.name||'')+' — '+note):(nextM.note||('Registrado em Envios para facção — '+String(f.name||'')));nextM.issueHistory=Array.isArray(nextM.issueHistory)?nextM.issueHistory:[];nextM.issueHistory.push({date,qty,note:note||'Peça faltante registrada pela tela Envios para facção',source:'faction_manual_v9210'});nextM.updatedAt=new Date().toISOString();
      if(btn){btn.disabled=true;btn.style.display='';btn.textContent='☁️ Confirmando na nuvem…'}
      if(status)status.textContent='Confirmando a ocorrência e depois atualizando o envio da facção…';
      let savedMissing=null;
      try{
        // Primeiro grava a ocorrência. Assim o envio não muda de saldo e o botão não some antes de a operação estar completa.
        savedMissing=await saveRow9210('missingPieces',nextM,false);
        const savedFaction=await saveRow9210('factions',nextF,false);
        upsert9210('missingPieces',savedMissing);upsert9210('factions',savedFaction);
        try{localSaveOnly()}catch(e){}
        try{if(typeof setCloudStatus==='function')setCloudStatus('⚡ Online · falta confirmada','ok')}catch(e){}
        closeModal();
        try{renderFactions()}catch(e){}try{if(typeof renderFactionDelivery935==='function')renderFactionDelivery935()}catch(e){}try{renderMissingPieces()}catch(e){}
        setTimeout(ensureButtons9210,30);
        alert(qty.toLocaleString('pt-BR')+' peça(s) faltante(s) registrada(s) e confirmada(s) na nuvem.');
        return true;
      }catch(err){
        console.error('HLGB v92.10 falta facção',err);
        // Se a primeira etapa passou e a segunda falhou, desfaz a ocorrência para não deixar meia operação.
        if(savedMissing){
          try{
            if(oldM)await saveRow9210('missingPieces',oldM,false);
            else await saveRow9210('missingPieces',nextM,true);
          }catch(rb){console.error('HLGB v92.10 rollback missingPieces',rb)}
        }
        if(btn){btn.disabled=false;btn.style.display='';btn.textContent='☁️ Registrar falta'}
        if(status)status.innerHTML='<b>Não foi gravado.</b> O formulário continua aberto para você tentar novamente.';
        setTimeout(ensureButtons9210,20);
        alert('A falta não foi gravada. O botão foi mantido para você tentar novamente. '+String(err?.message||err));
        return false;
      }
    }
  );
};
window.hlgbRegisterFactionMissing9197=window.hlgbRegisterFactionMissing9210;
window.hlgbRegisterFactionMissing9198=window.hlgbRegisterFactionMissing9210;

function addBtn9210(cell,id){
  if(!cell||cell.querySelector('.hlgb9210-missing-btn,.hlgb9197-faction-missing'))return;
  const b=document.createElement('button');b.type='button';b.className='secondary hlgb9210-missing-btn';b.textContent='⚠️ Registrar falta';b.onclick=()=>window.hlgbRegisterFactionMissing9210(id);cell.insertBefore(b,cell.firstChild);cell.insertBefore(document.createTextNode(' '),b.nextSibling);
}
function ensureButtons9210(){
  const main=document.getElementById('factionTable');
  if(main)main.querySelectorAll('tbody tr').forEach(tr=>{let edit=[...tr.querySelectorAll('button')].find(b=>/editFaction\((['"]?)(\d+)\1\)/.test(String(b.getAttribute('onclick')||'')));if(!edit)return;let m=String(edit.getAttribute('onclick')||'').match(/editFaction\((['"]?)(\d+)\1\)/);if(m)addBtn9210(tr.lastElementChild,m[2])});
  const delivery=document.getElementById('factionDeliveryTable935');
  if(delivery)delivery.querySelectorAll('tbody tr').forEach(tr=>{let any=[...tr.querySelectorAll('button')].find(b=>/registerFactionDelivery935\((\d+)\)/.test(String(b.getAttribute('onclick')||'')));if(!any)return;let m=String(any.getAttribute('onclick')||'').match(/registerFactionDelivery935\((\d+)\)/);if(m)addBtn9210(tr.lastElementChild,m[1])});
}
window.hlgbEnsureFactionMissingButtons9210=ensureButtons9210;

const oldRF9210=window.renderFactions;
if(typeof oldRF9210==='function')window.renderFactions=function(){const r=oldRF9210.apply(this,arguments);setTimeout(ensureButtons9210,0);return r};
const oldRFD9210=window.renderFactionDelivery935;
if(typeof oldRFD9210==='function')window.renderFactionDelivery935=function(){const r=oldRFD9210.apply(this,arguments);setTimeout(ensureButtons9210,0);return r};
const oldIncoming9210=window.hlgbRenderIncomingRecord;
if(typeof oldIncoming9210==='function')window.hlgbRenderIncomingRecord=function(module){const r=oldIncoming9210.apply(this,arguments);if(module==='factions'||module==='missingPieces')setTimeout(ensureButtons9210,20);return r};

function version9210(){try{const v=document.querySelector('#appShell .logo small');if(v)v.textContent='v92.10';document.title='HLGB Confecções — Sistema de Gestão v92.10 Multiusuário'}catch(e){}}
function boot9210(){version9210();ensureButtons9210();setTimeout(ensureButtons9210,600)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot9210,60),{once:true});else setTimeout(boot9210,60);
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>{setTimeout(boot9210,80);setTimeout(boot9210,1000);setTimeout(boot9210,2800)},0)}catch(e){}
console.log('[HLGB] v92.10 correção de falta em facções carregada');
})();
</script>
<!-- HLGB_V9210_END -->'''

s=s.replace('</body>',addon+'\n</body>')
s=s.replace('Sistema de Gestão v92.09 Multiusuário','Sistema de Gestão v92.10 Multiusuário')
p.write_text(s,encoding='utf-8')

# Atualiza também o atalho anti-cache, se existir.
a=Path('abrir.html')
if a.exists():
    t=a.read_text(encoding='utf-8').replace('v92.09','v92.10').replace('92.09','92.10')
    a.write_text(t,encoding='utf-8')
print('v92.10 aplicada: registro de falta em facção sem falso bloqueio de nuvem')
