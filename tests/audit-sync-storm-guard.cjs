const fs=require('fs'),assert=require('assert');
const current=fs.readFileSync('app9240.html','utf8');
const extraction=require('../hlgb-modules/verify-main-inline-extraction-v9607.cjs');
const moduleSource=fs.readFileSync(extraction.external,'utf8');
const src=extraction.restore(current,moduleSource);
assert.equal(extraction.sha(src),'db896b5fbf85392be5711ae1c44b3bf245893be4','a prova não pode dispensar regras ao mover o script');

assert(src.includes("filter(e=>manual||e.state!=='conflict')"),'silent WAL flush must skip conflict entries');
assert(src.includes('if(id==="producao"){renderProduction();}'),'opening Production must not reconcile');
assert(src.includes('function productionHubRows(){\n  // Visão somente leitura'),'production hub must be read-only');
assert(src.includes('function renderProduction(){\n // Somente leitura'),'renderProduction must be read-only');
assert(src.includes('function hlgb916UnassignedProduction(){\n  // Consulta somente leitura.'),'assignment queue query must be read-only');
assert(!src.includes("hlgbAfterLogin(()=>{setTimeout(syncFromEffectiveCut,700);setTimeout(syncFromEffectiveCut,2200)},0)"),'effective-cut reconciliation must not auto-run after login');
assert(!src.includes("window.addEventListener('online',()=>setTimeout(syncFromEffectiveCut,300))"),'effective-cut reconciliation must not auto-run on online');
assert(src.includes('window.syncFinalizedCutsToProduction=syncFromEffectiveCut;'),'explicit reconciliation API must remain available');
assert(src.includes('syncFinalizedCutsToProduction();\n renderCuts();'),'finalizing a cut must still explicitly reconcile production');

console.log('PASS sync storm guard: conflicts stay parked; production views are read-only; cut finalization still reconciles.');
