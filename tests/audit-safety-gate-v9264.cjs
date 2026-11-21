const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const src=f=>fs.readFileSync(path.join(root,f),'utf8');
const gateFile='release-safety-gate-v9269.js';
for(const f of [gateFile,'hlgb-canonical-sw.js','release-safari-resume-v9266.js'])assert.doesNotThrow(()=>new vm.Script(src(f),{filename:f}),f+' deve compilar');

const manifest=JSON.parse(src('release.json'));
assert(Number(manifest.version)>=93.72,'manifest deve refletir a linha atual estabilizada');
assert(Number(manifest.minimum_version)>=93.11,'versão mínima deve preservar a base de sincronização confirmada');
assert.equal(manifest.entry,'abrir.html');
assert.equal(manifest.force_canonical,true);

const loader=src('app-stable3.html');
assert(loader.includes("navigator.serviceWorker.register('./hlgb-canonical-sw.js'"),'loader deve registrar o service worker canônico sem depender de versão congelada');
assert(loader.includes("'release-safety-gate-v9269.js'"),'Safety Gate atual deve carregar no loader oficial');
assert(!loader.includes("'release-safety-gate-v9270.js'"),'Safety Gate histórico não deve disputar a autoridade atual');
assert(!loader.includes("'release-assistant-server-v9266.js'"),'IA paga opcional não deve carregar no modo padrão');
assert(loader.includes('window.HLGB_PAID_AI_DISABLED=true'),'loader deve manter IA paga desativada por padrão');

const sw=src('hlgb-canonical-sw.js');
assert(sw.includes("const CANONICAL='abrir.html'"),'service worker deve redirecionar para a entrada canônica atual');
assert(sw.includes("req.mode!=='navigate'"));
assert(sw.includes("/^app\\d+\\.html$/"),'service worker deve reconhecer entradas legadas');
assert(sw.includes('Response.redirect(target.href,302)'),'navegação legada deve ser redirecionada explicitamente');

const gate=src(gateFile);
assert(gate.includes("const V='93.16'"),'Safety Gate atual deve declarar sua autoridade real');
assert(gate.includes('HLGB_AUDIT_READ_ONLY_ACTIVE'),'Auditor deve continuar somente leitura');
assert(gate.includes("m!=='systemAuditRuns'"),'somente o registro técnico do Auditor pode escapar do bloqueio de escrita');
assert(gate.includes("'hlgbRecordSaveWithRetry'"),'gravação principal deve estar sob guarda durante auditoria');
assert(gate.includes("'hlgbAuditorRunVisualSweep'"),'varredura visual deve executar em modo somente leitura');
assert(gate.includes('HLGB_PAID_AI_DISABLED=true'),'IA paga deve permanecer desativada por padrão');
assert(gate.includes("entry='abrir.html'"),'gate deve conhecer a entrada canônica atual');

const safari=src('release-safari-resume-v9266.js');
for(const x of ["document.visibilityState==='hidden'","'pagehide'","'pageshow'",'stale-settle-cleared','visibility:visible!important','ensureWalAuthorityUpgrade9348'])assert(safari.includes(x),'proteção Safari ausente: '+x);

console.log('PASS Safety Gate atual: entrada abrir.html, Auditor somente leitura, IA paga desligada e recuperação Safari preservadas.');
