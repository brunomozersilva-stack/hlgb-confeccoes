'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process'),{chromium,webkit}=require('playwright');
const dir='tests/cut-checklist-postgres-v9826';
// CI-only gateway: fixed role and parameter encoding, never exposed in commercial pages.
const quote=x=>x==null?'null':"convert_from(decode('"+Buffer.from(String(x),'utf8').toString('hex')+"','hex'),'UTF8')";
const json=x=>quote(JSON.stringify(x))+'::jsonb';
const integer=x=>Number.isSafeInteger(x)&&x>=0?String(x):(()=>{throw Error('integer')})();
function sql(role,statement){if(!['checklist_lab_operator','checklist_lab_operator2'].includes(role))throw Error('role');const out=execFileSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],{input:'set role '+role+';\nselect '+statement+';\n',encoding:'utf8'}).trim();return out?JSON.parse(out):null}
function call(role,name,x){
 const i=[x.cutId,x.orderId,x.productId].map(quote).join(',');
 switch(name){
 case 'source':return sql(role,'checklist_lab.record_source('+i+')');
 case 'list':return sql(role,'checklist_lab.list_record_checklists('+i+')');
 case 'read':return sql(role,'checklist_lab.read_record_checklist('+i+','+integer(x.version)+')');
 case 'save':return sql(role,'checklist_lab.save_record_checklist('+i+','+json(x.revisions)+','+integer(x.expectedVersion)+','+quote(x.requestId)+','+json(x.payload)+')');
 case 'attach':return sql(role,'checklist_lab.attach_record_file('+i+','+integer(x.version)+','+quote(x.name)+','+quote(x.mime)+','+quote(x.sha)+",decode('"+Buffer.from(x.bytes).toString('hex')+"','hex'))");
 case 'listFiles':return sql(role,'checklist_lab.list_record_attachments('+i+','+integer(x.version)+')');
 default:throw Error('unknown operation');
 }
}
(async()=>{
 const engine=process.env.HLGB_BROWSER==='webkit'?webkit:chromium,b=await engine.launch();
 const init=async(role)=>{
  const p=await b.newPage({viewport:{width:390,height:900}});
  await p.route('**/*',r=>r.request().url()==='http://localhost:9876/checklist'?r.fulfill({status:200,contentType:'text/html',body:'<html><body></body></html>'}):r.abort());
  await p.goto('http://localhost:9876/checklist');
  const html=fs.readFileSync('app9240.html','utf8'),at=html.indexOf('<section id="corte" class="page">'),end=html.indexOf('</section>',at);
  await p.setContent(html.slice(at,end+10).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  let failAttachment=role==='checklist_lab_operator';
  await p.exposeFunction('fixtureRpc',(name,x)=>{if(name==='attach'&&failAttachment){failAttachment=false;throw Error('fixture upload interrupted');}return call(role,name,x)});
  await p.evaluate(()=>{
   document.querySelector('#corte').classList.add('active');window.__HLGB_AUTH_READY=true;window.canOpenPage=()=>true;window.currentUser=()=>({id:'fixture-user',active:true});window.renderCuts=()=>{};window.hlgbWriteoffIntegrity9391={pairIndex:()=>new Set()};
   const grade=[['Preto','P',120],['Branco','M',60],['Rubi','G',120]].map(([color,size,qty])=>({productId:'p1',color,size,qty}));
   window.db={orders:[{id:'o1',orderNumber:1,status:'Separação',grade}],cuts:[{id:'c1',orderId:'o1',productId:'p1',status:'Planejado',pieces:300,actualCutGrade:grade}],products:[{id:'p1',name:'Modelo fictício',materials:[{materialId:'m1',name:'Papiro',qty:.08,unit:'m'},{materialId:'m2',name:'Tule',qty:0,unit:'m'},{materialId:'m3',name:'Alpinia',qty:.6,unit:'m'}]}],materials:[{id:'m1',name:'Papiro',unit:'m'},{id:'m2',name:'Tule',unit:'m'},{id:'m3',name:'Sanduiche 16',unit:'m'}],cutters:[],separations:[],production:[],operationalWriteoffs:[]};
   const card=document.createElement('article');card.dataset.hlgbCutModelId='c1';document.querySelector('#corte').appendChild(card);window.__before=JSON.stringify(db);
  });
  await p.addScriptTag({path:'hlgb-modules/producao/cut-separation-core-v9647.js'});
  await p.addScriptTag({path:dir+'/client-confirmation.cjs'});
  await p.addScriptTag({path:dir+'/candidate-ui.cjs'});
  await p.evaluate(()=>window.HLGBChecklistCandidate9835.install(Object.fromEntries(['source','list','read','save','attach','listFiles'].map(n=>[n,x=>window.fixtureRpc(n,x)]))));
  await p.addScriptTag({path:'release-cut-organization.js'});
  await p.evaluate(()=>window.hlgbCutOrganization.openFullCutChecklist9820('c1'));
  await p.getByRole('button',{name:'Conferir quantidades por cor'}).click();
  return p;
 };
 try{
 const a=await init('checklist_lab_operator');
 await a.getByText('Histórico disponível na homologação.').waitFor();
 await a.getByLabel('Responsável pela conferência').fill('Operador A');
 await a.getByLabel('Quantidade separada — Papiro — Branco').fill('4');
 await a.getByLabel('Quantidade separada — Papiro — Preto').fill('9,6');
 await a.locator('[data-hlgb-conference-docs9834] input[type=file]').setInputFiles({name:'folha.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 fixture')});
 await a.getByText('Arquivo selecionado apenas nesta sessão. Ainda não enviado.').waitFor();
 await a.getByRole('button',{name:'Salvar conferência na homologação'}).click();
 await a.getByText('Gravação não confirmada. Confira os dados e tente novamente.').waitFor();
 assert.equal(call('checklist_lab_operator','list',{cutId:'c1',orderId:'o1',productId:'p1'}).length,1);
 await a.getByRole('button',{name:'Fechar checklist'}).click();
 await a.evaluate(()=>window.hlgbCutOrganization.openFullCutChecklist9820('c1'));
 await a.getByRole('button',{name:'Conferir quantidades por cor'}).click();
 await a.getByText('Gravação anterior pendente. Repita sem alterar o rascunho.').waitFor();
 await a.getByRole('button',{name:'Salvar conferência na homologação'}).click();
 await a.getByText('Conferência e documentos confirmados — versão 1.').waitFor();
 assert.equal(call('checklist_lab_operator','list',{cutId:'c1',orderId:'o1',productId:'p1'}).length,1);
 assert.equal(await a.evaluate(()=>JSON.stringify(db)===window.__before),true);
 const second=await init('checklist_lab_operator2');
 await second.getByRole('button',{name:'Consultar versão 1'}).click();
 await second.getByText('Documento confirmado: folha.pdf').waitFor();
 assert.match(await second.locator('[data-hlgb-persistence9835]').innerText(),/Papiro · Branco · separado 4 · falta 0.8 m/);
 assert.equal(call('checklist_lab_operator2','read',{cutId:'c1',orderId:'o1',productId:'p1',version:1}).actor,'checklist_lab_operator');
 assert.equal(await second.evaluate(()=>JSON.stringify(db)===window.__before),true);
 console.log('PASS real PostgreSQL save/read, second browser, per-color shortage, file, original DB unchanged');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
