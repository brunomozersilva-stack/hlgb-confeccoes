from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9194_START -->'
END='<!-- HLGB_V9194_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

def matching_end(src, brace):
    depth=0; quote=None; esc=False; i=brace
    while i<len(src):
        ch=src[i]
        if quote:
            if esc: esc=False
            elif ch=='\\': esc=True
            elif ch==quote: quote=None
        else:
            if ch in ('"',"'",'`'): quote=ch
            elif ch=='{': depth+=1
            elif ch=='}':
                depth-=1
                if depth==0:return i+1
        i+=1
    raise SystemExit('Bloco sem fechamento')

def replace_function(src,name,new_text):
    m=re.search(r'(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(',src)
    if not m: raise SystemExit('Função não encontrada: '+name)
    brace=src.find('{',m.end()); end=matching_end(src,brace)
    return src[:m.start()]+new_text+src[end:]

# IMPORTANTE: se a linha já possui identidade explícita de produto, ela jamais pode
# "herdar" outro produto apenas porque pertence ao mesmo cutId. O fallback por nome
# só vale para registros realmente legados sem productId/cutProductKey.
new_match=r'''function match944(row,item){
  let k=String(item?.productId||item?.key||'');
  let explicitProduct=String(row?.productId||'');
  let explicitCutKey=String(row?.cutProductKey||'').split(':').pop();
  if(explicitProduct||explicitCutKey){
    return !!k&&(explicitProduct===k||explicitCutKey===k);
  }
  let product=prod944(k),model=n944(item?.name||product?.name||'');
  if(model){
    let raw=n944(row?.product||row?.description||row?.model||'');
    if(raw)return raw.includes(model);
  }
  if(row?.cutId!=null){
    let cut=(db.cuts||[]).find(c=>String(c.id)===String(row.cutId));
    if(cut){
      if(k&&String(cut.productId||'')===k)return true;
      let grades=[...(Array.isArray(cut.actualCutGrade)?cut.actualCutGrade:[]),...(Array.isArray(cut.originalGrade)?cut.originalGrade:[])];
      let ids=[...new Set(grades.map(g=>String(g?.productId||'')).filter(Boolean))];
      if(k&&ids.length===1&&ids[0]===k)return true;
      if(model&&ids.length<=1&&n944(cut.product||'').includes(model))return true;
    }
  }
  return false;
}'''
s=replace_function(s,'match944',new_match)

block=r'''<!-- HLGB_V9194_START -->
<style id="hlgb-v9194-style">
.hlgb9194-transfer-btn{padding:5px 8px!important;font-size:11px!important;white-space:nowrap}
#hlgbTransfer9194Overlay{position:fixed;inset:0;background:rgba(30,20,26,.42);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px}
#hlgbTransfer9194Card{background:#fff;border-radius:16px;box-shadow:0 20px 55px rgba(0,0,0,.24);width:min(520px,96vw);padding:20px;border:1px solid #eadde4}
#hlgbTransfer9194Card h3{margin:0 0 5px;font-size:20px}
#hlgbTransfer9194Card .hlgb9194-meta{font-size:13px;color:#786b73;margin-bottom:15px;line-height:1.45}
#hlgbTransfer9194Card select{width:100%;padding:11px;border:1px solid #d9cbd2;border-radius:10px;background:#fff;font-size:14px}
#hlgbTransfer9194Card .hlgb9194-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px}
#hlgbTransfer9194Card .hlgb9194-warning{margin-top:11px;padding:9px 10px;border-radius:9px;background:#fff5df;color:#805d12;font-size:12px;line-height:1.4}
</style>
<script id="hlgb-v9194-script">
(function(){
'use strict';
const n=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const clone=v=>{try{return structuredClone(v)}catch(_){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}};
const escx=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const now=()=>new Date().toISOString();
function displayNo(o){try{return String(typeof displayOrderNumber==='function'?displayOrderNumber(o):o.id)}catch(_){return String(o?.id||'')}}
function prodName(item){let p=(db.products||[]).find(x=>String(x.id)===String(item?.productId||item?.key));return item?.name||p?.name||'Produto'}
function orderItems(o){
  let list=[];try{if(typeof projectionItemsForOrder==='function')list=projectionItemsForOrder(o)||[]}catch(_){}
  if(list.length)return list;
  let m=new Map();(o?.grade||[]).forEach(g=>{let id=String(g.productId||'');if(!id)return;let p=(db.products||[]).find(x=>String(x.id)===id),x=m.get(id)||{key:id,productId:g.productId,name:p?.name||'Produto',qty:0};x.qty+=(+g.qty||0);m.set(id,x)});return [...m.values()]
}
function itemFor(o,model){let nm=n(model),list=orderItems(o);return list.find(i=>n(prodName(i))===nm)||list.find(i=>n(prodName(i)).includes(nm)||nm.includes(n(prodName(i))))||null}
function exactRow(row,o,item){
  if(!row||!item)return false;if(row.orderId!=null&&String(row.orderId)!==String(o.id))return false;
  let pid=String(item.productId||item.key||''),ep=String(row.productId||''),ck=String(row.cutProductKey||'').split(':').pop();
  if(ep||ck)return !!pid&&(ep===pid||ck===pid);
  let raw=n(row.product||row.description||row.model||''),model=n(prodName(item));return !!raw&&!!model&&raw.includes(model)
}
function dests(){
  let out=[];(db.productionLocations||[]).filter(x=>x.active!==false&&n(x.name)!=='externo').forEach(x=>out.push({key:`L:${x.id}`,type:'local',id:x.id,name:x.name||'Confecção'}));
  (db.factionMasters||[]).filter(x=>x.active!==false).forEach(x=>out.push({key:`F:${x.id}`,type:'faction',id:x.id,name:x.name||'Facção',productionLocationId:x.productionLocationId||null}));
  return out.sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name,'pt-BR'))
}
function sources(o,item){
  let productions=(db.production||[]).filter(r=>exactRow(r,o,item));
  let factions=(db.factions||[]).filter(r=>exactRow(r,o,item));
  let pid=String(item.productId||item.key||'');
  let assignments=(db.capacityAssignments||[]).filter(a=>String(a.orderId)===String(o.id)&&String(a.itemKey)===pid&&a.active!==false);
  return {productions,factions,assignments}
}
function currentDest(src){
  let r=src.productions.find(x=>x.factionId||x.productionLocationId)||src.factions.find(x=>x.factionId||x.productionLocationId)||src.assignments.find(x=>x.factionId||x.locationId);
  if(!r)return '';
  return r.factionId?`F:${r.factionId}`:`L:${r.productionLocationId||r.locationId}`
}
async function ready(){
  if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
  if(typeof hlgbRecordReady!=='undefined'&&!hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function')await hlgbEnsureRecordsOnlineAfterLogin();
  if(typeof hlgbRecordSaveWithRetry!=='function'||typeof cloudAccessToken==='undefined'||!cloudAccessToken)throw new Error('A nuvem ainda não está pronta para confirmar a troca.')
}
async function saveOne(module,before,next){
  let out=await hlgbRecordSaveWithRetry(module,String(next.id),clone(next),false);
  if(!out?.applied)throw new Error('A nuvem não confirmou '+module+' #'+next.id);
  let arr=db[module]||[],i=arr.findIndex(x=>String(x.id)===String(next.id));if(i>=0)arr[i]=clone(out.data||next);else arr.push(clone(out.data||next));
  return out.data||next
}
async function persist(changes){
  await ready();let done=[];
  try{for(const c of changes){await saveOne(c.module,c.before,c.next);done.push(c)}}catch(err){
    for(const c of done.reverse()){try{await hlgbRecordSaveWithRetry(c.module,String(c.before.id),clone(c.before),false);let arr=db[c.module]||[],i=arr.findIndex(x=>String(x.id)===String(c.before.id));if(i>=0)arr[i]=clone(c.before)}catch(_){} }
    throw err
  }
  try{localSaveOnly()}catch(_){}
}
let transferCtx=null;
window.hlgbCloseTransfer9194=function(){document.getElementById('hlgbTransfer9194Overlay')?.remove();transferCtx=null};
window.hlgbOpenTransfer9194=function(orderNo,model){
  let o=(db.orders||[]).find(x=>displayNo(x)===String(orderNo));if(!o)return alert('Pedido não encontrado.');let item=itemFor(o,model);if(!item)return alert('Modelo não encontrado no pedido.');
  let src=sources(o,item),all=dests(),cur=currentDest(src),curName=all.find(d=>d.key===cur)?.name||'Sem destino';
  transferCtx={o,item,src,cur};
  let opts=all.map(d=>`<option value="${d.key}" ${d.key===cur?'selected':''}>${d.type==='faction'?'Facção':'Confecção'} — ${escx(d.name)}</option>`).join('');
  let hasProgress=src.factions.some(f=>(+f.done||0)>0||(+f.returned||0)>0)||src.productions.some(p=>(+p.done||0)>0);
  let warn=hasProgress?'<div class="hlgb9194-warning"><b>Atenção:</b> este modelo já possui peças produzidas/recebidas. Para proteger o histórico, o sistema não permitirá trocar o destino enquanto houver produção registrada.</div>':'<div class="hlgb9194-warning">A troca atualiza a atribuição do modelo e os registros ligados a ela. O pedido e a grade não são alterados.</div>';
  document.getElementById('hlgbTransfer9194Overlay')?.remove();document.body.insertAdjacentHTML('beforeend',`<div id="hlgbTransfer9194Overlay" onclick="if(event.target===this)hlgbCloseTransfer9194()"><div id="hlgbTransfer9194Card"><h3>Trocar destino</h3><div class="hlgb9194-meta"><b>${escx(prodName(item))}</b> · Pedido #${escx(displayNo(o))}<br>Destino atual: <b>${escx(curName)}</b></div><label style="display:block;font-size:12px;font-weight:700;margin-bottom:6px">Novo destino</label><select id="hlgbTransfer9194Select">${opts}</select>${warn}<div class="hlgb9194-actions"><button class="secondary" onclick="hlgbCloseTransfer9194()">Cancelar</button><button class="primary" ${hasProgress?'disabled title="Há produção registrada"':''} onclick="hlgbConfirmTransfer9194()">Confirmar troca</button></div></div></div>`)
};
window.hlgbConfirmTransfer9194=async function(){
  let ctx=transferCtx;if(!ctx)return;let key=document.getElementById('hlgbTransfer9194Select')?.value||'',target=dests().find(d=>d.key===key);if(!target)return alert('Escolha o novo destino.');if(key===ctx.cur){hlgbCloseTransfer9194();return}
  if(ctx.src.factions.some(f=>(+f.done||0)>0||(+f.returned||0)>0)||ctx.src.productions.some(p=>(+p.done||0)>0))return alert('Este modelo já possui produção recebida. A troca foi bloqueada para não alterar o histórico.');
  let changes=[],stamp=now(),hist=(before,to)=>[...(Array.isArray(before.transferHistory)?before.transferHistory:[]),{at:stamp,fromFactionId:before.factionId||null,fromLocationId:before.productionLocationId||before.locationId||null,to:to.key}];
  for(const before0 of ctx.src.productions){let before=clone(before0),next={...clone(before0),updatedAt:stamp,transferHistory:hist(before0,target)};if(target.type==='faction'){next.factionId=target.id;next.productionLocationId=target.productionLocationId||next.productionLocationId||null}else{next.factionId=null;next.productionLocationId=target.id}changes.push({module:'production',before,next})}
  for(const before0 of ctx.src.factions){let before=clone(before0),next={...clone(before0),updatedAt:stamp,transferHistory:hist(before0,target)};if(target.type==='faction'){next.factionId=target.id;next.name=target.name;next.factionName=target.name;next.productionLocationId=target.productionLocationId||next.productionLocationId||null}else{next.factionId=null;next.productionLocationId=target.id;next.status='Transferido para produção interna';next.sent=0;next.name=target.name;next.factionName=''}changes.push({module:'factions',before,next})}
  for(const before0 of ctx.src.assignments){let before=clone(before0),next={...clone(before0),updatedAt:stamp,transferHistory:hist(before0,target)};if(target.type==='faction'){next.factionId=target.id;next.locationId=null}else{next.factionId=null;next.locationId=target.id}changes.push({module:'capacityAssignments',before,next})}
  if(!changes.length)return alert('Não encontrei uma atribuição salva para trocar.');
  let btn=document.querySelector('#hlgbTransfer9194Card .primary');if(btn){btn.disabled=true;btn.textContent='Salvando...'}
  try{await persist(changes);hlgbCloseTransfer9194();try{window.renderCapacityPlanning?.()}catch(_){}setTimeout(()=>{try{window.renderCapacityPlanning?.()}catch(_){}},350)}catch(e){if(btn){btn.disabled=false;btn.textContent='Confirmar troca'}alert('Não consegui confirmar a troca na nuvem: '+(e?.message||e))}
};
function enhance(){
  document.querySelectorAll('#capacity940Root .cap944-row').forEach(row=>{
    let actions=row.querySelector('.cap944-actions');if(!actions||actions.querySelector('.hlgb9194-transfer-btn'))return;
    let modelEl=row.querySelector('div b'),m=(row.textContent||'').match(/Pedido\s*#\s*([0-9]+)/i);if(!modelEl||!m)return;
    let model=modelEl.textContent?.trim()||'',orderNo=m[1],b=document.createElement('button');b.className='secondary hlgb9194-transfer-btn';b.textContent='Trocar destino';b.title='Mover este modelo para outra facção ou confecção';b.onclick=()=>window.hlgbOpenTransfer9194(orderNo,model);actions.appendChild(b)
  })
}
const prev=window.renderCapacityPlanning;
if(typeof prev==='function')window.renderCapacityPlanning=function(){let r=prev.apply(this,arguments);setTimeout(enhance,35);return r};
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(()=>{try{window.renderCapacityPlanning?.()}catch(_){}},550),0)}catch(_){}
console.log('HLGB v91.94: identidade exata por produto e troca segura de destino.');
})();
</script>
<!-- HLGB_V9194_END -->'''

s=s.replace('v91.93 Multiusuário','v91.94 Multiusuário').replace('>v91.93<','>v91.94<')
pos=s.rfind('</body>')
if pos<0:raise SystemExit('</body> não encontrado')
s=s[:pos]+block+'\n'+s[pos:]
p.write_text(s,encoding='utf-8')

html=p.read_text(encoding='utf-8')
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
checked=0
for i,m in enumerate(pat.finditer(html)):
    body=m.group(1)
    if not body.strip():continue
    f=Path(tempfile.gettempdir())/f'hlgb9194_{i}.js';f.write_text(body,encoding='utf-8')
    r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
    if r.returncode!=0:
        print(r.stderr);raise SystemExit(f'JavaScript inválido no script {i}')
    checked+=1
if "if(explicitProduct||explicitCutKey)" not in new_match:raise SystemExit('Guarda de identidade explícita ausente')
print('OK v91.94:',checked,'scripts validados')