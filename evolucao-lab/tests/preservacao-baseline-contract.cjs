'use strict';
/*
 * Protege as funcionalidades já presentes na EVOLUÇÃO isolada.
 * NÃO é inventário completo nem aceite de equivalência com a main empresarial.
 * Novo código pode ACRESCENTAR comandos/áreas/scripts; a retirada dos
 * elementos protegidos requer migração explícita do contrato + homologação.
 */
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'contratos/preservacao-baseline-v1.json'),'utf8'));
const core=fs.readFileSync(path.join(root,'operacao-integrada-core.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'operacao-integrada-ui.js'),'utf8');
const html=fs.readFileSync(path.join(root,'operacao-integrada.html'),'utf8');
const cases=source=>[...source.matchAll(/^\s*case '([^']+)':/gm)].map(m=>m[1]);
const menus=source=>{
 const block=source.split('const modules=[')[1]?.split('\n];')[0];
 assert.ok(block,'Menu de 20 áreas não pode desaparecer');
 return [...block.matchAll(/^\s*\['([^']+)'/gm)].map(m=>m[1]);
};
const scripts=source=>[...source.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
function missing(expected,actual){return expected.filter(x=>!actual.includes(x))}
function inOrder(expected,actual){
 let next=0;for(const value of actual)if(value===expected[next])next++;
 return next===expected.length;
}
function auditFiles(current,{allowExtra=true}={}){
 const issues=[];
 for(const [key,expected,actual] of [
  ['comando',baseline.minimumCoreCommands,cases(current.core)],
  ['área',baseline.minimumAreaIds,menus(current.ui)],
  ['script',baseline.minimumScriptPathsInOrder,scripts(current.html)]
 ]){
  if(!Array.isArray(expected)||!expected.length)issues.push('Baseline de '+key+' vazia');
  if(new Set(expected).size!==expected.length)issues.push('Baseline de '+key+' duplicada');
  const removed=missing(expected,actual);
  if(removed.length)issues.push(key+' removido(s): '+removed.join(', '));
  if(new Set(actual).size!==actual.length)issues.push(key+' duplicado(s)');
  if(!allowExtra&&actual.length!==expected.length)issues.push(key+' não corresponde à quantidade original');
 }
 if(!inOrder(baseline.minimumScriptPathsInOrder,scripts(current.html)))
  issues.push('Ordem de scripts protegidos alterada: risco de módulo carregar antes das dependências');
 return issues;
}
test('O inventário de preservação usa somente a branch LAB e bloqueia qualquer liberação empresarial',()=>{
 assert.equal(baseline.schema,'hlgb-evolucao-preservacao-baseline-v1');
 assert.equal(baseline.scope,'laboratorio_ficticio_isolado');
 assert.equal(baseline.productionApproval,false);
 assert.equal(baseline.operationalAcceptancesApproved,0);
 assert.ok(baseline.reason.includes('NÃO comprova paridade'));
 assert.equal(baseline.minimumAreaIds.length,20);
 assert.equal(baseline.minimumCoreCommands.length,111);
 assert.equal(baseline.minimumScriptPathsInOrder.length,34);
});
test('Os 111 comandos e 20 áreas existentes não podem desaparecer, mesmo com módulos novos',()=>{
 const problems=auditFiles({core,ui,html});
 assert.deepEqual(problems,[],'Regressão nas funções já presentes na Evolução: '+problems.join(' | '));
 for(const area of baseline.minimumAreaIds)
  assert.match(ui,new RegExp("case '"+area+"':"),'Tela '+area+' continua implementada');
});
test('Os 34 scripts protegidos carregam uma só vez, existem e mantêm ordem segura',()=>{
 const current=scripts(html);
 assert.equal(new Set(current).size,current.length,'Duplicidade de script pode duplicar listener ou salvar duas vezes');
 for(const script of baseline.minimumScriptPathsInOrder){
  assert.ok(script.startsWith('./')&&!script.includes('..'),script+' não pode carregar código externo');
  assert.ok(fs.statSync(path.join(root,script)).isFile(),script+' não encontrado');
 }
 assert.ok(inOrder(baseline.minimumScriptPathsInOrder,current));
});
test('O contrato detecta exclusões de telas, comandos e scripts como falhas reais',()=>{
 const original={core,ui,html},first=baseline.minimumCoreCommands[0],
  area=baseline.minimumAreaIds[0],script=baseline.minimumScriptPathsInOrder[0];
 const withoutCommand={...original,core:core.replace("case '"+first+"':","case 'command.simulated_removed':")};
 assert.match(auditFiles(withoutCommand).join(' '),/comando removido/);
 const withoutArea={...original,ui:ui.replace("['"+area+"',","['area.simulated_removed',")};
 assert.match(auditFiles(withoutArea).join(' '),/área removido/);
 const withoutScript={...original,html:html.replace('<script src="'+script+'"></script>','')};
 assert.match(auditFiles(withoutScript).join(' '),/script removido/);
 const extraArea={...original,ui:ui.replace("const modules=[","const modules=[\n ['nova_area_ficticia','Apenas QA','Mais funções são permitidas'],")};
 assert.deepEqual(auditFiles(extraArea),[],'Evolução continua podendo ganhar áreas sem excluir nenhuma');
});
test('Porta de aceitação empresarial não depende de contagem de comandos, telas ou testes',()=>{
 const gate=fs.readFileSync(path.join(root,'CONTRATOS-ACEITE-OPERACIONAL-2026-11-18.md'),'utf8');
 assert.match(gate,/PENDENTE|0\/17/i);
 assert.doesNotMatch(gate,/17\/17 contratos aprovados/i);
 assert.doesNotMatch(core,/approvedForProduction\s*:\s*true/);
});
