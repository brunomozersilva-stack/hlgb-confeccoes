'use strict';
const PURE=Object.freeze([
  "tests/audit-app-stable3-restored-render-regression.cjs",
  "tests/audit-wal-idb-only-regression.cjs",
  "tests/audit-wal-equivalent-production-regression.cjs",
  "tests/audit-record-integrity-regression.cjs",
  "tests/audit-payroll-integrity-regression.cjs",
  "tests/hlgb-live-label-layout-v9602b.cjs",
  "tests/hlgb-live-monolith-inventory-v9601b.cjs",
  "tests/hlgb-integration-v9651.cjs",
  "tests/hlgb-candidate-v9635.cjs",
  "tests/hlgb-candidate-single-source-v9648.cjs",
  "tests/hlgb-live-finance-integrated-v9657.cjs",
  "tests/hlgb-live-personnel-finance-v9656.cjs",
  "tests/hlgb-settlement-history-v9653.cjs",
  "tests/hlgb-settlement-history-view-v9654.cjs",
  "tests/hlgb-financial-week-core-v9627.cjs",
  "tests/hlgb-cash-projection-v9631.cjs",
  "tests/hlgb-hub-intelligence-adapter-v9633.cjs",
  "tests/hlgb-hub-intelligence-legacy-v9633.cjs",
  "tests/hlgb-payroll-fifth-day-v9632.cjs",
  "tests/hlgb-payroll-preview-adapter-v9634.cjs",
  "tests/hlgb-payroll-planning-v9645.cjs",
  "tests/hlgb-payroll-provision-core-v9649.cjs",
  "tests/hlgb-rh-planning-v9636.cjs",
  "tests/hlgb-attendance-transport-v9658.cjs",
  "tests/hlgb-hub-personnel-forecast-v9650.cjs",
  "tests/hlgb-worker-registry-v9659.cjs",
  "tests/hlgb-product-history-search-v9652.cjs",
  "tests/hlgb-assistant-evidence-v9655.cjs",
  "tests/hlgb-joint-cut-core-v9628.cjs",
  "tests/hlgb-joint-cut-discovery-v9629.cjs",
  "tests/hlgb-fabric-remnant-policy-v9630.cjs",
  "tests/hlgb-production-planning-v9661.cjs",
  "tests/cut-evidence-archive-contract-v9646.cjs",
  "tests/cut-separation-checklist-v9644.cjs",
  "tests/cut-separation-workspace-v9643.cjs",
  "tests/auditor-smart-ready-v9639.cjs",
  "tests/hlgb-preventive-v9637.cjs",
  "tests/hlgb-preventive-test-priority-v9638.cjs",
  "tests/hlgb-ast-preventive-v9641.cjs"
]);
const BROWSER=Object.freeze([
  "tests/hlgb-candidate-v9635-browser.cjs",
  "tests/hlgb-production-planning-v9661-browser.cjs",
  "tests/mobile-real-pages-v9640.cjs",
  "tests/auditor-smart-ready-v9639-browser.cjs",
  "tests/cut-separation-workspace-v9643-browser.cjs"
]);

const sha=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
function plan(){
 const rows=PURE.map(file=>({id:file,file,kind:'node',args:[file],env:{}}));
 rows.push({id:'payroll-extracted-mode',file:'tests/audit-payroll-integrity-regression.cjs',kind:'node',args:['tests/audit-payroll-integrity-regression.cjs'],env:{HLGB_PROVISION_CORE:'1'}});
 for(const engine of ['chromium','webkit'])for(const file of BROWSER)rows.push({id:engine+':'+file,file,kind:engine,args:[file],env:{HLGB_BROWSER:engine}});
 return rows;
}
function verdict(expected,actual,clean,rows){
 const wanted=plan();const ids=new Set(rows.map(r=>r.id));
 const complete=rows.length===wanted.length&&ids.size===wanted.length&&wanted.every(t=>ids.has(t.id));
 const passed=complete&&rows.every(r=>r.status==='success');
 return {expected,actual,clean,complete,localPass:sha(expected)&&expected===actual&&clean===true&&passed,passed:rows.filter(r=>r.status==='success').length,total:wanted.length,mergeAuthorized:false,remotePersistenceVerified:false,fullGitHubSuiteRequired:true};
}
const ASSETS=Object.freeze([
 'hlgb-modules/homologacao/index.html','hlgb-modules/homologacao/candidate-v9635.css','hlgb-modules/homologacao/candidate-service-v9635.js','hlgb-modules/homologacao/candidate-ui-v9635.js',
 'hlgb-modules/financeiro/weekly-intelligence-core-v9627.js','hlgb-modules/financeiro/cash-projection-v9631.js','hlgb-modules/financeiro/hub-intelligence-adapter-v9633.js','hlgb-modules/financeiro/payroll-fifth-day-v9632.js','hlgb-modules/financeiro/payroll-preview-adapter-v9634.js','hlgb-modules/financeiro/rh-planning-v9636.js','hlgb-modules/financeiro/payroll-calendar-transport-workers-v9645.js','hlgb-modules/financeiro/hub-personnel-forecast-reconcile-v9650.js','hlgb-modules/financeiro/settlement-history-v9653.js',
 'hlgb-modules/producao/joint-cut-core-v9628.js','hlgb-modules/producao/joint-cut-discovery-v9629.js','hlgb-modules/producao/fabric-remnant-policy-v9630.js','release-hub-payroll-paid-date-v9515.js',
 'tests/auditor-smart-ready-v9639.html','release-auditor-smart-v9360.js','release-auditor-safari-download-v9368.js','release-auditor-runtime-fix-v9370.js','release-auditor-render-signal-v9372.js'
]);
function assetPath(url){if(typeof url!=='string'||!url.startsWith('/'))return null;const p=url.slice(1);return ASSETS.includes(p)?p:null}
function envFor(source,extra={}){
 const out={};for(const k of ['PATH','Path','HOME','USERPROFILE','TMPDIR','TMP','TEMP','SystemRoot','WINDIR','PLAYWRIGHT_BROWSERS_PATH'])if(typeof source[k]==='string')out[k]=source[k];
 return {...out,TZ:'UTC',CI:'true',...extra};
}
module.exports={plan,verdict,assetPath,envFor};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawnSync,fork}=require('node:child_process'),{performance}=require('node:perf_hooks');
 const root=path.resolve(__dirname,'../..'),args=process.argv.slice(2);
 function inside(file){const p=path.resolve(root,file);if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.realpathSync(p).startsWith(root+path.sep))throw Error('missing/unsafe path: '+file);return p}
 function serve(){
  if(typeof process.send!=='function')throw Error('internal mode only');
  const server=http.createServer((req,res)=>{const file=assetPath(req.url);if(req.method!=='GET'||!file){res.writeHead(404).end();return}try{const p=inside(file),type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'"});res.end(fs.readFileSync(p))}catch(_){res.writeHead(404).end()}});
  server.on('error',e=>{process.send({error:e.code||'server'});process.exitCode=1;process.disconnect()});server.listen(4173,'127.0.0.1',()=>process.send({ready:true}));process.on('disconnect',()=>server.close());
 }
 function git(a){const r=spawnSync('git',a,{cwd:root,encoding:'utf8',env:envFor(process.env),timeout:10000,shell:false});if(r.status!==0)throw Error('git check failed');return r.stdout.trim()}
 function dependency(name,version){const actual=require(require.resolve(name+'/package.json',{paths:[root]})).version;if(actual!==version)throw Error(name+' expected '+version+'; actual '+actual)}
 async function start(){const c=fork(__filename,['--serve'],{cwd:root,env:envFor(process.env),stdio:['ignore','ignore','ignore','ipc']});try{await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('fixture server timeout')),5000);const done=f=>v=>{clearTimeout(timeout);f(v)};c.once('error',done(reject));c.once('exit',done(()=>reject(Error('fixture server exited'))));c.once('message',done(m=>m.ready?resolve():reject(Error('fixture server unavailable: '+m.error))))});return c}catch(e){c.kill();throw e}}
 async function main(){
  if(args.length===0||args.length===1&&args[0]==='--plan'){console.log(JSON.stringify({mode:'plan-only',tests:plan(),mergeAuthorized:false},null,2));return}
  if(args.length!==3||args[0]!=='--run'||args[1]!=='--expect-sha'||!sha(args[2]))throw Error('usage: --plan | --run --expect-sha <40 hex>');
  const expected=args[2],actual=git(['rev-parse','HEAD']),clean=git(['status','--porcelain','--untracked-files=no'])==='';
  if(actual!==expected||!clean)throw Error('checkout SHA mismatch or tracked files modified');
  if(Number(process.versions.node.split('.')[0])!==22)throw Error('Node 22 required');
  const rows=plan();for(const t of rows)inside(t.file);for(const file of ASSETS)inside(file);
  dependency('playwright','1.55.0');dependency('acorn','8.15.0');
  const results=[];let server=null;
  try{
   server=await start();
   for(const t of rows){
    const at=performance.now(),r=spawnSync(process.execPath,t.args,{cwd:root,encoding:'utf8',timeout:t.kind==='node'?120000:180000,maxBuffer:8*1024*1024,env:envFor(process.env,t.env),shell:false});
    const status=r.error?.code==='ETIMEDOUT'?'timeout':r.status===0&&!r.error?'success':'failure';
    const entry={id:t.id,status,durationMs:Math.round(performance.now()-at),exitCode:r.status};results.push(entry);process.stderr.write(t.id+' '+status+' '+entry.durationMs+'ms\n');if(status!=='success')process.stderr.write(String(r.stderr||r.error||'').slice(0,2000)+'\n');
   }
  }finally{if(server)server.kill()}
  const finalHead=git(['rev-parse','HEAD']),finalClean=git(['status','--porcelain','--untracked-files=no'])==='';
  const report={...verdict(expected,finalHead,clean&&finalClean,results),mode:'native-local-fixtures',results};console.log(JSON.stringify(report,null,2));if(!report.localPass)process.exitCode=1;
 }
 if(args.length===1&&args[0]==='--serve')serve();else main().catch(e=>{console.error(e.message);process.exitCode=1});
}
