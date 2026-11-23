(function(){'use strict';
const host=document.getElementById('joint-preview'),filter=document.getElementById('joint-search');
const api=window.HLGBJointCutDiscovery9629;
let result;
function el(tag,value,parent){const node=document.createElement(tag);if(value!=null)node.textContent=String(value);if(parent)parent.appendChild(node);return node}
function render(){
 host.replaceChildren();if(!result){el('p','Sem consulta.',host);return}
 el('p',result.reason,host);if(result.unlinkedActivity)el('p','Existem atividades sem pedido identificado. Revisão necessária.',host);
 const q=filter.value.trim().toLowerCase();
 const groups=result.groups.filter(g=>[g.materialName,...g.lines.flatMap(x=>[x.productName,x.orderId])].some(v=>String(v).toLowerCase().includes(q)));
 el('p',groups.length+' agrupamento(s) de material para revisar',host);
 for(const g of groups){const card=el('article',null,host);el('h2',g.materialName,card);el('p',g.orderedPieces+' peças pedidas — saldo não confirmado',card);
 for(const x of g.lines){const item=el('div',null,card);item.className='line';el('strong',x.productName,item);el('span','Pedido #'+x.orderId+' · '+x.color+' · '+x.size+' · '+x.ordered+' pç pedidas',item);}
 }
 if(!groups.length)el('p','Nenhum agrupamento nesta consulta.',host);
}
document.getElementById('joint-refresh').addEventListener('click',()=>{result=api.discover(window.jointFixture,{pairIndex:()=>new Set()});render()});filter.addEventListener('input',render);
})();