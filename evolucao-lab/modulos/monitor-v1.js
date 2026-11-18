/* Verificações periódicas de sessão fictícia, sem escrita empresarial. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabMonitorV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const path=x=>String(x||'').split(/[?#]/)[0].replace(/^\.\//,'');
 function scripts(actual,expected,globals={}){
 const rows=actual.map(path),want=expected.map(path),seen=new Map(),issues=[];
 for(const x of rows)seen.set(x,(seen.get(x)||0)+1);
 for(const [x,n] of seen){if(n>1)issues.push({code:'SCRIPT_DUPLICADO',path:x,detail:n+' carregamentos'});if(!want.includes(x))issues.push({code:'SCRIPT_NAO_PREVISTO',path:x,detail:'Fora do manifesto desta interface'});}
 for(const x of want){if(!seen.has(x))issues.push({code:'SCRIPT_AUSENTE',path:x,detail:'Módulo obrigatório ausente'});if(Object.hasOwn(globals,x)&&globals[x]!==true)issues.push({code:'GLOBAL_AUSENTE',path:x,detail:'Exportação do módulo não localizada'});}
 if(new Set(want).size!==want.length)issues.push({code:'MANIFESTO_DUPLICADO',path:'manifesto',detail:'Manifesto de scripts inválido'});
 const order=rows.filter(x=>want.includes(x));if(rows.length===want.length&&order.some((x,i)=>x!==want[i]))issues.push({code:'ORDEM_SCRIPT',path:'manifesto',detail:'Ordem de inicialização divergente'});
 return {count:rows.length,expected:want.length,issues,ok:issues.length===0};}
 function evaluate({state,integrity,audit,scriptReport,source,at,round,trigger}){
 const issues=[];
 if(!state||!Number.isSafeInteger(state.revision))issues.push({code:'LEITURA_INCONCLUSIVA',detail:'Revisão não comprovada'});
 if(!integrity?.ok)issues.push({code:'INTEGRIDADE',detail:(integrity?.problems||['Verificação indisponível']).join('; ').slice(0,600)});
 if(!audit||!Array.isArray(audit.checks)||!Array.isArray(audit.findings))issues.push({code:'AUDITOR_INDISPONIVEL',detail:'Diagnóstico não executado'});
 else{for(const c of audit.checks)if(c.status==='erro_de_verificacao')issues.push({code:'REGRA_INCONCLUSIVA',detail:c.id});for(const f of audit.findings)if(['critica','alta'].includes(f.severity))issues.push({code:f.code,detail:String(f.recordId||'')+' · '+String(f.message||'').slice(0,180)});}
 for(const i of scriptReport?.issues||[])issues.push({code:i.code,detail:i.path+' · '+i.detail});
 if(!scriptReport)issues.push({code:'SCRIPTS_INCONCLUSIVOS',detail:'Inventário indisponível'});
 return {schema:'hlgb-monitor-ficticio-v1',at,round,trigger,source,revision:state?.revision??null,status:issues.length?'investigar':audit?.status==='cobertura_parcial'?'cobertura_parcial':'sem_alertas_nas_regras_cobertas',issues,scriptReport:scriptReport||null,productionApproval:false,readOnly:true};}
 return {scripts,evaluate};
});
