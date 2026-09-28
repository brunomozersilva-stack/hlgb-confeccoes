// Recovered guard adapted to the preserved Work implementation; behavioral scenarios run separately.
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('app9240.html','utf8');
const h=html.indexOf('function cloudApplyLegacySnapshot(payload){');
assert(h>=0,'helper de isolamento legado deve existir');
const hs=html.slice(h,h+1800);
assert(hs.includes('for(const module of HLGB_RECORD_MODULES)'),'helper deve preservar módulos normalizados');
assert(hs.includes('next[module]=db[module]'),'snapshot legado não pode substituir módulos por registro');
assert.equal((html.match(/cloudApplyLegacySnapshot\(merged\);/g)||[]).length,2,'os dois merges de cloudSaveNow devem usar isolamento');
assert(html.includes('cloudApplyLegacySnapshot(remote.dados);'),'pull legado deve usar isolamento');
assert(!html.includes('const oldPull948=window.cloudPullRemoteIfNewer;'),'wrapper antigo de pull que restaura snapshot não pode permanecer');
assert(!html.includes('const oldSave948=window.cloudSaveNow;'),'wrapper antigo de save que restaura snapshot não pode permanecer');
console.log('PASS legacy sync isolation: JSON legado não sobrescreve módulos por registro e wrappers obsoletos foram removidos.');
