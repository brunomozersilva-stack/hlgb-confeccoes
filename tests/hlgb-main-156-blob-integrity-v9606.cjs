'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const baseline=require('../hlgb-modules/main-156-blob-baseline-v9606.json');
const ownership=require('../hlgb-modules/ownership-v9600.json');
function sha(file){
 const bytes=fs.readFileSync(path.join(root,file));
 return crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
}
const changed=ownership.extractionChanges||{};
test('os 156 scripts comerciais originais existem e continuam na mesma ordem',()=>{
 assert.equal(baseline.sourceBranch,'main');
 assert.equal(baseline.sourceCommit,'7c66a37ea04b7bf6b130b28b17cf194941023251');
 assert.equal(baseline.originalScripts.length,156);
 assert.deepEqual(ownership.preExtractionScripts,baseline.originalScripts.map(x=>x.path));
 assert.deepEqual(new Set(baseline.originalScripts.map(x=>x.path)).size,156);
});
test('153 scripts da main permanecem byte a byte idênticos; três alterações explicitadas',()=>{
 const expected=['release-label-destination-v9310.js','release-separation-commit-v9319.js','release-separation-cut-target-v9335.js'];
 assert.deepEqual(Object.keys(changed).sort(),expected.sort());
 let untouched=0,edited=0;
 for(const script of baseline.originalScripts){
  const current=sha(script.path);
  assert.match(current,/^[a-f0-9]{40}$/);
  if(Object.hasOwn(changed,script.path)){
   assert.equal(changed[script.path].before,script.sha,'contrato baseline alterado: '+script.path);
   assert.equal(changed[script.path].after,current,'mudança não documentada: '+script.path);
   edited++;
  }else{
   assert.equal(current,script.sha,'script comercial modificado sem autorização: '+script.path);
   untouched++;
  }
 }
 assert.equal(untouched,153);
 assert.equal(edited,3);
});
test('app principal, index e roteador de abertura permanecem intactos',()=>{
 for(const [file,blob] of Object.entries(baseline.untouchedCore))assert.equal(sha(file),blob,file+' não pode mudar sem autorização');
 assert.equal(baseline.untouchedCore['app9240.html'],'db896b5fbf85392be5711ae1c44b3bf245893be4');
 assert.equal(Object.keys(baseline.untouchedCore).length,3);
});
test('carregador usa os 156 scripts originais e apenas três núcleos novos declarados',()=>{
 const html=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
 const i=html.indexOf('const moduleGroups='),j=html.indexOf(';const files=moduleGroups.flatMap(group=>group.files)',i);
 assert.ok(i>=0&&j>i);
 const files=JSON.parse(html.slice(i+'const moduleGroups='.length,j)).flatMap(g=>g.files);
 const extras=ownership.approvedNewScripts||[];
 assert.equal(files.length,159);
 assert.equal(extras.length,3);
 assert.deepEqual(files.filter(x=>!extras.includes(x)),baseline.originalScripts.map(x=>x.path));
 assert.deepEqual(files,ownership.releaseScripts);
 assert.equal(new Set(files).size,159);
});
