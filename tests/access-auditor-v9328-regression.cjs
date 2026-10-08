const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

async function testAuth(){
 const source=fs.readFileSync(path.join(__dirname,'..','release-save-transport-v9320.js'),'utf8');
 let mode='success',applied=0;
 class AC{constructor(){this.signal={aborted:false,_reject:null}}abort(){this.signal.aborted=true;const e=new Error('aborted');e.name='AbortError';this.signal._reject?.(e)}}
 const ctx={window:null,document:{querySelector:()=>null,addEventListener:()=>{},visibilityState:'visible'},navigator:{onLine:true},localStorage:{getItem:()=>null},console,Date,Promise,JSON,AbortController:AC,
   HLGB_SUPABASE_URL:'https://example.supabase.co',HLGB_SUPABASE_KEY:'public-key',
   cloudApplyAuth:()=>{applied++},
   cloudRequest:async()=>({}),cloudSignIn:async()=>{throw new Error('original should be replaced')},
   setInterval:()=>1,clearInterval:()=>{},clearTimeout:()=>{},
   setTimeout:(fn,ms)=>{if(ms>=18000)queueMicrotask(fn);return 1},
   fetch:(_url,opts)=>mode==='success'?Promise.resolve({ok:true,json:async()=>({access_token:'ok'})}):new Promise((resolve,reject)=>{opts.signal._reject=reject})
 };
 ctx.window=ctx;ctx.addEventListener=()=>{};
 vm.runInNewContext(source,ctx,{filename:'release-save-transport-v9320.js'});
 mode='success';await ctx.cloudSignIn('a@b.com','x');assert.equal(applied,1);
 mode='timeout';let err=null;try{await ctx.cloudSignIn('a@b.com','x')}catch(e){err=e}
 assert.equal(err?.code,'HLGB_AUTH_TIMEOUT');assert.equal(applied,1);
 assert.equal(ctx.hlgbSaveTransport9320.status().authInstalled,true);
 assert.equal(ctx.hlgbSaveTransport9320.status().authTimeouts,1);
}

async function testAuditor(){
 const source=fs.readFileSync(path.join(__dirname,'..','release-auditor-operational-v9314.js'),'utf8');
 const box={innerHTML:'',querySelectorAll(){const self=this;const found=[];for(const attr of ['data-hlgb-operational-audit','data-hlgb-audit-consolidated']){if(self.innerHTML.includes(attr))found.push({remove(){self.innerHTML=self.innerHTML.replace(new RegExp('<div class="panel" '+attr+'[^>]*>[\\s\\S]*?</div>(?=<div class="panel"|$)','g'),'')}})}return found},insertAdjacentHTML(pos,h){this.innerHTML=pos==='afterbegin'?h+this.innerHTML:this.innerHTML+h}};
 const ctx={window:null,document:{getElementById:id=>id==='hlgbAuditorResult'?box:null,querySelectorAll:()=>[]},navigator:{onLine:true},localStorage:{getItem:()=>null},console,Date,Promise,db:{systemIssues:[]},getComputedStyle:()=>({display:'block',visibility:'visible'}),setTimeout:(f)=>{f();return 1},setInterval:()=>1};
 ctx.window=ctx;ctx.cloudAccessToken='x';ctx.hlgbRecordReady=true;ctx.hlgbRecordSaveWithRetry=async()=>({applied:true});
 ctx.applySeparationProgress938=async()=>true;ctx.applySeparationProgress938.__hlgbCanonicalSeparation=true;ctx.applySeparationProgress938.__hlgbCanonicalVersion='93.27';ctx.applySeparationProgress938.__hlgb9312Mode='canonical-no-wrapper';
 ctx.hlgbSaveTransport9320={status:()=>({authInstalled:true,authTimeouts:0})};
 ctx.hlgbAuditorRunFull=async()=>({summary:{pass:10,warn:0,fail:0,result:'Aprovado'}});
 ctx.hlgbAuditorRunVisualSweep=async()=>({summary:{pass:10,warn:0,fail:0,result:'Aprovado'},visualSweep:[]});
 vm.runInNewContext(source,ctx,{filename:'release-auditor-operational-v9314.js'});
 const full=await ctx.hlgbAuditorRunFull();assert.equal(full.operational.checks.find(x=>x.code==='operational:separation-guard').status,'pass');
 assert.equal(full.summary.result,'Aprovado');
 const visual=await ctx.hlgbAuditorRunVisualSweep();assert.equal(visual.visualValidation.status,'not_tested');assert.equal(visual.summary.result,'Atenção');
 const count=(box.innerHTML.match(/Saúde operacional/g)||[]).length;assert.equal(count,1);
}

(async()=>{await testAuth();await testAuditor();console.log('PASS v93.28 access/auditor regression')})().catch(e=>{console.error(e);process.exit(1)});
