'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.resolve(__dirname,'..');
const root=path.resolve(dir,'..');
const html=fs.readFileSync(path.join(dir,'prototipo.html'),'utf8');
const roadmap=JSON.parse(fs.readFileSync(path.join(dir,'roadmap.json'),'utf8'));
const readme=fs.readFileSync(path.join(dir,'README.md'),'utf8');

test('inventário: 266 itens contínuos, sem números perdidos, e 19 módulos únicos',()=>{
 assert.equal(roadmap.itemCount,266);
 const ranges=roadmap.groups.slice().sort((a,b)=>a.start-b.start);
 let cursor=1;
 for(const group of ranges){
  assert.equal(group.start,cursor,'número ausente antes de '+group.label);
  assert.equal(group.end-group.start+1,group.items);
  assert.equal(group.completed,0,'nenhuma melhoria operacional foi homologada');
  cursor=group.end+1;
 }
 assert.equal(cursor,267);
 assert.equal(roadmap.modules.length,19);
 assert.equal(new Set(roadmap.modules.map(m=>m.id)).size,roadmap.modules.length);
});

test('rastreabilidade: referências de código existem no repositório, mas seguem pendentes de validação',()=>{
 for(const module of roadmap.modules){
  assert.equal(module.realDataAccess,false);
  assert.equal(module.activation,'somente_simulacao');
  assert.equal(module.stage,'inventario_inicial');
  for(const filename of module.evidence){
   assert.equal(fs.existsSync(path.join(root,filename)),true,
    module.name+': falta fonte de inventário '+filename);
  }
 }
});

test('HTML standalone: sem serviço externo, banco de dados, armazenamento local ou anexação ao programa',()=>{
 assert.match(html,/<!doctype html>/i);
 assert.match(html,/<html lang="pt-BR">/);
 assert.match(html,/name="viewport"/);
 const forbidden=[
  /<script\b[^>]*\bsrc\s*=/i,
  /<link\b[^>]*\bhref\s*=/i,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\bnavigator\s*\.\s*serviceWorker\b/,
  /\bwindow\s*\.\s*indexedDB\b/,
  /\blocalStorage\s*\./,
  /\bsessionStorage\s*\./,
  /\bdocument\s*\.\s*cookie\b/,
  /https?:\/\/[^/]+/i,
  /\bcloudRequest\s*\(/,
  /\bhlgbRecordSaveWithRetry\s*\(/
 ];
 for(const regex of forbidden)assert.equal(regex.test(html),false,'laboratório contém acesso externo: '+regex);
 for(const name of ['index.html','app-stable3.html','app9240.html']){
  const original=fs.readFileSync(path.join(root,name),'utf8');
  assert.equal(original.includes('evolucao-lab'),false,name+' não pode integrar a Evolução nesta etapa');
 }
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:'prototipo-standalone.js'}));
});

test('mobile e acessibilidade: navegação, prévia de cinco funcionários, responsividade',()=>{
 assert.match(html,/@media\s*\(max-width:760px\)/);
 assert.match(html,/safe-area-inset-bottom/);
 assert.match(html,/prefers-reduced-motion/);
 assert.match(html,/:focus-visible/);
 assert.match(html,/<nav class="bottom-nav"/);
 for(const tab of ['overview','modules','laboratory','requests','quality'])
  assert.match(html,new RegExp('data-page="'+tab+'"'));
 for(const role of ['embaladeira','cortador','faccao','financeiro','admin'])
  assert.match(html,new RegExp('<option value="'+role+'">'));
 assert.match(html,/<a class="skip"/);
 assert.match(html,/aria-live="polite"/);
});

test('controle protegido: núcleo financeiro não oferece desativação real e protótipo não persiste solicitações',()=>{
 for(const id of ['nucleo','autenticacao','faccoes','acertos','hub','folha'])
  assert.match(html,new RegExp('\\["'+id+'",[^\\n]*,true\\]'));
 assert.match(html,/button\.disabled=m\[4\]/);
 assert.match(html,/simulated=new Set/);
 assert.match(html,/não foi enviada nem salva|NÃO foi enviada nem salva/);
 assert.match(readme,/Aprovação explícita/);
 assert.equal(roadmap.safety.currentApplicationModified,false);
 assert.equal(roadmap.safety.databaseWrites,false);
 assert.equal(roadmap.safety.requiresExplicitApprovalForRelease,true);
});
