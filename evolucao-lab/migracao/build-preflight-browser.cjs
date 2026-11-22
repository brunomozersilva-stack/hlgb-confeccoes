'use strict';
/* Constrói o motor browser diretamente das mesmas funções Node já testadas.
 * Evita dois validadores divergentes e não aciona bancos nem endpoints.
 * --check reprova o bundle obsoleto; --write atualiza artefato local.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname,output=path.join(root,'../modulos/preflight-migracao-browser-v1.js');
function build(){
 const grade=fs.readFileSync(path.join(root,'comparador-grade-legada.cjs'),'utf8');
 const links=fs.readFileSync(path.join(root,'preflight-vinculos-operacionais.cjs'),'utf8');
 const script=[
  '/* GERADO DE migracao/*.cjs; NÃO EDITAR: node evolucao-lab/migracao/build-preflight-browser.cjs --write */',
  '(function(root){',
  " 'use strict';",
  ' const gradeModule={exports:{}};',
  ' (function(module){',
  grade,
  ' })(gradeModule);',
  ' const linksModule={exports:{}};',
  ' (function(module,require){',
  links,
  " })(linksModule,function(p){if(p!=='./comparador-grade-legada.cjs')throw Error('Dependência de preflight inválida');return gradeModule.exports;});",
  " if(typeof gradeModule.exports.compare!=='function'||typeof linksModule.exports.review!=='function')throw Error('Motor de migração incompleto');",
  ' root.HLGBLabMigrationPreflightV1=Object.freeze({compare:gradeModule.exports.compare,review:linksModule.exports.review});',
  "})(typeof window!=='undefined'?window:null);",
  ''
 ].join('\n');
 new vm.Script(script,{filename:'preflight-migracao-browser-v1.js'});
 return script;
}
if(require.main===module){
 const mode=process.argv[2]||'--check',code=build();
 if(mode==='--write'){fs.writeFileSync(output,code,'utf8');console.log('Gerado módulo de prévia fictícia');}
 else if(mode==='--check'){
  if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==code)
   throw Error('Bundle pré-migração divergente dos contratos CJS. Execute --write e versionar.');
  console.log('PASS motor do navegador idêntico às validações de migration CJS');
 }else throw Error('Use --check ou --write');
}
module.exports=Object.freeze({build});
