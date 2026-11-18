'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const repo=path.resolve(root,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'paridade-critica-detalhada.json'),'utf8'));
const baseline=JSON.parse(fs.readFileSync(path.join(root,'paridade-funcional.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'paridade-critica.html'),'utf8');
const parent=fs.readFileSync(path.join(root,'preservacao.html'),'utf8');
test('43 cenários relacionados a 3 áreas, sem homologação e sem remoção',()=>{
 assert.equal(data.scenarios.length,43);
 const modules={acertos:22,faccoes:12,hub:9};
 const refs=new Set(baseline.cases.map(x=>x.id));
 const unique=new Set();
 for(const s of data.scenarios){
  assert.ok(modules[s.moduleId]!==undefined,'módulo inexistente: '+s.moduleId);
  assert.ok(!unique.has(s.id),'cenário duplicado: '+s.id);unique.add(s.id);
  assert.ok(refs.has(s.parityCaseId),'referência a função legado desconhecida: '+s.id);
  assert.equal(s.status,'pendente');
  assert.equal(s.new,'nao_homologado');
  assert.equal(s.approvedForRemoval,false);
  assert.ok(s.acceptance.length>20);
  assert.ok(s.mobileAcceptance.length>15);
  assert.ok(s.requires.includes('autorizacao_explicita'));
  assert.ok(['P0','P1'].includes(s.risk));
  const contents=fs.readFileSync(path.join(repo,s.source),'utf8').split('\n');
  assert.ok(contents[s.line-1]?.trim(),'referência de linha sem conteúdo: '+s.id+' '+s.source+':'+s.line);
 }
 for(const [name,count] of Object.entries(modules))
  assert.equal(data.scenarios.filter(x=>x.moduleId===name).length,count);
 assert.equal(data.scoping.currentProgramModified,false);
 assert.equal(data.scoping.productionDatabaseTouched,false);
 assert.equal(data.scoping.requiresApproval,true);
});
test('tela da matriz não contém acesso externo, dados reais ou gravação',()=>{
 assert.match(html,/<!doctype html>/i);
 assert.match(html,/<html lang="pt-BR">/);
 assert.match(html,/name="viewport"/);
 for(const banned of [/\bfetch\s*\(/,/\bWebSocket\b/,/\bXMLHttpRequest\b/,/\bEventSource\b/,/\bindexedDB\b/,/\blocalStorage\b/,/\bsessionStorage\b/,/\bcloudRequest\b/,/\bsupabase\b/i,/<script\b[^>]*\bsrc\s*=/i,/<link\b[^>]*\bhref\s*=/i]){
  assert.equal(banned.test(html),false,String(banned));
 }
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1]));
 assert.match(html,/@media\(max-width:580px\)/);
 assert.match(html,/:focus-visible/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/Sem.*homologação|Nenhum cenário foi homologado/);
 assert.match(parent,/href="\.\/paridade-critica\.html"/);
});
test('itens da matriz incorporados no HTML são exatamente os do inventário',()=>{
 const match=html.match(/const data=(\[[\s\S]*?\]);\nconst selected=/);
 assert.ok(match,'matriz embutida não encontrada');
 assert.deepEqual(JSON.parse(match[1]),data.scenarios);
});

test('matriz exibe provas parciais sem permitir aprovar ou gravar dados',()=>{
 const match=html.match(/const proofIndex=(\{[\s\S]*?\});\nconst label=/);assert.ok(match,'Provas embutidas ausentes');
 const index=JSON.parse(fs.readFileSync(path.join(root,'paridade-critica-evidencias-v1.json'),'utf8'));
 const visible=JSON.parse(match[1]),expected=Object.fromEntries(index.scenarios.filter(x=>x.evidence.length).map(x=>[x.id,[...new Set(x.evidence.map(e=>e.test))]]));
 assert.deepEqual(visible,expected);assert.equal(index.approval,false);assert.equal(index.scenarios.every(x=>x.humanApproval==='pendente'),true);
 assert.match(html,/id="kpi-proof"/);assert.match(html,/Ainda não homologado/);
});

test('conferência manual na tela não é homologação formal, não grava e permite exportar offline',()=>{
 assert.match(html,/id="review-export"/);
 assert.match(html,/function reviewPayload\(\)/);
 assert.match(html,/productionApproval:false,approvedForRemoval:false/);
 assert.match(html,/new Blob\(\[contents\]/);
 assert.match(html,/reviewResults=new Map\(\)/);
 assert.match(html,/sem_banco/);
});
