'use strict';
(function(root,api){if(typeof module==='object'&&module.exports){module.exports=api;return}if(!root||root.HLGBEvidenceQuery9655)return;root.HLGBEvidenceQuery9655=api;
const auth=()=>root.__HLGB_AUTH_READY===true,can=p=>{try{return typeof canOpenPage==='function'&&canOpenPage(p)===true}catch(_){return false}};
const deps={auth,can,read:k=>{const d=typeof db!=='undefined'?db:root.db;return Array.isArray(d?.[k])?d[k]:null},get productApi(){return root.HLGBProductHistory9652}};
function mount(){const input=document.getElementById('hlgbAssistantInput');if(!input||!auth()||document.getElementById('hlgbEvidenceQuery9655'))return;const host=document.createElement('section');host.id='hlgbEvidenceQuery9655';host.className='panel';const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Consulta com evidências';const out=document.createElement('div');out.setAttribute('aria-live','polite');host.append(b,out);input.closest('.hlgb-assistant-input')?.insertAdjacentElement('afterend',host);if(!host.isConnected)input.insertAdjacentElement('afterend',host);b.onclick=()=>{out.replaceChildren();const x=api.ask(input.value,deps),p=document.createElement('p');p.textContent=x.message;out.appendChild(p);for(const row of x.rows){const item=document.createElement('p');item.textContent=row.label+' · '+row.detail+' · Origem: '+row.source+' / '+row.id;out.appendChild(item)}};input.addEventListener('input',()=>out.replaceChildren());}
function clear(){document.getElementById('hlgbEvidenceQuery9655')?.remove()}
if(typeof document!=='undefined'){document.addEventListener('click',()=>setTimeout(mount,0),true);document.addEventListener('focusin',mount);root.addEventListener?.('hlgb:logout',clear);root.addEventListener?.('hlgb:authenticated',()=>{clear();mount()});document.addEventListener('visibilitychange',()=>{clear();if(!document.hidden)mount()});}
})(typeof window!=='undefined'?window:null,(function engine(){
 const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const sid=x=>typeof x==='string'||typeof x==='number'?String(x).trim():'';
 const live=x=>x&&!x.deletedAt&&!x.deleted_at&&!x.deleted&&!x._deleted;
 const result=(state,message,rows=[])=>({state,message,rows,canWrite:false,coverage:'local-only'});
 function ask(raw,deps){
  if(deps.auth()!==true)return result('forbidden','Entre no programa para consultar.');
  const q=String(raw??'').trim();if(!q||q.length>180)return result('unsupported','Informe uma consulta curta.');
  const m=q.match(/^pedido\s*#?\s*([A-Za-z0-9_-]{1,80})$/i),product=q.match(/^(?:hist[oó]rico(?: do)? produto|produto)\s+(.+)$/i);
  const permitted=p=>deps.auth()===true&&deps.can(p)===true;
  try{
   if(m){
    if(!permitted('pedidos'))return result('forbidden','Consulta de pedidos não autorizada.');
    const data=deps.read('orders');if(!Array.isArray(data))return result('unavailable','Pedidos ainda não disponíveis.');
    const rows=data.filter(x=>live(x)&&(sid(x.id)===m[1]||sid(x.orderNumber)===m[1]||sid(x.number)===m[1]));
    if(!permitted('pedidos'))return result('forbidden','Consulta indisponível nesta sessão.');
    if(rows.length!==1)return result(rows.length?'ambiguous':'empty',rows.length?'Há mais de um pedido com esta referência. Confira os IDs na tela de Pedidos.':'Não encontrado nos registros carregados.');
    const o=rows[0],id=sid(o.id),grade=Array.isArray(o.grade)?o.grade:Array.isArray(o.items)?o.items:null;
    const quantities=grade?.map(g=>g.qty??g.quantity??g.pieces);
    const qty=quantities?.every(v=>(typeof v==='number'||typeof v==='string'&&/^\d+$/.test(v))&&Number.isSafeInteger(Number(v))&&Number(v)>=0)?quantities.reduce((sum,v)=>sum+Number(v),0):null;
    const answer=[{source:'orders',id,label:'Pedido #'+sid(o.orderNumber||o.number||id),detail:[sid(o.status),Number.isSafeInteger(qty)?qty+' peças':'Quantidade não comprovada'].filter(Boolean).join(' · ')}];
    for(const [page,key] of [['corte','cuts'],['producao','production']]){
     if(!permitted(page))continue;const items=deps.read(key);
     if(!Array.isArray(items))continue;
     const linked=items.filter(x=>live(x)&&sid(x.orderId)===id&&!x.hiddenByModelSplitV1);
     const counts=new Map();for(const x of linked){const k=sid(x.id);counts.set(k,(counts.get(k)||0)+1)}
     for(const x of linked){if(!sid(x.id)||counts.get(sid(x.id))!==1)continue;answer.push({source:key,id:sid(x.id),label:key==='cuts'?'Corte':'Produção',detail:sid(x.status||x.stage)||'Status não informado'})}
    }
    if(!permitted('pedidos'))return result('forbidden','Sessão alterada.');
    const visible=answer.filter(x=>x.source==='orders'||x.source==='cuts'&&permitted('corte')||x.source==='production'&&permitted('producao'));
    return result('observed','Registros locais vinculados por ID. Não confirma conclusão, saldo ou sincronização.',visible.slice(0,50));
   }
   if(product){
    if(!permitted('produtos'))return result('forbidden','Consulta de produtos não autorizada.');
    const db={products:deps.read('products')},p=deps.productApi;
    if(!p||!Array.isArray(db.products))return result('unavailable','Catálogo ainda não disponível.');
    const x=p.search(db,product[1],{allowed:true,limit:20});
    if(!permitted('produtos'))return result('forbidden','Sessão alterada.');
    if(x.total!==1)return result(x.total?'ambiguous':'empty',x.total?'Selecione a referência exata na busca de Produtos.':'Modelo não encontrado nos registros locais.',x.rows.map(r=>({source:'products',id:r.id,label:r.name,detail:r.code||r.id})));
    const row=x.rows[0],modules=[];for(const [page,key] of [['pedidos','orders'],['corte','cuts'],['producao','production'],['faccoes','factions']])if(permitted(page)){modules.push(key);db[key]=deps.read(key)}
    const history=p.timeline(db,row.id,{allowed:true,modules,limit:30});
    if(!permitted('produtos')||modules.some(k=>!permitted(({orders:'pedidos',cuts:'corte',production:'producao',factions:'faccoes'})[k])))return result('forbidden','Sessão ou acesso alterado.');
    return result('observed','Modelo '+row.name+' · '+history.total+' eventos locais; até 30 exibidos. '+(history.issues.length?'Há lacunas de vínculo ou dados. ':'')+'Não confirma cobertura da nuvem.',[{source:'products',id:row.id,label:row.name,detail:row.code||''},...history.rows.map(e=>({source:e.source,id:e.sourceId,label:e.status||e.source,detail:[e.date,e.orderId?'Pedido '+e.orderId:'',e.quantity===null?'':e.quantity+' peças'].filter(Boolean).join(' · ')}))]);
   }
   return result('unsupported','Use “pedido 125” ou “histórico produto Camisola”. Para as demais funções, utilize o Assistente original.');
  }catch(_){return result('unavailable','Não foi possível conferir a consulta. Nenhuma alteração foi feita.')}
 }
 return {ask};
})());
