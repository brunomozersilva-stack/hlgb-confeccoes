const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
function src(name){return fs.readFileSync(path.join(__dirname,'..',name),'utf8')}
function compile(name){assert.doesNotThrow(()=>new vm.Script(src(name),{filename:name}),name+' deve ter sintaxe válida')}
const files=[
 'release-finance-locations-v9251.js','release-improvements-v9252.js','release-hub-week-v9253.js','release-catalog-recovery-v9254.js','release-critical-ui-v9255.js','release-batch-v9256.js','release-patch-v9257.js','release-hub-master-v9258.js','release-material-health-v9260.js','release-tab-resume-v9262.js','release-faction-manual-payment.js'
];
files.forEach(compile);
const loader=src('app-stable3.html');
files.forEach(f=>assert(loader.includes("'"+f+"'"),f+' deve estar carregado'));
assert(loader.includes('window.HLGB_HUB_MASTER_9258=true'),'loader deve reservar a autoridade do Hub antes das camadas históricas');
assert(loader.indexOf("'release-tab-resume-v9262.js'")<loader.indexOf("'release-ui-stability.js'"),'recuperação de aba deve carregar antes do guard visual final');

const hubSrc=src('release-hub-master-v9258.js');
assert(hubSrc.includes("const V='93.18'"),'Hub master deve declarar a autoridade atual');
for(const x of ['function weekRange(','function renderAll()','function setDate(','function shiftWeek(','function selfTest()'])assert(hubSrc.includes(x),'Hub master atual ausente: '+x);
assert(hubSrc.includes('if(editing())return false'),'Hub não deve renderizar por cima do editor aberto');

const mp=src('release-faction-manual-payment.js');
assert(!mp.includes(";\\nconst HUB_CUTOFF"),'pagamento avulso não pode conter \\n literal no código');
assert(mp.includes("const HUB_CUTOFF='2026-10-05'"),'corte de lançamento no Hub deve permanecer em 05/10');

const tab=src('release-tab-resume-v9262.js');
assert(tab.includes("document.addEventListener('visibilitychange'"),'retorno da aba deve ser tratado');
assert(tab.includes("window.addEventListener('pageshow'"),'bfcache/pageshow do Safari deve ser tratado');
assert(tab.includes("document.querySelectorAll('.hlgb-page-settling')"),'settling preso deve ser liberado');
assert(!/location\.reload\(\)/.test(tab),'retorno de aba não deve depender de reload total');

const ctx={console,setTimeout(){return 0},setInterval(){return 0},localStorage:{getItem(){return null},setItem(){}},db:{hubFinanceEntries:[]},window:{HLGB_HUB_MASTER_9258:true},document:{getElementById(){return null},querySelector(){return null}}};
ctx.window.window=ctx.window;
vm.createContext(ctx);vm.runInContext(hubSrc,ctx);
const api=ctx.window.hlgbHubMaster9258;assert(api,'API do Hub master deve existir');
assert.equal(api.version,'93.18');
assert.deepEqual(JSON.parse(JSON.stringify(api.weekRange('2026-10-05'))),{selected:'2026-10-05',start:'2026-10-05',end:'2026-10-11',monday:'2026-10-05T12:00:00.000Z',sunday:'2026-10-11T12:00:00.000Z'});
assert.equal(api.selfTest().ok,true,'self-test atual do Hub deve passar');
console.log('PASS estabilização atual: Hub master v93.18, semana canônica, retorno Safari e pagamento avulso preservados.');
