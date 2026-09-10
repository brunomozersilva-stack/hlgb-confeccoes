from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9197_START -->'
END='<!-- HLGB_V9197_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

# Versão visível.
s=s.replace('Sistema de Gestão v91.96 Multiusuário','Sistema de Gestão v91.97 Multiusuário')
s=s.replace('>v91.96</small>','>v91.97</small>')

addon=r'''<!-- HLGB_V9197_START -->
<style id="hlgb-v9197-style">
.hlgb9197-faction-missing{margin:4px 3px 0 0!important;white-space:nowrap}
.hlgb9197-color-note{width:100%;margin-bottom:7px;padding:7px 9px;border-radius:8px;background:#fff8e8;border:1px solid #ead39a;color:#72550e;font-size:12px}
</style>
<script id="hlgb-v9197-script">
(function(){
'use strict';
const clone9197=o=>{try{return structuredClone(o)}catch(e){return JSON.parse(JSON.stringify(o))}};
const q9197=v=>Math.max(0,+v||0);
const uniq9197=a=>[...new Set((a||[]).map(x=>String(x||'').trim()).filter(Boolean))];
const esc9197=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function setVersion9197(){
  try{const x=document.querySelector('#appShell .logo small');if(x)x.textContent='v91.97'}catch(e){}
  try{document.title='HLGB Confecções — Sistema de Gestão v91.97 Multiusuário'}catch(e){}
}

// 1) Edição de pedido: nunca bloquear a inclusão apenas porque a cópia local do produto veio sem cores.
function productColors9197(p){
  let specific=[];
  try{specific=typeof productAllowedColors==='function'?productAllowedColors(p):[]}catch(e){}
  specific=uniq9197(specific);
  if(specific.length)return {colors:specific,fallback:false};
  let global=uniq9197(db.colors||[]);
  if(!global.length&&String(p?.color||'').trim())global=[String(p.color).trim()];
  return {colors:global,fallback:true};
}
window.orderColorSelectorHTML=function(productId,selected=[]){
  const p=(db.products||[]).find(x=>String(x.id)===String(productId));
  const r=productColors9197(p),chosen=uniq9197(selected);
  if(!r.colors.length){
    return '<div class="hlgb9197-color-note">Este produto ainda não tem cores disponíveis nesta máquina. Atualize o cadastro de cores do produto; o pedido existente continua preservado.</div>';
  }
  const note=r.fallback?'<div class="hlgb9197-color-note">As cores específicas do produto não chegaram nesta máquina. Para não bloquear a alteração do pedido, estou usando o cadastro geral de cores.</div>':'';
  return note+r.colors.map(c=>'<label style="display:flex;align-items:center;gap:7px;border:1px solid #eadde4;border-radius:9px;padding:7px 9px;background:#fff"><input type="checkbox" class="orderColorOpt" value="'+esc9197(c)+'" '+(chosen.includes(c)?'checked':'')+' onchange="refreshOrderSelectedColorRows(this)"><span>'+esc9197(c)+'</span></label>').join('');
};

// 2) Registro direto de peças faltantes a partir de Envios para facção.
async function saveRow9197(module,row){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof window.hlgbRecordReady!=='undefined'&&!window.hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function')await hlgbEnsureRecordsOnlineAfterLogin();
  if(typeof window.hlgbRecordSaveWithRetry!=='function'||!window.cloudAccessToken)throw new Error('A conexão com a nuvem ainda não está pronta.');
  const out=await window.hlgbRecordSaveWithRetry(module,String(row.id),clone9197(row),false);
  if(!out||out.applied!==true)throw new Error('A nuvem não confirmou '+module+'.');
  return out.data||row;
}
function upsertLocal9197(module,row){
  db[module]=Array.isArray(db[module])?db[module]:[];
  const i=db[module].findIndex(x=>String(x.id)===String(row.id));
  if(i>=0)db[module][i]=clone9197(row);else db[module].push(clone9197(row));
}
function factionProduct9197(f){return (db.products||[]).find(p=>String(p.id)===String(f?.productId))||null}
function factionOrder9197(f){return (db.orders||[]).find(o=>String(o.id)===String(f?.orderId))||null}
function missingPrice9197(o,pid,p){try{return o&&typeof missingProductUnitPrice==='function'?q9197(missingProductUnitPrice(o,pid)):q9197(p?.price)}catch(e){return q9197(p?.price)}}
function missingCost9197(pid){try{return typeof missingProductUnitCost==='function'?q9197(missingProductUnitCost(pid)):0}catch(e){return 0}}

window.hlgbRegisterFactionMissing9197=function(id){
  const f=(db.factions||[]).find(x=>String(x.id)===String(id));if(!f)return;
  const o=factionOrder9197(f),p=factionProduct9197(f),sent=q9197(f.sent),done=q9197(f.done),def=q9197(f.defects),waste=q9197(f.waste);
  const available=sent>0?Math.max(0,sent-done-def-waste):0;
  const label=p?.name||f.description||'Produto';
  openModal('Registrar peças faltantes — facção',
    '<div class="cards">'+
      '<div class="card"><small>Facção</small><strong style="font-size:18px">'+esc9197(f.name||'-')+'</strong></div>'+
      '<div class="card"><small>Modelo</small><strong style="font-size:18px">'+esc9197(label)+'</strong></div>'+
      '<div class="card"><small>Enviado</small><strong>'+sent.toLocaleString('pt-BR')+'</strong></div>'+
      '<div class="card"><small>Já faltante/perda</small><strong>'+waste.toLocaleString('pt-BR')+'</strong></div>'+
    '</div>'+
    '<div class="grid">'+
      '<div class="field"><label>Quantidade faltante agora</label><input id="facMissingQty9197" type="number" min="1" step="1" '+(available>0?'max="'+available+'"':'')+' value="'+(available===1?1:'')+'"></div>'+
      '<div class="field"><label>Data</label><input id="facMissingDate9197" type="date" value="'+(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10))+'"></div>'+
      '<div class="field"><label>Ainda não contabilizado</label><input value="'+available+' peça(s)" disabled></div>'+
    '</div>'+
    '<div class="field" style="margin-top:10px"><label>Observação</label><input id="facMissingNote9197" placeholder="Ex.: não voltou da facção / verificar com a costureira"></div>'+
    '<div class="sub" style="margin:10px 0">A quantidade será somada em “Faltantes/Perdas” deste envio e também aparecerá em “Peças faltantes”. Não conta como peça produzida nem como entrega ao cliente.</div>'+
    '<button type="button" class="primary modalSave">☁️ Registrar falta</button>',
    async()=>{
      const qty=Math.floor(q9197(document.getElementById('facMissingQty9197')?.value));
      if(qty<=0){alert('Informe a quantidade faltante.');return false}
      if(sent>0&&qty>available){alert('A quantidade faltante não pode ultrapassar as peças ainda não contabilizadas deste envio ('+available+').');return false}
      const date=document.getElementById('facMissingDate9197')?.value||(typeof isoDate==='function'?isoDate(new Date()):new Date().toISOString().slice(0,10));
      const note=(document.getElementById('facMissingNote9197')?.value||'').trim();
      const key='faction:'+f.id+':Peça faltante';
      const oldM=(db.missingPieces||[]).find(m=>String(m.sourceKey||'')===key)||null;
      const nextF=clone9197(f);nextF.waste=waste+qty;nextF.lastMissingRegisteredAt=date;
      const recovered=q9197(oldM?.recoveredQty);
      const nextM=oldM?clone9197(oldM):{
        id:Date.now()+Math.floor(Math.random()*1000000),sourceKey:key,sourceType:'Facção',factionId:f.id,
        issueType:'Peça faltante',orderId:o?.id||f.orderId||'',client:o?.client||f.client||'',clientId:o?.clientId||null,
        productId:f.productId||null,product:label,color:'',size:'',recoveredQty:0,
        date,deliveryDate:o?.date||f.deliveryDate||f.dueDate||'',unitPrice:missingPrice9197(o,f.productId,p),unitCost:missingCost9197(f.productId),
        note:'Registrado em Envios para facção — '+String(f.name||''),status:'Em aberto',history:[],issueHistory:[]
      };
      nextM.sourceType='Facção';nextM.factionId=f.id;nextM.orderId=o?.id||f.orderId||nextM.orderId||'';nextM.client=o?.client||f.client||nextM.client||'';nextM.clientId=o?.clientId||nextM.clientId||null;
      nextM.productId=f.productId||nextM.productId||null;nextM.product=label;nextM.originalQty=nextF.waste;nextM.remainingQty=Math.max(0,nextF.waste-recovered);nextM.date=date;nextM.deliveryDate=o?.date||f.deliveryDate||f.dueDate||nextM.deliveryDate||'';
      nextM.unitPrice=missingPrice9197(o,f.productId,p)||q9197(nextM.unitPrice);nextM.unitCost=missingCost9197(f.productId)||q9197(nextM.unitCost);nextM.status=nextM.remainingQty<=0?'Resolvido':(recovered>0?'Parcial':'Em aberto');
      nextM.note=note?('Facção '+String(f.name||'')+' — '+note):(nextM.note||('Registrado em Envios para facção — '+String(f.name||'')));
      nextM.issueHistory=Array.isArray(nextM.issueHistory)?nextM.issueHistory:[];nextM.issueHistory.push({date,qty,note:note||'Peça faltante registrada pela tela Envios para facção',source:'faction_manual_v9197'});
      const btn=document.querySelector('#modal .modalSave');if(btn){btn.disabled=true;btn.textContent='☁️ Salvando…'}
      let factionSaved=false;
      try{
        const sf=await saveRow9197('factions',nextF);factionSaved=true;
        const sm=await saveRow9197('missingPieces',nextM);
        upsertLocal9197('factions',sf);upsertLocal9197('missingPieces',sm);
        try{localSaveOnly()}catch(e){}
        closeModal();try{renderFactions()}catch(e){}try{renderMissingPieces()}catch(e){}
        alert(qty.toLocaleString('pt-BR')+' peça(s) faltante(s) registrada(s) e confirmada(s) na nuvem.');
        return true;
      }catch(e){
        console.error('HLGB v91.97 falta facção',e);
        if(factionSaved){try{await saveRow9197('factions',f)}catch(rb){console.error('HLGB v91.97 rollback facção',rb)}}
        if(btn){btn.disabled=false;btn.textContent='☁️ Registrar falta'}
        alert('A falta não foi registrada porque a nuvem não confirmou todas as etapas. Nenhuma baixa deve ser considerada concluída. '+String(e?.message||e));
        return false;
      }
    }
  );
};

function enhanceFactionMissing9197(){
  const box=document.getElementById('factionTable');if(!box)return;
  box.querySelectorAll('tbody tr').forEach(tr=>{
    if(tr.querySelector('.hlgb9197-faction-missing'))return;
    const edit=[...tr.querySelectorAll('button')].find(b=>/editFaction\(\d+\)/.test(String(b.getAttribute('onclick')||'')));
    if(!edit)return;
    const m=String(edit.getAttribute('onclick')||'').match(/editFaction\((\d+)\)/);if(!m)return;
    const cell=tr.lastElementChild;if(!cell)return;
    const b=document.createElement('button');b.type='button';b.className='secondary hlgb9197-faction-missing';b.textContent='⚠️ Registrar falta';b.onclick=()=>window.hlgbRegisterFactionMissing9197(m[1]);
    cell.insertBefore(b,cell.firstChild);cell.insertBefore(document.createTextNode(' '),b.nextSibling);
  });
}
const oldRenderFactions9197=window.renderFactions;
if(typeof oldRenderFactions9197==='function')window.renderFactions=function(){const r=oldRenderFactions9197.apply(this,arguments);setTimeout(enhanceFactionMissing9197,0);return r};

function boot9197(){setVersion9197();try{enhanceFactionMissing9197()}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot9197,{once:true});else boot9197();
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(boot9197,250),0)}catch(e){}
console.log('HLGB v91.97: edição de pedido com fallback de cores + registro direto de faltas em Envios para facção.');
})();
</script>
<!-- HLGB_V9197_END -->'''

if '</body>' not in s:
    raise SystemExit('Fechamento </body> não encontrado')
s=s.replace('</body>',addon+'\n</body>',1)

# Guardas estruturais.
for marker in ['HLGB_V9197_START','hlgbRegisterFactionMissing9197','orderColorSelectorHTML','Registrar falta','function doLogin()','HLGB_SUPABASE_URL','</html>']:
    if marker not in s: raise SystemExit('Marcador obrigatório ausente: '+marker)
if len(s)<1_000_000: raise SystemExit('index.html ficou pequeno demais')

# Valida todos os blocos JS inline.
scripts=re.findall(r'<script[^>]*>(.*?)</script>',s,flags=re.S|re.I)
with tempfile.TemporaryDirectory() as td:
    for i,js in enumerate(scripts):
        fp=Path(td)/f's{i}.js';fp.write_text(js,encoding='utf-8')
        r=subprocess.run(['node','--check',str(fp)],capture_output=True,text=True)
        if r.returncode:
            raise SystemExit(f'JS inválido no bloco {i}: {r.stderr}')

p.write_text(s,encoding='utf-8')
print('HLGB v91.97 aplicado:',len(s),'bytes')
