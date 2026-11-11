/* HLGB Health Monitor v95.38 — read-only.
   Scans tracked JS syntax, checks targeted regression tests and GitHub Pages/CI.
   NEVER writes production data, browser storage or Supabase records.
   DOES NOT prove real authenticated Safari/Chrome synchronization.
*/
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdirSync,statSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
const started=Date.now(),root=process.cwd(),out=join(root,'auditor-hourly');
const repo=process.env.GITHUB_REPOSITORY||'brunomozersilva-stack/hlgb-confeccoes';
const sha=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const checks=[],findings=[];
function clean(v){
 const s=String(v||'').replaceAll(root,'<workspace>').replace(/\x1b\[[0-9;]*m/g,'');
 return s.replace(/https:\/\/x-access-token:[^@\s]+@github\.com/gi,'https://github.com')
  .replace(/(?:ghp_|ghs_|github_pat_)[A-Za-z0-9_]+/g,'[redacted]').trim().slice(0,220);
}
function errMessage(p){
 const lines=String(p.stderr||p.stdout||p.error?.message||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 return clean(lines.find(x=>/SyntaxError|ReferenceError|TypeError|AssertionError|Error:|not ok \d/.test(x))||lines.at(-1)||'Falha não identificada');
}
function check(name,args,timeout=30000){
 const t=performance.now();
 const p=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout,maxBuffer:4*1024*1024,
  env:{...process.env,HLGB_HEALTH_READONLY:'1'}});
 const ok=p.status===0&&!p.error,detail=ok?'':errMessage(p);
 checks.push({name,ok,detail,durationMs:Math.round(performance.now()-t)});
 if(!ok)findings.push({severity:'error',category:'test',name,detail});
 console.log((ok?'PASS ':'FAIL ')+name+(detail?' - '+detail:''));
}
function scanSyntax(){
 const files=execFileSync('git',['ls-files','-z'],{cwd:root}).toString('utf8').split('\0')
  .filter(p=>/\.(?:js|cjs|mjs)$/.test(p)&&!/(^|\/)(?:node_modules|vendor|dist|build)\//.test(p)).sort();
 const errors=[];let bytes=0;
 for(const path of files){
  if(!existsSync(path))continue;
  bytes+=statSync(path).size;
  const p=spawnSync(process.execPath,['--check',path],{cwd:root,encoding:'utf8',timeout:9000,maxBuffer:1048576});
  if(p.status!==0||p.error)errors.push({file:path,reason:errMessage(p)});
 }
 const ok=errors.length===0;
 checks.push({name:'All tracked JavaScript syntax',ok,files:files.length,totalBytes:bytes,failed:errors.length,details:errors.slice(0,12)});
 if(!ok)findings.push({severity:'error',category:'syntax',name:'Syntax errors',count:errors.length,examples:errors.slice(0,6)});
 console.log('JavaScript files:',files.length,'syntax failures:',errors.length);
}
async function github(path){
 if(!process.env.GITHUB_TOKEN)throw Error('Token de leitura GitHub não disponível');
 const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),12000);
 try{
  const resp=await fetch('https://api.github.com'+path,{
   headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'},signal:ctl.signal});
  if(!resp.ok)throw Error('GitHub HTTP '+resp.status);
  return await resp.json();
 }finally{clearTimeout(tm)}
}
async function remote(){
 const state={status:'not_checked',publishedSha:null,publishedMatchesCommit:null,failedCI:[],completedCI:0};
 try{
  const [a,b]=await Promise.all([
   github('/repos/'+repo+'/actions/runs?event=dynamic&per_page=20'),
   github('/repos/'+repo+'/actions/runs?branch=main&per_page=100')
  ]);
  const published=(a.workflow_runs||[]).find(x=>x.name==='pages build and deployment'&&x.conclusion==='success');
  state.publishedSha=published?.head_sha||null;
  state.publishedMatchesCommit=!!published&&state.publishedSha===sha;
  const runs=(b.workflow_runs||[]).filter(x=>x.head_sha===sha&&x.status==='completed'
   &&x.name!=='HLGB Hourly Health Monitor v95.38');
  state.completedCI=runs.length;
  state.failedCI=runs.filter(x=>x.conclusion==='failure')
   .map(x=>({name:x.name,url:x.html_url})).slice(0,20);
  state.status='checked';
  if(!state.publishedMatchesCommit)findings.push({severity:'warning',category:'deploy',name:'Published SHA differs from main'});
  if(state.failedCI.length)findings.push({severity:'warning',category:'ci',name:'Failing CI checks for this commit',count:state.failedCI.length});
 }catch(e){state.status='unknown';state.error=clean(e.message);findings.push({
  severity:'warning',category:'github',name:'Cannot verify deployed SHA and CI',detail:state.error});}
 return state;
}
function markdown(report){
 const row=c=>'| '+c.name.replace(/\|/g,'/')+' | '+(c.ok?'Aprovado':'Falhou')+' | '
  +(c.files!=null?String(c.files)+' arquivos, '+String(c.failed)+' falhas':(c.detail||String(c.durationMs)+' ms'))+' |';
 return [
 '# HLGB — Monitor de saúde por hora v95.38','',
 'Gerado: '+report.generatedAt,
 'Commit: '+report.commit.slice(0,12),
 'Código: **'+report.codeStatus+'**',
 'Publicação: **'+(report.remote.publishedMatchesCommit===true?'Mesmo commit':report.remote.publishedMatchesCommit===false?'Commit diferente':'Não comprovada')+'**',
 'Safari ↔ Chrome reais: **NÃO TESTADO POR ESTE MONITOR**','',
 '## Verificações','| Verificação | Resultado | Detalhe |','|---|---|---|',
 ...report.checks.map(row),'','## Alertas',
 ...(report.findings.length?report.findings.map(f=>'- **'+f.severity+'** '+f.name+(f.detail?' — '+f.detail:'')+(f.count?' ('+f.count+')':'')):['_Nenhum nas verificações executadas._']),
 '','## Testes externos do mesmo commit com falha',
 ...(report.remote.failedCI.length?report.remote.failedCI.map(x=>'- '+x.name+': '+x.url):['_Nenhum entre os trabalhos consultados._']),
 '','## Limites e segurança',
 'A varredura horária detecta erros sintáticos, regressões simuladas e divergências de publicação.',
 '**Não confirma a entrega de dados entre usuários reais no Safari e Chrome**; para isso faltam telemetria e testes autenticados ponta a ponta.',
 'Este monitor é somente de leitura e não altera registros de produção, WAL, cache ou IndexedDB.',''
 ].join('\n');
}
scanSyntax();
for(const p of ['tests/safari-chrome-sync-v9535.cjs','tests/orders-cloud-visibility-v9537.cjs',
 'tests/wal-replay-idb-confirmation-v9469.cjs']){
 if(existsSync(p))check(p,['--test',p],45000);
 else findings.push({severity:'warning',category:'missing',name:'Missing test file',detail:p});
}
const signals=await remote();
const result={
 schemaVersion:1,kind:'hlgb-hourly-health',generatedAt:new Date().toISOString(),repository:repo,
 commit:sha,runId:process.env.GITHUB_RUN_ID||null,
 codeStatus:checks.every(c=>c.ok)?'OK':'FAILED',
 summary:{checks:checks.length,passed:checks.filter(c=>c.ok).length,
 failed:checks.filter(c=>!c.ok).length,findings:findings.length,durationMs:Date.now()-started},
 browserProof:{realSafariChrome:false,reason:'Requires authenticated two-session end-to-end verification'},
 checks,remote:signals,findings
};
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'latest.json'),JSON.stringify(result,null,2)+'\n');
const md=markdown(result);
writeFileSync(join(out,'latest.md'),md);
if(process.env.GITHUB_STEP_SUMMARY)writeFileSync(process.env.GITHUB_STEP_SUMMARY,md,{flag:'a'});
if(result.codeStatus!=='OK')process.exitCode=1;