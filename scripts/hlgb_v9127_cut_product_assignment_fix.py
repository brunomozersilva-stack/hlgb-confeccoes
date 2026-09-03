from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

if 'v91.27 Multiusuário' in s:
    print('v91.27 already applied')
    raise SystemExit(0)

if 'v91.26 Multiusuário' not in s:
    raise SystemExit('expected v91.26 base not found')

addon=r'''
<!-- HLGB v91.27 CORTE POR MODELO + FACCAO -->
<script>
(function(){
  const n927=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const clone927=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
  let saving927=false;

  function product927(id){return (db.products||[]).find(x=>+x.id===+id)||null}
  function order927(id){return (db.orders||[]).find(x=>+x.id===+id)||null}
  function groups927(o){
    let map=new Map(),seq=0;
    (Array.isArray(o?.grade)?o.grade:[]).forEach(g=>{
      let pid=+g?.productId||0,qty=Math.max(0,+g?.qty||0);if(!pid||!qty)return;
      if(!map.has(pid))map.set(pid,{productId:pid,qty:0,seq:seq++});
      map.get(pid).qty+=qty;
    });
    if(!map.size&&+o?.productId){map.set(+o.productId,{productId:+o.productId,qty:Math.max(0,+o.qty||+o.totalQty||0),seq:0})}
    return [...map.values()].filter(x=>x.qty>0).sort((a,b)=>a.seq-b.seq).map(g=>({...g,product:product927(g.productId)}));
  }

  function knownService927(label){
    let want=n927(label);return (db.serviceTypes||[]).map(x=>String(x.name||'').trim()).find(x=>n927(x)===want)||'';
  }
  // O tipo de serviço passa a ser identificado pelo MODELO atual, nunca pelo texto do pedido inteiro.
  window.hlgb916ServiceNameForProduction=function(p){
    let pr=product927(p?.productId),name=n927(pr?.name||p?.product||''),cat=n927(pr?.category||'');
    let pick=x=>knownService927(x)||x;
    if(name.includes('body'))return pick('Body Feminino');
    if(name.includes('baby doll')||name.includes('babydoll')||name.includes('short doll'))return pick('Baby Doll');
    if(name.includes('camisola'))return pick('Camisola');
    if(name.includes('robe'))return pick('Robe');
    if(name.includes('cueca fem')||name.includes('calcinha')||name.startsWith('fio ')||name.includes(' fio ')||name.includes('tanga')||name.includes('calcola')||name.includes('calçola'))return pick('Calcinha');
    if(name.includes('cueca'))return knownService927('Cueca')||knownService927('Calcinha')||'Cueca';
    if(name.includes('conjunto')){
      if(name.includes('sem bojo'))return pick('Conjunto sem Bojo');
      if(name.includes('com bojo'))return pick('Conjunto com bojo');
    }
    let exact=(db.serviceTypes||[]).map(x=>String(x.name||'').trim()).find(x=>n927(x)===cat);if(exact)return exact;
    let byName=(db.serviceTypes||[]).map(x=>String(x.name||'').trim()).find(x=>name.includes(n927(x)));if(byName)return byName;
    return String(pr?.category||'').trim();
  };

  async function saveChanged927(rows){
    if(!rows.length||saving927)return;
    saving927=true;
    try{
      try{localSaveOnly()}catch(e){}
      if(typeof hlgbRecordSaveWithRetry==='function'&&typeof hlgbRecordId==='function'&&hlgbRecordReady&&cloudAccessToken){
        for(const row of rows){
          let id=hlgbRecordId('production',row);if(id)await hlgbRecordSaveWithRetry('production',id,row,false);
        }
        try{hlgbRecordPendingStore()}catch(e){}
        try{localSaveOnly()}catch(e){}
      }else{
        try{hlgbRecordPendingStore()}catch(e){}
      }
    }catch(e){
      console.warn('HLGB v91.27 salvar divisão por modelo',e);
      try{hlgbRecordPendingStore()}catch(x){}
    }finally{saving927=false}
  }

  function baseProduction927(c,o,g,id){
    let pr=g?.product||product927(g?.productId),qty=Math.max(0,+g?.qty||+c?.pieces||+o?.qty||0);
    return {
      id,
      cutId:c.id,orderId:c.orderId||o?.id||null,productId:g?.productId||c.productId||o?.productId||null,
      op:c.op||('CORTE-'+c.id),product:pr?.name||c.product||o?.items||'Pedido',client:c.client||o?.client||'',
      color:'',size:'',planned:qty,done:0,stage:'Aguardando atribuição',productionLocationId:null,factionId:null,
      date:c.finishedAt||isoDate(new Date()),assignmentSource:true,cutProductKey:`${c.id}:${g?.productId||c.productId||o?.productId||'legacy'}`
    };
  }

  // Cada produto/modelo de um mesmo corte vira uma linha independente para atribuição.
  window.syncFinalizedCutsToProduction=function(){
    if(typeof hlgb916EnsureData==='function')hlgb916EnsureData();
    db.cuts=Array.isArray(db.cuts)?db.cuts:[];db.production=Array.isArray(db.production)?db.production:[];
    let changed=[];
    db.cuts.filter(c=>n927(c.status)==='finalizado').forEach(c=>{
      let o=order927(c.orderId),groups=groups927(o),existing=db.production.filter(p=>+p.cutId===+c.id);
      if(!groups.length){
        if(!existing.length){let row=baseProduction927(c,o,null,Date.now()+Math.floor(Math.random()*900000));db.production.push(row);changed.push(row)}
        return;
      }
      // Não redivide cortes históricos que já foram efetivamente atribuídos/produzidos.
      let historicalAssigned=existing.length===1&&groups.length>1&&existing.some(p=>p.productionLocationId||p.factionId||(+p.done||0)>0||p.finishedAt);
      if(historicalAssigned)return;
      let reusable=existing.find(p=>!p.cutProductKey&&!p.productionLocationId&&!p.factionId&&!(+p.done||0)&&!p.finishedAt)||null;
      groups.forEach((g,i)=>{
        let key=`${c.id}:${g.productId}`;
        let row=db.production.find(p=>String(p.cutProductKey||'')===key)||db.production.find(p=>+p.cutId===+c.id&&+p.productId===+g.productId&&(!p.cutProductKey||p.cutProductKey===key));
        if(!row&&reusable){row=reusable;reusable=null}
        if(!row){
          row=baseProduction927(c,o,g,Date.now()+Math.floor(Math.random()*900000)+i);db.production.push(row);changed.push(row);return;
        }
        // Só corrige quantidade/modelo enquanto esta linha ainda não foi atribuída.
        if(!row.productionLocationId&&!row.factionId&&!(+row.done||0)&&!row.finishedAt){
          let pr=g.product||product927(g.productId),dirty=false;
          let assign=(k,v)=>{if(String(row[k]??'')!==String(v??'')){row[k]=v;dirty=true}};
          assign('productId',g.productId);assign('product',pr?.name||row.product||'Modelo');assign('planned',g.qty);assign('cutProductKey',key);assign('assignmentSource',true);assign('color','');assign('size','');
          if(dirty&&!changed.includes(row))changed.push(row);
        }
      });
    });
    if(changed.length){try{localSaveOnly()}catch(e){};setTimeout(()=>saveChanged927(changed.map(clone927)),20)}
    return changed.length>0;
  };

  // Evita recriar o <select> no próprio onchange (Safari/Chrome) e mantém as facções clicáveis.
  window.renderFactionPaymentPlanner=function(){
    let sel=document.getElementById('factionPlannerMaster'),tableEl=document.getElementById('factionPlannerTable');if(!sel||!tableEl)return;
    try{syncFinalizedCutsToProduction()}catch(e){console.warn('HLGB v91.27 planner split',e)}
    let cur=sel.value||'',facs=(db.factionMasters||[]).filter(x=>x.active!==false).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
    let desired=facs.map(f=>String(f.id)),current=[...sel.options].slice(1).map(o=>String(o.value));
    if(desired.join('|')!==current.join('|')){
      sel.innerHTML='<option value="">Selecione</option>'+facs.map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('');
      if(desired.includes(String(cur)))sel.value=cur;
    }
    let id=+sel.value||0;
    if(!id){
      tableEl.innerHTML=facs.length?'<div class="empty">Selecione uma facção para calcular.</div>':'<div class="empty">Nenhuma facção ativa foi encontrada. Confira o cadastro de facções.</div>';
      let cards=document.getElementById('factionPlannerCards');if(cards)cards.innerHTML='';return;
    }
    let rows=typeof hlgb916FactionPlannerRows==='function'?hlgb916FactionPlannerRows(id):[];
    tableEl.innerHTML=rows.length?`<table><tr><th>Selecionar</th><th>OP</th><th>Modelo</th><th>Tipo</th><th>Qtd. disponível</th><th>Qtd. planejada</th><th>Valor/peça</th><th>Subtotal</th></tr>${rows.map((r,i)=>`<tr><td><input class="factionPlanCheck" data-i="${i}" type="checkbox" onchange="recalcFactionPaymentPlanner()"></td><td>${esc(r.p.op||'-')}</td><td><b>${esc(r.product?.name||r.p.product||'-')}</b></td><td>${esc(r.service||'-')}</td><td>${r.qty.toLocaleString('pt-BR')}</td><td><input class="factionPlanQty" data-i="${i}" type="number" min="0" max="${r.qty}" value="${r.qty}" oninput="recalcFactionPaymentPlanner()" style="width:100px"></td><td><input class="factionPlanRate" data-i="${i}" type="number" min="0" step="0.01" value="${(+r.rate||0).toFixed(2)}" oninput="recalcFactionPaymentPlanner()" style="width:110px"></td><td class="factionPlanSubtotal" data-i="${i}">${money(r.qty*(+r.rate||0))}</td></tr>`).join('')}</table>`:'<div class="empty">Esta facção não possui modelos compatíveis aguardando atribuição. Os modelos aparecem separadamente conforme o tipo de serviço cadastrado.</div>';
    try{recalcFactionPaymentPlanner()}catch(e){}
  };

  // Reconcilia uma vez depois que os dados multiusuário terminarem de carregar.
  function boot927(){try{syncFinalizedCutsToProduction();renderCutAssignmentQueue();renderFactionAvailableModels();renderFactionPaymentPlanner()}catch(e){console.warn('HLGB v91.27 boot',e)}}
  setTimeout(boot927,700);
  window.addEventListener('focus',()=>setTimeout(boot927,80));
})();
</script>
'''

body=s.rfind('</body>')
if body<0:
    raise SystemExit('final body close not found')
s=s[:body]+addon+'\n'+s[body:]

s=s.replace('v91.26 Multiusuário','v91.27 Multiusuário')
s=s.replace('Versão v91.26','Versão v91.27')
s=s.replace('>v91.26</small>','>v91.27</small>')

p.write_text(s,encoding='utf-8')
print('patched HLGB v91.27 cut assignment by model + faction planner')
