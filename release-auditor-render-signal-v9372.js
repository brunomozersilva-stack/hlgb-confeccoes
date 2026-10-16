/* HLGB Auditor v93.72 — sinal de render persistente, sem falso positivo de navegação/captura */
(function(){
'use strict';
if(window.HLGB_AUDITOR_RENDER_SIGNAL_9372)return;
const smart=window.hlgbAuditorSmart;
if(!smart||typeof smart.regression!=='function'||typeof smart.classifyProblem!=='function')throw new Error('Auditor inteligente ainda não está pronto para v93.72.');
window.HLGB_AUDITOR_RENDER_SIGNAL_9372=true;
const baseRegression=smart.regression;
const baseClassify=smart.classifyProblem;
function soakState(support){
 const s=support?.soak||support?.forensics?.soak||support?.hub?.soak||null;
 if(!s||s.available===false)return {available:false,stable:false};
 const maxBurst=+s.maxBurst||0,lagMaxMs=+s.lagMaxMs||0,mutationRecords=+s.mutationRecords||0;
 return {available:true,stable:maxBurst<=20&&lagMaxMs<=250&&mutationRecords<=50,maxBurst,lagMaxMs,mutationRecords};
}
function regression(metrics){
 const out=baseRegression.apply(this,arguments)||{baseline:null,findings:[]};
 // Um pico isolado inclui login, troca de página e abertura do próprio Auditor. Não é prova de loop.
 out.findings=(out.findings||[]).filter(x=>x?.code!=='dom-churn-growth');
 return out;
}
function classifyProblem(sync,reg,ip,support){
 const out=baseClassify.apply(this,arguments)||{observed:[],probableCauses:[]};
 const soak=soakState(support);
 if(soak.available&&soak.stable){
  out.probableCauses=(out.probableCauses||[]).filter(x=>x?.code!=='render-loop');
 }else if(soak.available&&soak.maxBurst>=100){
  out.probableCauses=out.probableCauses||[];
  if(!out.probableCauses.some(x=>x?.code==='render-loop'))out.probableCauses.push({code:'render-loop',detail:'A observação contínua registrou pico de '+soak.maxBurst+' mutações; lag máximo '+soak.lagMaxMs+' ms.'});
 }
 return out;
}
regression.__hlgb9372=true;regression.__original=baseRegression;
classifyProblem.__hlgb9372=true;classifyProblem.__original=baseClassify;
smart.regression=regression;
smart.classifyProblem=classifyProblem;
smart.renderSignal9372={version:'93.72',soakState,regression,classifyProblem};
console.info('[HLGB] Auditor render signal v93.72 ativo');
})();
