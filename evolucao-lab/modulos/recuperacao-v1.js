/* Reparos locais restritos a metadados e diagnóstico de intenção, sem replay automático. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabRecoveryV1=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const schema='hlgb-evolucao-operacao-ficticia-v1';
 function chain(s){const events=s.log||[],base=events[0]?.type==='demo.reset'&&Number.isSafeInteger(events[0].revision)&&events[0].revision>=2?events[0].revision-1:1;
 const ids=new Set();return Number.isSafeInteger(s.revision)&&s.revision===base+events.length&&events.every((e,i)=>{if(!e.commandId||ids.has(e.commandId)||e.revision!==base+i+1)return false;ids.add(e.commandId);return true;});}
 function simulate(s,inspect,audit){if(s?.schema!==schema)throw Error('Documento fora do laboratório.');
 const expected=s.log.at(-1)?.commandId||'seed',before=s.revisionProof;let blocked=[];
 if(!chain(s))blocked.push('Sequência do histórico não comprovada.');
 const result=inspect(s);if(!result.ok)blocked.push(...result.problems);
 const a=audit(s);if(a.revision!==s.revision||a.checks.some(x=>x.status==='erro_de_verificacao'))blocked.push('Auditoria incompleta.');
 const other=a.findings.filter(x=>x.severity==='critica'&&x.code!=='REVISAO_PROVA');if(other.length)blocked.push('Outras falhas críticas: '+other.map(x=>x.code).join(', '));
 if(before===expected)return {revision:s.revision,action:'revisionProof',status:'not_needed',before,expected,blocked};
 if(blocked.length)return {revision:s.revision,action:'revisionProof',status:'blocked',before,expected,blocked};
 if(typeof before!=='string'||typeof expected!=='string')return {revision:s.revision,action:'revisionProof',status:'blocked',before,expected,blocked:['Metadado fora do formato seguro.']};
 return {revision:s.revision,action:'revisionProof',status:'ready',before,expected,blocked:[],changes:['revisionProof'],businessChanges:0};
 }
 function repair(s,p,ctx){const plan=simulate(s,ctx.inspect,ctx.audit);if(plan.status!=='ready'||p.before!==plan.before||p.expected!==plan.expected||p.revision!==plan.revision)throw Error('Simulação desatualizada ou reparo não permitido.');
 const recovery={commandId:ctx.uid,revision:s.revision+1,action:'revisionProof',before:plan.before,expected:plan.expected,reason:p.reason};
 s.revisionProof=plan.expected;
 const after=ctx.audit(s);if(after.findings.some(x=>x.code==='REVISAO_PROVA')||!ctx.inspect(s).ok)throw Error('Rechecagem não confirmou o reparo.');
 if(!s.repairHistory)s.repairHistory=[];s.repairHistory.push(recovery);return 'Metadado de revisão conferido · '+plan.before+' → '+plan.expected+' · '+p.reason;
 }
 function classify(s,intent,inspect){if(!s||s.schema!==schema||!intent?.commandId||!Number.isSafeInteger(intent.expectedRevision))return {status:'unknown',message:'Documento ou intenção indisponível.'};
 if(!chain(s)||s.revisionProof!==(s.log.at(-1)?.commandId||'seed')||!inspect(s).ok)return {status:'blocked',message:'Integridade da cópia local não confirmada; não repetir.'};
 const ev=s.log.find(x=>x.commandId===intent.commandId);
 if(ev)return ev.type===intent.type&&ev.revision===intent.expectedRevision+1&&(!intent.atomicVersion||typeof intent.actor==='string'&&ev.actor===intent.actor)?{status:'confirmed',revision:ev.revision,message:'Comando encontrado e confirmado na trilha local. Não repetir.'}:{status:'blocked',message:'Comando encontrado com prova divergente.'};
 if(s.revision===intent.expectedRevision)return {status:'not_found_same_revision',message:'Comando não encontrado nesta revisão. Verifique a intenção original; não reenviar automaticamente.'};
 return {status:'unknown',message:'Revisão mudou sem prova do comando; investigar antes de repetir.'};}
 function review(s,intent,inspect){
 const verdict=classify(s,intent,inspect);
 if(verdict.status==='confirmed')return {allowed:true,resolution:'confirmed',message:'Registro encontrado; arquivar apenas a intenção.'};
 if(verdict.status==='not_found_same_revision'&&!intent.atomicVersion)return {allowed:true,resolution:'legacy_absent',message:'Intenção antiga sem gravação na revisão esperada. Exige confirmação explícita e todas as outras abas fechadas.'};
 return {allowed:false,resolution:'investigate',message:verdict.message};
 }
 return {chain,simulate,repair,classify,review};
});
