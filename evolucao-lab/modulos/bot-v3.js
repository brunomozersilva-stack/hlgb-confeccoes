/* Bot 3.0: aprendizado verificável por observações locais, sem ações automáticas. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.HLGBLabBotV3=api;})(typeof window!=='undefined'?window:null,function factory(){
 'use strict';
 const severity={critica:0,alta:1,media:2,informativa:3};
 const arr=(s,k)=>Array.isArray(s[k])?s[k]:[];
 const normalize=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
 const validAudit=(s,a)=>{if(!a||a.revision!==s.revision||!Array.isArray(a.findings)||!Array.isArray(a.checks))throw Error('Diagnóstico da revisão atual indisponível.');};
 const relevant=e=>!['bot.observe','bot.feedback'].includes(e.type);
 const operationalRevision=s=>arr(s,'log').filter(relevant).at(-1)?.revision||1;
 function digest(a){return JSON.stringify(a.findings.map(x=>[x.key,x.severity,x.evidence]).sort((a,b)=>a[0].localeCompare(b[0])));}
 function inspect(s){
 const errors=[],events=new Map(arr(s,'log').map(e=>[e.commandId,e])),seen=new Set(),snapshots=arr(s,'botObservations'),feedback=arr(s,'botFeedback');let last=0;
 for(const x of snapshots){const e=events.get(x.commandId);if(!x.commandId||seen.has(x.commandId)||!Number.isSafeInteger(x.revision)||!Number.isSafeInteger(x.operationalRevision)||x.operationalRevision<=last||x.operationalRevision>=x.revision||e?.type!=='bot.observe'||e.revision!==x.revision||!Array.isArray(x.findings)||!Array.isArray(x.checks)||typeof x.digest!=='string'||x.digest!==digest(x))errors.push('BOT observação sem prova: '+x.commandId);seen.add(x.commandId);last=x.operationalRevision;}
 for(const x of feedback){const e=events.get(x.commandId);if(!x.commandId||seen.has(x.commandId)||e?.type!=='bot.feedback'||e.revision!==x.revision||!['util','nao_util','investigando'].includes(x.outcome)||!x.key||!x.note||!snapshots.some(o=>o.commandId===x.observationId&&o.findings.some(f=>f.key===x.key)&&o.revision<x.revision))errors.push('BOT feedback sem prova: '+x.commandId);seen.add(x.commandId);}
 return errors;
 }
 function observe(s,a,uid){validAudit(s,a);if(a.checks.some(x=>x.status==='erro_de_verificacao'))throw Error('Diagnóstico incompleto: não registrar aprendizado.');
 const op=operationalRevision(s),prior=arr(s,'botObservations').at(-1);if(prior&&prior.operationalRevision>=op)throw Error('Já existe observação desta revisão operacional. Faça uma nova operação antes de registrar outra.');
 const record={commandId:uid,revision:s.revision+1,operationalRevision:op,digest:digest(a),checks:a.checks.map(x=>({id:x.id,status:x.status})),findings:a.findings.map(x=>({key:x.key,code:x.code,severity:x.severity,module:x.module,recordId:x.recordId,message:x.message,evidence:x.evidence,action:x.action}))};
 if(!s.botObservations)s.botObservations=[];s.botObservations.push(record);return 'Observação '+uid+' · revisão operacional '+op+' · '+record.findings.length+' ocorrências';
 }
 function feedback(s,p,uid){const observation=arr(s,'botObservations').find(x=>x.commandId===p.observationId);if(!observation||!observation.findings.some(x=>x.key===p.key))throw Error('Recomendação sem observação correspondente.');
 if(!['util','nao_util','investigando'].includes(p.outcome))throw Error('Resultado inválido.');
 if(!s.botFeedback)s.botFeedback=[];s.botFeedback.push({commandId:uid,revision:s.revision+1,observationId:p.observationId,key:p.key,outcome:p.outcome,note:p.note});return p.key+' · '+p.outcome+' · '+p.note;
 }
 function analyze(s,a){validAudit(s,a);const snapshots=arr(s,'botObservations'),feedback=arr(s,'botFeedback'),integrity=inspect(s);
 const lineage=new Map(),byCode=new Map(),lastSnapshot=snapshots.at(-1),currentKeys=new Set(a.findings.map(f=>f.key));
 for(const o of snapshots){const codes=new Set();for(const f of o.findings){if(!lineage.has(f.key))lineage.set(f.key,{key:f.key,observations:0,first:o.operationalRevision,last:o.operationalRevision});const x=lineage.get(f.key);x.observations++;x.last=o.operationalRevision;codes.add(f.code);}for(const code of codes)byCode.set(code,(byCode.get(code)||0)+1);}
 const latest=new Map();for(const x of feedback)latest.set(x.key,x);
 const active=a.findings.map(f=>{const history=lineage.get(f.key),count=history?.observations||0,codeCount=byCode.get(f.code)||0,review=latest.get(f.key)||null;const lastWithFinding=[...snapshots].reverse().find(o=>o.findings.some(x=>x.key===f.key));return {...f,observations:count,ruleObservations:codeCount,firstSeen:history?.first||null,lastSeen:history?.last||null,feedback:review,observationId:lastWithFinding?.commandId||null,priorityReason:count>1?'Persistente em revisões distintas':codeCount>1?'Regra recorrente em outras observações':'Gravidade da regra atual'};}).sort((x,y)=>(severity[x.severity]??9)-(severity[y.severity]??9)||y.observations-x.observations||y.ruleObservations-x.ruleObservations||x.key.localeCompare(y.key));
 const recurring=[];for(const [code,count] of byCode)if(count>1)recurring.push({code,observations:count,active:active.filter(x=>x.code===code).length});recurring.sort((a,b)=>b.observations-a.observations||a.code.localeCompare(b.code));
 const inactive=[...lineage.values()].filter(x=>!currentKeys.has(x.key)).map(x=>({...x,verified:a.previously?.some(v=>v.key===x.key&&v.state==='verificado')===true}));
 const incidents=new Map();for(const e of arr(s,'errors')){const key=normalize(e.message);if(!key)continue;const v=incidents.get(key)||{message:e.message,count:0,open:0};v.count++;if(e.status==='aberto')v.open++;incidents.set(key,v);}
 const outcomes={util:0,nao_util:0,investigando:0};for(const x of latest.values())if(Object.hasOwn(outcomes,x.outcome))outcomes[x.outcome]++;
 return {schema:'hlgb-lab-bot-v3',productionApproval:false,revision:s.revision,operationalRevision:operationalRevision(s),canObserve:!integrity.length&&!a.checks.some(x=>x.status==='erro_de_verificacao')&&(!lastSnapshot||lastSnapshot.operationalRevision<operationalRevision(s)),integrity,active,recurring,inactive,incidentPatterns:[...incidents.values()].filter(x=>x.count>1).sort((a,b)=>b.count-a.count),observations:snapshots.length,outcomes,feedbackCount:feedback.length,persistent:active.filter(x=>x.observations>1).length,history:snapshots.map(x=>({commandId:x.commandId,revision:x.revision,operationalRevision:x.operationalRevision,findings:x.findings.length})),feedbackHistory:feedback.map(x=>({...x}))};
 }
 return {analyze,observe,feedback,inspect};
});
