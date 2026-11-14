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
const dependencies=JSON.parse(fs.readFileSync(path.join(dir,'mapa-dependencias.json'),'utf8'));

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


test('dependências: todas as arestas têm origem/destino conhecidos e evidências verificáveis',()=>{
 const ids=new Set(roadmap.modules.map(m=>m.id));
 assert.deepEqual([...dependencies.moduleIds].sort(),[...ids].sort());
 assert.equal(dependencies.edges.length,25);
 assert.equal(dependencies.writeRisks.length,8);
 assert.equal(new Set(dependencies.edges.map(e=>e.id)).size,dependencies.edges.length);
 for(const edge of dependencies.edges){
  assert.ok(ids.has(edge.from),'origem inválida: '+edge.from);
  assert.ok(ids.has(edge.to),'destino inválido: '+edge.to);
  assert.notEqual(edge.from,edge.to,'autoreferência proibida no levantamento');
  assert.ok(['observado-no-codigo','proposto-a-validar'].includes(edge.status));
  if(edge.status==='observado-no-codigo'){
   assert.ok(edge.evidence&&edge.evidence.file&&Number.isInteger(edge.evidence.line));
   const lines=fs.readFileSync(path.join(root,edge.evidence.file),'utf8').split('\n');
   assert.ok(lines[edge.evidence.line-1]?.trim(),'evidência ausente em '+edge.evidence.file+':'+edge.evidence.line);
  } else {
   assert.equal(edge.evidence,null,'hipótese não pode ser apresentada como evidência');
  }
 }
 for(const item of dependencies.writeRisks){
  assert.ok(ids.has(item.module));
  assert.ok(item.followup);
  assert.ok(['P0','P1','P2'].includes(item.priority));
  const lines=fs.readFileSync(path.join(root,item.evidence.file),'utf8').split('\n');
  assert.ok(lines[item.evidence.line-1]?.trim());
 }
});

test('mapa HTML: a versão de dados embutida equivale à documentação e funciona sem rede',()=>{
 const match=html.match(/var depMap=(\{[\s\S]*?\});\nvar groups=/);
 assert.ok(match,'dados de dependências não incorporados ao protótipo');
 const embedded=JSON.parse(match[1]);
 assert.deepEqual(embedded,dependencies);
 assert.match(html,/data-page="dependencies"/);
 assert.match(html,/id="dep-module"/);
 assert.match(html,/id="dep-outgoing"/);
 assert.match(html,/id="dep-incoming"/);
 assert.match(html,/id="dep-write-risks"/);
 assert.match(html,/function renderDependencies\(\)/);
 assert.match(html,/grid-template-columns:repeat\(6,1fr\)/);
 assert.match(html,/dependency-grid/);
 assert.match(html,/Nenhum controle aqui consulta o banco ou executa gravações/);
});

test('controle mobile: navegação das seis áreas mantém todas as visualizações acessíveis',()=>{
 for(const tab of ['overview','modules','dependencies','laboratory','requests','quality']){
  const area=html.match(new RegExp('data-page="'+tab+'"','g'))||[];
  const menu=html.match(new RegExp('data-tab="'+tab+'"','g'))||[];
  assert.equal(area.length,1,'deve haver uma única seção '+tab);
  assert.equal(menu.length,2,'deve haver menu lateral e mobile: '+tab);
 }
 assert.match(html,/@media\(max-width:760px\)/);
 assert.match(html,/safe-area-inset-bottom/);
 assert.match(html,/dep-outgoing/);
 assert.match(html,/:focus-visible/);
});
