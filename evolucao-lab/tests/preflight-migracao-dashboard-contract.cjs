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
const make=()=>vm.runInNewContext(markup+'\n({run:migrationPreflightMarkup,set:function(x){migrationPreflightExample=x},fixture:migrationPreflightFixture})',{
 window:browser,str:esc,
 table:(headers,rows)=>'<table>'+headers.map(esc).join(' · ')+rows.map(row=>'<tr>'+row.join('|')+'</tr>').join('')+'</table>',
 panel:(title,txt)=>'<section>'+esc(title)+txt+'</section>'
});
test('arquivo browser é gerado de modo determinístico a partir do motor CJS',()=>{
 assert.equal(bundled,build());
 assert.equal(typeof browser.HLGBLabMigrationPreflightV1.compare,'function');
 assert.equal(typeof browser.HLGBLabMigrationPreflightV1.review,'function');
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
