'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const build=require('../migracao/build-preflight-browser.cjs').build;
const bundled=fs.readFileSync(path.join(root,'modulos/preflight-migracao-browser-v1.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'operacao-integrada-ui.js'),'utf8');
const html=fs.readFileSync(path.join(root,'operacao-integrada.html'),'utf8');
const browser={};
vm.runInNewContext(bundled,{window:browser});
const start=ui.indexOf("let migrationPreflightExample='documentado';");
const end=ui.indexOf("\nlet auditFilter='todos';",start);
assert.ok(start>=0&&end>start,'painel de preflight localizado');
const markup=ui.slice(start,end);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
const make=()=>{
 let downloaded=null;
 const controller=vm.runInNewContext(markup+'\n({run:migrationPreflightMarkup,set:function(x){migrationPreflightExample=x},setCustom:function(x){migrationPreflightCustom=x},fixture:migrationPreflightFixture,exportCsv:exportMigrationPreflightDemo})',{
  window:browser,str:esc,fmt:n=>'R$ '+(Number(n)/100).toFixed(2).replace('.',','),
  table:(headers,rows)=>'<table>'+headers.map(esc).join(' · ')+rows.map(row=>'<tr>'+row.join('|')+'</tr>').join('')+'</table>',
  panel:(title,txt)=>'<section>'+esc(title)+txt+'</section>',
  download:(name,content,type)=>{downloaded={name,content,type};}
 });
 return {...controller,getDownload:()=>downloaded};
};
test('arquivo browser é gerado de modo determinístico a partir do motor CJS',()=>{
 assert.equal(bundled,build());
 assert.equal(typeof browser.HLGBLabMigrationPreflightV1.compare,'function');
 assert.equal(typeof browser.HLGBLabMigrationPreflightV1.review,'function');
 assert.equal(typeof browser.HLGBLabMigrationPreflightV1.buildDossier,'function');
 assert.ok(html.includes('<script src="./modulos/preflight-migracao-browser-v1.js"></script>'));
 assert.ok(html.indexOf('preflight-migracao-browser-v1.js')<html.indexOf('operacao-integrada-ui.js'));
});
test('mesmo motor de backend: conclusão bloqueada e nenhum comando ou pagamento',()=>{
 const pane=make(),before=JSON.stringify(pane.fixture('documentado'));
 const result=browser.HLGBLabMigrationPreflightV1.review(...Object.values(pane.fixture('documentado')));
 assert.equal(result.grade.gradeEquivalent,true);
 assert.equal(result.canExecute,false);
 assert.equal(result.canPay,false);
 assert.equal(result.readyForCommercialMigration,false);
 const h=pane.run();
 assert.match(h,/MIGRAÇÃO BLOQUEADA/);
 assert.match(h,/150 peças/);
 assert.match(h,/COR-EXEMPLO-01|MODELO-CAMISOLA-TESTE/);
 assert.equal(JSON.stringify(pane.fixture('documentado')),before);
});
test('4 cenários com resultados distintos sem se conectar ao sistema comercial',()=>{
 const pane=make(),checks=[
  ['documentado',['HISTORICO_OPERACIONAL_EXISTENTE']],
  ['duplicado',['FINANCEIRO_DIVERGENTE','ACERTO_TITULO_INCONSISTENTE','TITULO_PAGO']],
  ['divergente',['GRADE_OU_CLIENTE_DIVERGENTE','FACCAO_TROCADA_SEM_PROVA','RETORNO_PARCIAL_EXCESSIVO']],
  ['semprovas',['COLECAO_NAO_CONFERIDA','ENVIO_SEM_FOLHA_ID','RETORNO_SEM_ENVIO_ID']]
 ];
 for(const [scenario,codes] of checks){
  pane.set(scenario);
  const h=pane.run(),d=pane.fixture(scenario);
  const r=browser.HLGBLabMigrationPreflightV1.review(d.legacy,d.prepared,d.evidence);
  assert.match(h,/MIGRAÇÃO BLOQUEADA/,scenario);
  assert.match(h,new RegExp('data-preflight-example="'+scenario+'" aria-pressed="true"'));
  for(const code of codes)assert.ok(r.findings.some(f=>f.code===code),scenario+' precisa de '+code);
  assert.equal(r.canChangeStock,false);
 }
});
test('dossiê apresenta todos os documentos pelos IDs sem fabricar correspondências',()=>{
 const pane=make(),d=pane.fixture('documentado'),p=browser.HLGBLabMigrationPreflightV1;
 const report=p.buildDossier(d.legacy,d.prepared,d.evidence);
 assert.equal(report.grade.gradeEquivalent,true);
 assert.equal(report.records.length,6);
 assert.equal(report.counters.identified,6);
 assert.equal(report.counters.missing,0);
 for(const id of ['COR-EXEMPLO-01','ENV-EXEMPLO-01','RET-EXEMPLO-01',
  'ACE-EXEMPLO-01','PAG-EXEMPLO-01','REC-EXEMPLO-01'])
  assert.ok(report.records.some(r=>r.id===id),'Preservar documento original '+id);
 assert.ok(report.modelMap.some(x=>x.targetItemId==='ITM-001'));
 const page=pane.run();
 assert.match(page,/Dossiê dos documentos originais/);
 assert.match(page,/RET-EXEMPLO-01/);
 assert.match(page,/Fila de conferência/);
 assert.match(page,/Referências identificadas/);
 assert.match(page,/MIGRAÇÃO BLOQUEADA/);
 assert.equal(report.canExecute,false);
});
test('dossiê exporta CSV com identidade de documentos, pendências e títulos já pagos',()=>{
 const pane=make();
 pane.set('duplicado');
 const filename=pane.exportCsv(),file=pane.getDownload();
 assert.match(filename,/FICTICIA-duplicado/);
 for(const marker of ['DOCUMENTO_ORIGINAL','MAPA_MODELO','PENDENCIA',
  'PAG-EXEMPLO-02','ACERTO_TITULO_INCONSISTENTE','TITULO_PAGO'])
  assert.match(file.content,new RegExp(marker));
 assert.doesNotMatch(file.content,/Migrac[aã]o aprovada/i);
});
test('exportação CSV gera apenas evidência fictícia de bloqueio e divergências',()=>{
 const pane=make();
 pane.set('divergente');
 const name=pane.exportCsv(),file=pane.getDownload();
 assert.match(name,/FICTICIA-divergente\.csv$/);
 assert.equal(file.name,name);
 assert.match(file.type,/text\/csv/);
 assert.match(file.content,/MIGRACAO_BLOQUEADA/);
 assert.match(file.content,/DIFERENCA_GRADE/);
 assert.match(file.content,/GRADE_OU_CLIENTE_DIVERGENTE/);
 assert.doesNotMatch(file.content,/aprovada para produção/i);
 assert.match(pane.run(),/data-preflight-export="csv"/);
});
test('prévia JSON fictícia personalizada não exige dados comerciais nem muda registros',()=>{
 const pane=make(),draft={
  legacy:{id:'LEG-FICTICIO',clientId:'CLI-FICTICIO',
   grade:[{productId:'MODELO-TESTE',color:'Preto',size:'P',qty:10}]},
  prepared:{id:'PDM-FICTICIO',clientId:'CLI-FICTICIO',sizes:['P'],
   items:[{id:'ITM-001',productId:'MODELO-TESTE',qty:10,
    priceCents:1000,amountCents:10000,colors:[{color:'Preto',grade:{P:10}}]}],
   totals:{pieces:10,amountCents:10000}},
  evidence:{orderId:'LEG-FICTICIO',cuts:[],allocations:[],settlements:[],finance:[]}
 },before=JSON.stringify(draft);
 pane.setCustom(draft);pane.set('personalizado');
 const result=browser.HLGBLabMigrationPreflightV1.review(draft.legacy,draft.prepared,draft.evidence);
 assert.equal(result.grade.gradeEquivalent,true);
 assert.match(pane.run(),/Minha prévia fictícia/);
 assert.match(pane.run(),/10 peças/);
 const file=pane.exportCsv();
 assert.match(file,/FICTICIA-personalizado/);
 assert.equal(result.canExecute,false);
 assert.equal(JSON.stringify(draft),before);
});
test('painel escapa dados e não contém escrita de documento ou rede',()=>{
 assert.doesNotMatch(markup,/\bfetch\s*\(|\bindexedDB\b|\blocalStorage\b|\bXMLHttpRequest\b|\bapi\.apply\s*\(|\bsubmit\s*\(/);
 assert.match(ui,/migrationPreflightPanel\(\)/);
 assert.match(ui,/document\.addEventListener\('click',async e=>\{/);
 assert.match(ui,/data-preflight-example/);
 const pane=make(),demo=pane.fixture('documentado');
 demo.evidence.settlements[0].id='<script>alert(1)</script>';
 demo.evidence.finance[0].sourceId=demo.evidence.settlements[0].id;
 const r=browser.HLGBLabMigrationPreflightV1.review(demo.legacy,demo.prepared,demo.evidence);
 assert.equal(r.canExecute,false);
});
