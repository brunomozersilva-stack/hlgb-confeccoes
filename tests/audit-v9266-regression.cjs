const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of ['release-assistant-server-v9266.js','release-safari-resume-v9266.js','release-safety-gate-v9269.js'])assert.doesNotThrow(()=>new vm.Script(src(f),{filename:f}),f+' deve compilar');

const ai=src('release-assistant-server-v9266.js');
assert(ai.includes("const V='92.66'"),'módulo opcional histórico deve permanecer compilável');
assert(ai.includes('/functions/v1/hlgb-assistant-ai'));
assert(ai.includes('return base.apply(this,arguments)'),'fallback local deve continuar disponível se módulo opcional for usado');

const safari=src('release-safari-resume-v9266.js');
for(const x of ["document.visibilityState==='hidden'","document.querySelectorAll('.hlgb-page-settling')","'pagehide'","'pageshow'",'stale-settle-cleared','visibility:visible!important','ensureWalAuthorityUpgrade9348'])assert(safari.includes(x),'Safari guard ausente: '+x);

const loader=src('app-stable3.html');
assert(!loader.includes("'release-assistant-server-v9266.js'"),'IA paga opcional não deve carregar no fluxo padrão');
assert(loader.includes("'release-assistant-brain-v9265.js'"),'cérebro local deve continuar no loader');
assert(loader.includes("'release-safety-gate-v9269.js'"),'Safety Gate atual deve carregar');
assert(loader.includes("'release-safari-resume-v9266.js'"),'guarda Safari deve continuar carregado');
assert(loader.lastIndexOf("'release-safari-resume-v9266.js'")>loader.lastIndexOf("'release-ui-stability.js'"),'guarda Safari deve fechar a cadeia visual principal');

const manifest=JSON.parse(src('release.json'));
assert(Number(manifest.version)>=93.72);assert(Number(manifest.minimum_version)>=93.11);assert.equal(manifest.entry,'abrir.html');
const gate=src('release-safety-gate-v9269.js');
assert(gate.includes("const V='93.16'"));assert(gate.includes('HLGB_AUDIT_READ_ONLY_ACTIVE'));assert(gate.includes('HLGB_PAID_AI_DISABLED=true'));
console.log('PASS compat atual: IA paga opcional fica fora do loader, fallback local permanece e proteção Safari/WAL está ativa.');
