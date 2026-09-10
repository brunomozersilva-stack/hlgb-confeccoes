from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9193_START -->'
END='<!-- HLGB_V9193_END -->'
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

# A fila v91.44 precisa reconhecer registros de produção antigos que não tinham
# productId individual. O vínculo pode existir pelo cutId e/ou pelo nome do modelo
# dentro do texto do corte.
new_match=r'''function match944(row,item){
  let k=String(item?.productId||item?.key||'');
  if(k&&(String(row?.productId||'')===k||String(row?.cutProductKey||'').split(':').pop()===k))return true;
  let product=prod944(k),model=n944(item?.name||product?.name||'');
  if(model){
    let raw=n944(row?.product||row?.description||row?.model||'');
    if(raw&&raw.includes(model))return true;
  }
  if(row?.cutId!=null){
    let cut=(db.cuts||[]).find(c=>String(c.id)===String(row.cutId));
    if(cut){
      if(k&&String(cut.productId||'')===k)return true;
      let grades=[...(Array.isArray(cut.actualCutGrade)?cut.actualCutGrade:[]),...(Array.isArray(cut.originalGrade)?cut.originalGrade:[])];
      if(k&&grades.some(g=>String(g?.productId||'')===k))return true;
      if(model&&n944(cut.product||'').includes(model))return true;
    }
  }
  return false;
}'''
s=replace_function(s,'match944',new_match)

# Fonte principal da fila: produção real; depois facção; depois toda atribuição
# de capacidade/corte válida. Não excluir mais source=cut_assignment.
new_group=r'''function group944(){let dests=dests944(),map=new Map(dests.map(d=>[d.key,{dest:d,rows:[]}])) ,unassigned=[];active944().forEach(({o,item,qty})=>{let left=qty,key=String(item.productId||item.key||''),prods=(db.production||[]).filter(p=>+p.orderId===+o.id&&q944(p.planned)>q944(p.done)&&match944(p,item)).sort((a,b)=>q944(a.queueRank)-q944(b.queueRank));for(const p of prods){let dk=p.factionId?`F:${p.factionId}`:(p.productionLocationId?`L:${p.productionLocationId}`:''),take=Math.min(left,Math.max(0,q944(p.planned)-q944(p.done)));if(take>0&&map.has(dk)){map.get(dk).rows.push({kind:'production',row:p,o,item,qty:take,value:take*price944(o,item),rank:q944(p.queueRank)||999999});left-=take}if(left<=0)break}if(left>0){let represented=new Set(prods.map(p=>String(p.id))),factions=(db.factions||[]).filter(f=>String(f.orderId)===String(o.id)&&match944(f,item)&&!represented.has(String(f.productionId)));for(const f of factions){let master=(db.factionMasters||[]).find(m=>String(m.id)===String(f.factionId)||n944(m.name)===n944(f.name||f.factionName)),dk=master?`F:${master.id}`:(f.productionLocationId?`L:${f.productionLocationId}`:''),take=Math.min(left,Math.max(0,q944(f.remainingQty!=null?f.remainingQty:q944(f.sent)-q944(f.done))));if(take>0&&map.has(dk)){map.get(dk).rows.push({kind:'faction',row:f,o,item,qty:take,value:take*price944(o,item),rank:q944(f.queueRank)||999999});left-=take}if(left<=0)break}}if(left>0){let plans=(db.capacityAssignments||[]).filter(a=>+a.orderId===+o.id&&String(a.itemKey)===key&&a.active!==false&&q944(a.qty)>q944(a.consumedQty)&&(a.locationId||a.factionId)).sort((a,b)=>q944(a.queueRank)-q944(b.queueRank));for(const a of plans){let dk=a.factionId?`F:${a.factionId}`:(a.locationId?`L:${a.locationId}`:''),take=Math.min(left,Math.max(0,q944(a.qty)-q944(a.consumedQty)));if(take>0&&map.has(dk)){map.get(dk).rows.push({kind:'assignment',row:a,o,item,qty:take,value:take*price944(o,item),rank:q944(a.queueRank)||999999});left-=take}if(left<=0)break}}if(left>0)unassigned.push({o,item,qty:left,value:left*price944(o,item)})});for(const lane of map.values())lane.rows.sort((a,b)=>a.rank-b.rank||String(a.o.date||'').localeCompare(String(b.o.date||''))||String(a.o.id).localeCompare(String(b.o.id)));return {dests,map,unassigned}}'''
s=replace_function(s,'group944',new_group)

block=r'''<!-- HLGB_V9193_START -->
<style id="hlgb-v9193-style">
.hlgb9193-cut-status{display:inline-flex;align-items:center;margin:4px 0 0 7px;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:800;white-space:nowrap;vertical-align:middle}
.hlgb9193-cut-status.ok{background:#e8f7ed;color:#176b35;border:1px solid #bfe5cc}
.hlgb9193-cut-status.pending{background:#eaf2ff;color:#2458a6;border:1px solid #c9dbf8}
.hlgb9193-cut-status.no{background:#f2f2f2;color:#666;border:1px solid #ddd}
</style>
<script id="hlgb-v9193-script">
(function(){
'use strict';
const n9193=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const e9193=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function displayNo9193(o){try{return String(typeof displayOrderNumber==='function'?displayOrderNumber(o):o.id)}catch(_){return String(o?.id||'')}}
function productName9193(item){let p=(db.products||[]).find(x=>String(x.id)===String(item?.productId||item?.key));return item?.name||p?.name||'Produto'}
function cutMatches9193(c,o,item){
  if(!c||!item)return false;if(o&&c.orderId!=null&&String(c.orderId)!==String(o.id))return false;
  let pid=String(item.productId||item.key||''),name=n9193(productName9193(item));
  if(pid&&String(c.productId||'')===pid)return true;
  let grades=[...(Array.isArray(c.actualCutGrade)?c.actualCutGrade:[]),...(Array.isArray(c.originalGrade)?c.originalGrade:[])];
  if(pid&&grades.some(g=>String(g?.productId||'')===pid))return true;
  if(name&&n9193(c.product||'').includes(name))return true;
  return false;
}
function cutStatus9193(o,item){
  let cuts=(db.cuts||[]).filter(c=>String(c.orderId||'')===String(o?.id||'')&&cutMatches9193(c,o,item));
  if(!cuts.length&&item?.productId)cuts=(db.cuts||[]).filter(c=>(c.orderId==null||c.manual||c.isAdHoc)&&cutMatches9193(c,null,item));
  if(cuts.some(c=>['finalizado','finalizada'].includes(n9193(c.status))||c.done===true))return {text:'✅ Cortado',cls:'ok'};
  if(cuts.length)return {text:'✂️ A cortar',cls:'pending'};
  return {text:'⚪ Não cortado',cls:'no'};
}
function itemFor9193(o,model){
  let list=[];try{if(typeof projectionItemsForOrder==='function')list=projectionItemsForOrder(o)||[]}catch(_){}
  if(!list.length){let map=new Map();(o?.grade||[]).forEach(g=>{let id=String(g.productId||'');if(!id)return;let p=(db.products||[]).find(x=>String(x.id)===id),x=map.get(id)||{key:id,productId:g.productId,name:p?.name||'Produto',qty:0};x.qty+=(+g.qty||0);map.set(id,x)});list=[...map.values()]}
  let nm=n9193(model);return list.find(i=>n9193(productName9193(i))===nm)||list.find(i=>nm.includes(n9193(productName9193(i)))||n9193(productName9193(i)).includes(nm))||null;
}
function enhance9193(){
  document.querySelectorAll('#capacity940Root .cap944-row').forEach(row=>{
    if(row.querySelector('.hlgb9193-cut-status'))return;
    let modelEl=row.querySelector('div b');if(!modelEl)return;let model=modelEl.textContent?.trim()||'';
    let m=(row.textContent||'').match(/Pedido\s*#\s*([0-9]+)/i);if(!m)return;
    let o=(db.orders||[]).find(x=>displayNo9193(x)===String(m[1]));if(!o)return;let item=itemFor9193(o,model);if(!item)return;
    let st=cutStatus9193(o,item);modelEl.insertAdjacentHTML('afterend',`<span class="hlgb9193-cut-status ${st.cls}">${e9193(st.text)}</span>`);
  });
  document.querySelectorAll('#capacity940Root .cap944-unassigned-row').forEach(row=>{
    if(row.querySelector('.hlgb9193-cut-status'))return;let bs=row.querySelectorAll('b');if(bs.length<2)return;
    let orderNo=String(bs[0].textContent||'').replace(/[^0-9]/g,''),o=(db.orders||[]).find(x=>displayNo9193(x)===orderNo);if(!o)return;
    let item=itemFor9193(o,bs[1].textContent||'');if(!item)return;let st=cutStatus9193(o,item);bs[1].insertAdjacentHTML('afterend',`<span class="hlgb9193-cut-status ${st.cls}">${e9193(st.text)}</span>`);
  });
}
const prev=window.renderCapacityPlanning;
if(typeof prev==='function')window.renderCapacityPlanning=function(){let r=prev.apply(this,arguments);setTimeout(enhance9193,20);return r};
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(()=>{try{window.renderCapacityPlanning?.()}catch(_){}},500),0)}catch(_){}
console.log('HLGB v91.93: fila por local usa atribuições de corte/produção e mostra status do corte.');
})();
</script>
<!-- HLGB_V9193_END -->'''

# Atualiza identificação visual da versão atual.
s=s.replace('v91.92','v91.93').replace('V91.92','V91.93')
pos=s.rfind('</body>')
if pos<0:raise SystemExit('</body> não encontrado')
s=s[:pos]+block+'\n'+s[pos:]
p.write_text(s,encoding='utf-8')

# Validação de sintaxe de todos os scripts inline sem src.
html=p.read_text(encoding='utf-8')
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
checked=0
for i,m in enumerate(pat.finditer(html)):
    body=m.group(1)
    if not body.strip():continue
    f=Path(tempfile.gettempdir())/f'hlgb9193_{i}.js';f.write_text(body,encoding='utf-8')
    r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
    if r.returncode!=0:
        print(r.stderr);raise SystemExit(f'JavaScript inválido no script {i}')
    checked+=1
if 'String(a.source||\'\')!==\'cut_assignment\'' in new_group:raise SystemExit('cut_assignment ainda excluído')
if 'row?.cutId' not in new_match:raise SystemExit('match legado por cutId ausente')
print('OK v91.93:',checked,'scripts validados')
