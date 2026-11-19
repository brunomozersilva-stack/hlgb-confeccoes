#!/usr/bin/env node
'use strict';
/*
 * HLGB COMERCIAL (main): inventário conservador, SOMENTE LEITURA.
 * Nunca interpreta ou executa JS do app9240, nunca solicita dados de negócio.
 * A extração física de funções requer revisão humana dos pontos de chamada.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function gitBlobSha(bytes){
 const content=Buffer.isBuffer(bytes)?bytes:Buffer.from(String(bytes),'utf8');
 return crypto.createHash('sha1')
  .update(Buffer.from('blob '+content.length+'\0'))
  .update(content).digest('hex');
}
function inventory(html){
 const scripts=[],tag=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
 for(const match of String(html).matchAll(tag)){
  if(!match[2].trim())continue;
  scripts.push(match[2]);
 }
 const all=scripts.join('\n'),declarations=new Set(),globalWrites=new Set();
 const domIds=new Set(),handlers=new Set(),eventNames=new Set();
 for(const x of String(html).matchAll(/\bid\s*=\s*(["'])([^"']{1,150})\1/gi))domIds.add(x[2]);
 for(const x of String(html).matchAll(/\bon(click|change|input|submit|blur|focus|keydown|keyup)\s*=\s*(["'])([\s\S]*?)\2/gi)){
  eventNames.add(x[1].toLowerCase());
  const action=x[3].trim().match(/^(?:return\s+)?(?:window\.)?([A-Za-z_$][\w$]*)\s*\(/);
  if(action)handlers.add(action[1]);
 }

 for(const x of all.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g))declarations.add(x[1]);
 for(const x of all.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g))declarations.add(x[1]);
 for(const x of all.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g))globalWrites.add(x[1]);
 const order=x=>[...x].sort((a,b)=>a.localeCompare(b,'en'));
 return {
  scriptBlocks:scripts.length,
  declarationCount:declarations.size,
  windowAssignmentCount:globalWrites.size,
  declarations:order(declarations),
  windowAssignments:order(globalWrites),
  domIdCount:domIds.size,
  domIds:order(domIds),
  inlineEventTypes:order(eventNames),
  inlineEventActionNames:order(handlers)
 };
}
// Rótulos candidatos: NÃO são limites reais de código.
const domainHints=[
 ['base-infraestrutura',/^(?:app|init|boot|auth|login|logout|session|open|home|start|reload)/i],
 ['sincronizacao-wal',/(?:sync|wal|queue|replay|cloud|remote|reconcile|commit|persist|saveWithRetry|pending|indexedDB|idb)/i],
 ['pedidos-projecao',/(?:order|pedido|projection|projecao|client|customer|produto|product|grade)/i],
 ['corte-cortadores',/(?:cut|cort|weight|peso|materialUsage|gradeCut)/i],
 ['producao-separacao',/(?:production|produc|separation|separac|fabric|delivery)/i],
 ['faccoes-acertos',/(?:faction|facc|acerto|settle|payee|costura)/i],
 ['financeiro-hub-notas',/(?:hub|finance|nota|invoice|payment|receiv|bill)/i],
 ['folha-pessoal',/(?:payroll|folha|employee|funcion|termination|salario|fare|passagem)/i],
 ['compras-estoque',/(?:purchase|compra|stock|estoque|supplier|fornecedor|warehouse)/i],
 ['utilidades-etiquetas',/(?:label|etiquet|print|impress|route|rota)/i],
 ['auditor-monitor',/(?:audit|auditor|monitor|diagnos|health|error|erro)/i],
 ['assistente-ia',/(?:assistant|assistente|brain|intent|chatbot|aiQuery)/i],
 ['impressora-3d',/(?:printer3d|filament|filamento|threeD)/i],
 ['interface-mobile',/(?:mobile|responsive|screen|panel|modal|render|navigation|sidebar)/i]
];
function suggestDomains(names){
 const results=Object.fromEntries(domainHints.map(([name])=>[name,[]]));
 const unclassified=[];
 for(const name of names){
  const matched=domainHints.filter(([,re])=>re.test(name));
  if(!matched.length)unclassified.push(name);
  for(const [domain] of matched)results[domain].push(name);
 }
 return {candidateDomains:results,unclassified};
}
function readCurrent(){
 const bytes=fs.readFileSync(path.join(root,'app9240.html'));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'hlgb-modules/ownership-v9600.json'),'utf8'));
 const sha=gitBlobSha(bytes),expected=manifest.baselineCriticalFileBlobs?.['app9240.html']||manifest.criticalFileBlobs?.['app9240.html'];
 const result=inventory(bytes.toString('utf8'));
 const suggested=suggestDomains(result.declarations);
 return {
  file:'app9240.html',bytes:bytes.length,sha,expectedSha:expected,untouched:sha===expected,
  ...result,
  ...suggested
 };
}
if(require.main===module){
 const result=readCurrent(),verify=process.argv.includes('--verify');
 const full=process.argv.includes('--full-json');
 const safe={
  file:result.file,bytes:result.bytes,sha:result.sha,expectedSha:result.expectedSha,
  untouched:result.untouched,inlineScriptBlocks:result.scriptBlocks,
  declaredFunctionNames:result.declarationCount,windowAssignments:result.windowAssignmentCount,
  sampleDeclarationNames:result.declarations.slice(0,25),
  warning:'Inventário aproximado dos identificadores, NÃO prova extração funcional nem permite publicação.'
 };
 console.log(JSON.stringify(full?{...result,warning:safe.warning}:safe,null,2));
 if(verify&&(!safe.untouched||safe.bytes<1000000||safe.inlineScriptBlocks<1)){
  console.error('HLGB LIVE: monólito comercial inesperado; interromper extração e conferir main.');
  process.exitCode=1;
 }
}
module.exports={inventory,gitBlobSha,readCurrent,suggestDomains};
