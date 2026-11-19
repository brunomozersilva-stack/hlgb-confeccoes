'use strict';
// Somente os testes históricos usam esta vista de compatibilidade.
// Preserva TODO o HTML original; acrescenta uma lista textual entre aspas simples
// calculada a partir dos grupos REAIS no loader. Nunca inventa scripts ausentes.
const assert=require('node:assert/strict');
const legacy=require('./hlgb-loader-test-view-v9600.cjs');
const manifest=require('../hlgb-modules/ownership-v9600.json');
function compatibleLoaderView(html){
 assert.equal(typeof html,'string','precisa ler o HTML real do carregador');
 const loaded=legacy.scripts(html);
 assert.deepEqual(loaded,manifest.releaseScripts,'o HTML precisa corresponder ao manifesto real');
 const addons=manifest.approvedNewScripts||[];
 const before=manifest.preExtractionScripts||manifest.releaseScripts;
 assert.deepEqual(loaded.filter(name=>!addons.includes(name)),before,
  'todos os 156 scripts comerciais devem conservar sua ordem');
 return html+'\n/* TEST-ONLY: derived legacy quoted script view */\n'+legacy(html);
}
module.exports=compatibleLoaderView;
