#!/usr/bin/env node
'use strict';
/* Leitura estática do HLGB COMERCIAL na main. NÃO executa JS da aplicação,
   NÃO consulta Supabase, não modifica arquivos, não publica e não toca WAL. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const previous=require('./audit-live-monolith-v9601b.cjs');
const manifest=require('./ownership-v9600.json');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const unique=x=>[...new Set(x)].sort((a,b)=>a.localeCompare(b,'en'));
function scan(html){
 const prior=previous.inventory(html),blocks=[];
 const tag=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
 let lastEnd=0,line=1;
 for(const match of String(html).matchAll(tag)){
  const attrs=match[1],content=match[2];
  const gap=String(html).slice(lastEnd,match.index);
  line+=(gap.match(/\n/g)||[]).length;
  const startingLine=line;
  lastEnd=match.index+match[0].length;
  line+=(match[0].match(/\n/g)||[]).length;
  if(!content.trim())continue;
  const names=[...content.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(x=>x[1]);
  const arrows=[...content.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g)].map(x=>x[1]);
  const bindings=[...content.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g)].map(x=>x[1]);
  const symbols=unique([...names,...arrows]);
  const hints=previous.suggestDomains(symbols).candidateDomains;
  const candidates=Object.entries(hints).filter(([,list])=>list.length).map(([key])=>key);
  const id=attrs.match(/\bid\s*=\s*(["'])([^"']+)\1/i)?.[2]||null;
  blocks.push({
   ordinal:blocks.length+1,startingLine,elementId:id,sourceChars:content.length,
   sha256:hash(content),
   declaredFunctions:symbols,windowAssignments:unique(bindings),
   candidateDomains:candidates,
   touches:{
    localStorage:/\blocalStorage\b/.test(content),
    remoteWrite:/\b(?:hlgbRecordSaveWithRetry|cloudRequest|cloudUpsert|supabase\.from|saveRecord|persistRecord)\b/.test(content),
    wal:/\b(?:WAL|wal|indexedDB|IndexedDB)\b/.test(content),
    dom:/\b(?:document|innerHTML|addEventListener)\b/.test(content)
   }
  });
 }
 return {
  schema:'hlgb-commercial-inline-v9606',
  note:'Análise estática aproximada: nomes em strings/comentários podem aparecer. NÃO é extração de módulos nem prova funcional.',
  input:'app9240.html',inlineScriptBlocks:blocks.length,
  declaredFunctionsApprox:prior.declarationCount,windowBindingsApprox:prior.windowAssignmentCount,
  domIdsApprox:prior.domIdCount,inlineActionNamesApprox:prior.inlineEventActionNames.length,
  blocks
 };
}
function audit(){
 const bytes=fs.readFileSync(path.join(root,'app9240.html'));
 const actual=previous.gitBlobSha(bytes);
 const expected=manifest.criticalFileBlobs?.['app9240.html'];
 const extracted=manifest.monolithPhysicalExtractions||[];
 const restored=extracted.length?require('./verify-main-inline-extraction-v9607.cjs').audit():null;
 return {...scan(bytes.toString('utf8')),fileBytes:bytes.length,gitBlobSha:actual,
  expectedBlobSha:expected,unchanged:actual===expected&&(!restored||restored.ok),
  originalMainReconstructionSha:restored?.reconstructedGitSha||actual,
  logicalScriptBlocks:restored?restored.scriptTags:scan(bytes.toString('utf8')).inlineScriptBlocks,
  externallyMovedScripts:restored?.physicalExternalScripts||0};
}
if(require.main===module){
 const report=audit(),verify=process.argv.includes('--verify'),full=process.argv.includes('--json');
 const safe={
  input:report.input,fileBytes:report.fileBytes,gitBlobSha:report.gitBlobSha,
  unchanged:report.unchanged,inlineScriptBlocks:report.inlineScriptBlocks,
  declaredFunctionsApprox:report.declaredFunctionsApprox,
  domIdsApprox:report.domIdsApprox,
  riskBlocks:report.blocks.filter(b=>b.touches.remoteWrite||b.touches.wal).length,
  comment:'Original comercial apenas analisado; nada foi executado ou alterado.'
 };
 console.log(JSON.stringify(full?report:safe,null,2));
 if(verify&&(!report.unchanged||report.inlineScriptBlocks<90||report.declaredFunctionsApprox<1200||report.domIdsApprox<900)){
  console.error('HLGB: bloqueado. Monólito, funções ou identificadores da main mudaram. Revisar antes de publicar.');
  process.exitCode=1;
 }
}
module.exports={scan,audit};
