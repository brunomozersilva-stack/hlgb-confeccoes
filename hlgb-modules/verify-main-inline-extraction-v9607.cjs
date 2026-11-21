#!/usr/bin/env node
'use strict';
// Prova SOMENTE LEITURA. Nenhum código da aplicação é executado aqui.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const snapshot=require('./main-156-blob-baseline-v9606.json');
const manifest=require('./ownership-v9600.json');
const external='hlgb-modules/producao/corte-producao-quantidade-v9607.js';
const fixture='tests/fixtures/original-corte-producao-quantidade-v9607.js';
const marker='<script src="./'+external+'"></script>';
const sha=bytes=>{
 const content=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes,'utf8');
 return crypto.createHash('sha1').update(Buffer.from('blob '+content.length+'\0')).update(content).digest('hex');
};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function restore(html,body){
 const first=html.indexOf(marker);
 if(first<0||html.indexOf(marker,first+marker.length)>=0)throw Error('Expected exactly one classic same-order external script');
 if(/<script\b[^>]*\bsrc\s*=\s*['"][^'"]*corte-producao-quantidade-v9607\.js[^'"]*['"][^>]*(?:\basync\b|\bdefer\b)/i.test(html))
  throw Error('Production cut script may not load asynchronously');
 return html.replace(marker,'<script>'+body+'</script>');
}
function audit(){
 const html=fs.readFileSync(path.join(root,'app9240.html'),'utf8');
 const js=fs.readFileSync(path.join(root,external),'utf8');
 const original=fs.readFileSync(path.join(root,fixture),'utf8');
 const rebuilt=restore(html,js);
 const blocks=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
 const inline=blocks.filter(m=>m[2].trim()).length;
 const network=blocks.filter(m=>m[1].includes(external)).length;
 const result={
  type:'HLGB_COMERCIAL_MAIN_INLINE_EXTRACTION_9607',
  source:external,originalFixture:fixture,
  originalGitSha:snapshot.untouchedCore['app9240.html'],
  reconstructedGitSha:sha(rebuilt),
  currentGitSha:sha(html),
  approvedCurrentGitSha:manifest.criticalFileBlobs['app9240.html'],
  identicalScriptSource:js===original,
  originalScriptSha256:hash(original),
  externalScriptSha256:hash(js),
  physicalInlineScripts:inline,physicalExternalScripts:network,scriptTags:blocks.length,
  preservedFunctionMarker:js.includes("const V='92.40-cut-production-qty'"),
  noInlineDuplicate:!html.includes("const V='92.40-cut-production-qty'"),
  unchangedIndex:sha(fs.readFileSync(path.join(root,'index.html')) )===snapshot.untouchedCore['index.html'],
  unchangedAbrir:sha(fs.readFileSync(path.join(root,'abrir.html')) )===snapshot.untouchedCore['abrir.html']
 };
 result.ok=result.identicalScriptSource
  &&result.originalGitSha==='db896b5fbf85392be5711ae1c44b3bf245893be4'
  &&result.reconstructedGitSha===result.originalGitSha
  &&result.currentGitSha===result.approvedCurrentGitSha
  &&result.physicalInlineScripts===91&&result.physicalExternalScripts===1&&result.scriptTags===92
  &&result.preservedFunctionMarker&&result.noInlineDuplicate&&result.unchangedIndex&&result.unchangedAbrir;
 return result;
}
if(require.main===module){
 const result=audit();console.log(JSON.stringify(result,null,2));
 if(process.argv.includes('--verify')&&!result.ok)process.exitCode=1;
}
module.exports={audit,restore,marker,external,fixture,sha};
