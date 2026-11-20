'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const impact=require('../modulos/impacto-materiais-pedidos-v1.js');
const state=()=>({revision:8,multiOrders:[{id:'PDM-001',items:[{id:'ITM-001',productId:'PRO-1'}]}],
 products:[{id:'PRO-1',name:'Camisola Teste',materialId:'MAT-1',gramsPerUnit:120}],
 materials:[{id:'MAT-1',name:'Malha',stockGrams:1000,priceCentsKg:2800}],
 materialRecipeRules:[{id:'RCP-1',active:true,productId:'PRO-1',materialId:'MAT-1',color:'Preto',size:'GG',gramsPerUnit:150}],
 stockLedger:[],purchaseOrders:[],finance:[]});
const quote=(size='GG',old=5,now=8)=>({orderId:'PDM-001',baseRevision:8,deltaPieces:now-old,
 changes:[{itemId:'ITM-001',model:'Camisola Teste',color:'Preto',size,
 beforeQty:old,afterQty:now,deltaQty:now-old}]});
test('somente leitura, consumo por tamanho e custo marginal',()=>{
 const s=state(),before=JSON.stringify(s),p=impact.impact(s,quote());
 assert.equal(p.deltaPieces,3);assert.equal(p.deltaGrams,450);
 assert.equal(p.deltaCostCents,1260);assert.equal(p.details[0].ruleId,'RCP-1');
 assert.equal(p.complete,true);assert.equal(p.canAuthorizeProduction,false);
 assert.equal(p.stockAssessment,'estoque_global_nao_reconciliado');
 assert.equal(p.stockWritten,false);assert.equal(p.purchaseCreated,false);
 assert.equal(JSON.stringify(s),before);
});
test('tamanho extra nao desaparece: utiliza ficha basica quando disponivel',()=>{
 const p=impact.impact(state(),quote('G2',2,4));
 assert.equal(p.deltaGrams,240);assert.equal(p.complete,true);
 assert.equal(p.details[0].size,'G2');
});
test('reducao de pedido calcula devolucao teorica sem criar saldo',()=>{
 const p=impact.impact(state(),quote('GG',8,5));
 assert.equal(p.deltaGrams,-450);assert.equal(p.deltaCostCents,-1260);
 assert.equal(p.canAuthorizeProduction,false);
});
test('ficha ausente e modelo novo nao identificado sao pendencias explicitas',()=>{
 const s=state();s.products[0].gramsPerUnit=0;s.materialRecipeRules=[];
 const p=impact.impact(s,quote('G2'));
 assert.equal(p.complete,false);assert.equal(p.missingRecipes[0].reason,'consumo_nao_definido');
 const q=quote();q.changes[0].itemId='ITM-099';
 const missing=impact.impact(s,q);
 assert.equal(missing.complete,false);assert.equal(missing.missingRecipes[0].reason,'modelo_sem_identificacao');
});
test('previsao de revisao antiga falha sem escrever',()=>{
 const s=state(),before=JSON.stringify(s);s.revision=9;
 assert.throws(()=>impact.impact(s,quote()),/desatualizada/);
 assert.equal(JSON.stringify(s),JSON.stringify({...JSON.parse(before),revision:9}));
});

test('aditivo novo resolve produto explicitamente sem usar item antigo',()=>{
 const s=state(),p=quote('G2',0,5);
 p.changes[0].itemId='ITM-002';
 p.newItemProductIds={'ITM-002':'PRO-1'};
 const q=impact.impact(s,p);
 assert.equal(q.complete,true);
 assert.equal(q.deltaGrams,600);
 assert.equal(q.details[0].itemId,'ITM-002');
});
