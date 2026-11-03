const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-auditor-autocorrect-v9448.js','utf8');
let html='',saved=null;
const card={className:'',id:'',setAttribute(k,v){this[k]=v},set innerHTML(v){html=v},get innerHTML(){return html}};
const host={prepend(){}};
const document={querySelector:()=>null,getElementById:id=>id==='hlgbAuditorResult'?host:id==='hlgbAuditorAutoCorrect9448Card'?card:null,createElement:()=>card};
const ctx={window:{__HLGB_AUTH_READY:true,HLGB_AUDITOR_AUTOCORRECT_9447:'94.47',HLGB_PRODUCTION_RESIDUAL_9448:'94.50',addEventListener:()=>{},
 hlgbAuditorAutoCorrect9447:{prepare:async()=>({ok:true}),run:async()=>({stopReason:'Execução interrompida',unverified:[{detail:'Erro real do reparador'}]})},
 hlgbProductionResidual9448:{reconcileAndInspect:async()=>({before:{safeCopies:0},after:{candidateCount:0}})}},
 document,console,localStorage:{setItem:(k,v)=>{saved=JSON.parse(v)}},Date,Promise,Map,Set,Object,JSON,String,Number,structuredClone,
 setTimeout:()=>1,clearTimeout:()=>{},navigator:{userAgent:'test'}};
vm.createContext(ctx);vm.runInContext(src,ctx);
(async()=>{
 const out=await ctx.window.hlgbAuditorAutoCorrect9448.run({render:true});
 assert.equal(out.auditCompleted,false);
 assert.equal(out.executionFailed,true);
 assert.equal(out.passes,0);
 assert.equal(out.stillFailing,null,'failure must NOT imply zero outstanding bugs');
 assert(out.unverified.some(x=>x.code==='auditor:interrupted'));
 assert(html.includes('NÃO concluiu'),'UI must prominently disclose interruption');
 assert(html.includes('Erro real do reparador'),'UI must show underlying cause');
 assert(!html.includes('Resíduos atuais: 0'),'must not show misleading zero');
 assert.equal(card['data-audit-completed'],'false');
 assert.equal(saved.auditCompleted,false);
 assert.equal(saved.failure.message.includes('Erro real do reparador'),true);
 console.log('PASS Auditor failure is visible, documented and cannot masquerade as zero findings');
})().catch(e=>{console.error(e);process.exitCode=1});
