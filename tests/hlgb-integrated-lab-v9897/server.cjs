'use strict';
// A single localhost-only gateway for the existing SYNTHETIC PostgreSQL contracts.
// No commercial URLs, tokens, session storage, or business database credentials.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const pg={PGHOST:'127.0.0.1',PGPORT:'5432',PGDATABASE:'hlgb_fixture',PGUSER:'postgres',PGPASSWORD:'fixture_only'};
if(process.env.HLGB_LAB_ONLY!=='1'||Object.entries(pg).some(([k,v])=>process.env[k]!==v))throw Error('Banco descartável obrigatório');
const env={PATH:process.env.PATH,LANG:'C.UTF-8',...pg};
function sql(role,expr){if(!['postgres','fa_lab_operator','records_lab_operator','checklist_lab_operator'].includes(role))throw Error('role');const out=execFileSync('psql',['-X','-w','-qAt','-v','ON_ERROR_STOP=1'],{env,input:'set role '+role+';\nselect '+expr+';\n',encoding:'utf8',timeout:10000,maxBuffer:2*1024*1024,stdio:['pipe','pipe','pipe']}).trim();return out?JSON.parse(out):null}
if(sql('postgres',"to_jsonb((select id from hlgb_integrated_fixture.marker))")!=='synthetic-v9897')throw Error('Fixture não confirmada');
const q=x=>{if(typeof x!=='string'||!x||x.length>500)throw Error('texto');return "convert_from(decode('"+Buffer.from(x,'utf8').toString('hex')+"','hex'),'UTF8')"};
const j=x=>{const raw=JSON.stringify(x);if(!raw||raw.length>150000)throw Error('json');return "convert_from(decode('"+Buffer.from(raw).toString('hex')+"','hex'),'UTF8')::jsonb"};
const n=(x,min=0,max=1000000000000)=>{if(!Number.isSafeInteger(x)||x<min||x>max)throw Error('número');return String(x)};
const day=q('2026-11-27'),ref=x=>{if(typeof x!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(x))throw Error('referência');return q(x)};
const cut="'c1','o1','p1'",fexpr="coalesce((select jsonb_agg(jsonb_build_object('id',id,'revision',revision,'data',data) order by id) from fa_lab.records where module='factionPayments' and not deleted and (id in ('p1','p2') or data->>'manualGroupId'='av1')),'[]'::jsonb)";
function factions(){return sql('fa_lab_operator',fexpr)}
function account(){return sql('records_lab_operator',"jsonb_build_object('balance',(select to_jsonb(a) from records_lab.account_balances a where client_id='c'),'notes',(select jsonb_agg(jsonb_build_object('id',n.entity_id,'revision',n.revision,'data',n.data,'titleId',t.entity_id,'titleRevision',t.revision) order by n.data->>'issueDate',n.entity_id) from records_lab.hlgb_records n join records_lab.hlgb_records t on t.module='finance' and t.data->>'projectionInvoiceId'=n.entity_id where n.module='projectionInvoices' and n.data->>'clientId'='c' and n.deleted_at is null and t.deleted_at is null),'receipts',(select count(*) from records_lab.receipts where client_id='c'))")}
function checklist(){return {source:sql('checklist_lab_operator','checklist_lab.record_source('+cut+')'),history:sql('checklist_lab_operator','checklist_lab.list_record_checklists('+cut+')')}}
function readAccount(reference){return sql('records_lab_operator'," (select jsonb_build_object('receipt',r.result,'event',to_jsonb(e),'hub',h.data,'notes',"+ "(select coalesce(jsonb_agg(jsonb_build_object('id',x->>'noteId','remaining',n.data->>'remaining','titleRemaining',t.data->>'remaining','status',n.data->>'status','titleStatus',t.data->>'status','paidEvent',(select count(*) from jsonb_array_elements(n.data->'paymentHistory') ph where ph->>'globalPaymentReference9775'=r.ref))), '[]'::jsonb) from jsonb_array_elements(r.result->'allocations') x join records_lab.hlgb_records n on n.module='projectionInvoices' and n.entity_id=x->>'noteId' join records_lab.hlgb_records t on t.module='finance' and t.entity_id=x->>'titleId'),'hubCount',(select count(*) from records_lab.hlgb_records z where z.module='hubFinanceEntries' and z.data->>'sourceId'=r.ref and z.data->>'sourceType'='lab-global-receipt' and z.deleted_at is null),'account',(select to_jsonb(a) from records_lab.account_balances a where a.client_id='c')) from records_lab.receipts r join records_lab.account_receipt_events e on e.ref=r.ref join records_lab.hlgb_records h on h.module='hubFinanceEntries' and h.entity_id=r.result->>'hubId' and h.deleted_at is null where r.ref="+ref(reference)+" and r.client_id='c')")}
function operation(op,x){
 if(op==='state')return {factions:factions(),account:account(),checklist:checklist()};
 if(!x||typeof x!=='object')throw Error('input');
 if(op==='adjust'){
  const a=sql('fa_lab_operator',"fa_lab.adjust('p1',"+ref(x.ref)+','+n(x.revision,1)+',2,'+n(x.qty,1)+','+n(x.rate,1)+','+q(x.reason)+')');
  const after=factions().find(r=>r.id==='p1');if(!after||after.revision!==a.revision||after.data.quantity!==100||after.data.settlementAdjustmentV9879?.reference!==x.ref||Math.round(Number(after.data.value)*100)!==a.adjustment.totalCents)throw Error('conferência não confirmada');return {confirmed:true,result:a};
 }
 if(op==='extra'){
  if(x.confirmedDelivery!==true)throw Error('delivery');
  const a=sql('fa_lab_operator','fa_lab.extra('+q(x.id||'extra:'+x.ref)+','+ref(x.ref)+','+n(x.revision)+','+q(x.name)+','+n(x.qty,1)+','+n(x.rate,1)+')'),after=factions().find(r=>r.id===a.id);
  if(!after||after.revision!==a.revision||Math.round(Number(after.data.value)*100)!==x.qty*x.rate||after.data.description!==x.name.trim()||after.data.manualDeliveryDateV9875!=='2026-11-27')throw Error('conferência não confirmada');return {confirmed:true,result:a};
 }
 if(op==='settle'){
  if(x.reviewed!==true||!Array.isArray(x.items))throw Error('review');
  const a=sql('fa_lab_operator',"fa_lab.weekly_settle('m1','2026-11-23',"+ref(x.ref)+','+day+",'PIX',"+j(x.items)+','+n(x.amount,1)+')'),read=sql('fa_lab_operator',"fa_lab.read_weekly('m1',"+ref(x.ref)+')');
  if(!read||read.currentMatch!==true||read.hub.amountCents!==a.amountCents||read.rows.length!==a.paidCount)throw Error('conferência não confirmada');return {confirmed:true,result:read};
 }
 if(op==='receive'){
  if(x.reviewed!==true||!Array.isArray(x.selected))throw Error('review');
  const a=sql('records_lab_operator',"records_lab.pay_account('c',"+ref(x.ref)+','+day+",'Pix',"+n(x.amount,1)+','+j(x.selected)+','+n(x.revision,1)+',true)'),r=readAccount(x.ref);
  if(!r||r.receipt.reference!==x.ref||r.receipt.amountCents!==x.amount||r.hubCount!==1||r.hub.status!=='Realizado'||r.hub.flow!=='Entrada'||Math.round(Number(r.hub.value)*100)!==x.amount||r.event.after_cents!==a.independentAfterCents||r.account.revision!==a.accountRevision||r.account.independent_cents!==a.independentAfterCents||r.notes.length!==a.allocations.length||a.allocations.some(i=>!r.notes.some(v=>v.id===i.noteId&&Math.round(Number(v.remaining)*100)===i.remainingCents&&v.remaining===v.titleRemaining&&v.status===v.titleStatus)))throw Error('conferência não confirmada');return {confirmed:true,result:r};
 }
 if(op==='checklist'){
  if(!x.payload||!x.revisions||!Array.isArray(x.payload.lines))throw Error('input');
  const a=sql('checklist_lab_operator','checklist_lab.save_record_checklist('+cut+','+j(x.revisions)+','+n(x.version)+','+ref(x.ref)+','+j(x.payload)+')'),r=sql('checklist_lab_operator','checklist_lab.read_record_checklist('+cut+','+n(a.version,1)+')');
  if(!r||r.result.requestId!==x.ref||r.result.version!==x.version+1||r.result.officialSeparationChanged!==false||r.result.responsible!==x.payload.responsible||r.result.lines.length!==x.payload.lines.length||x.payload.lines.some(l=>!r.result.lines.some(k=>k.key===l.key&&k.actual===l.actual&&k.checked===l.checked&&k.note===l.note)))throw Error('conferência não confirmada');return {confirmed:true,result:r};
 }
 throw Error('ação desconhecida');
}
const files={'/':['index.html','text/html;charset=utf-8'],'/app.js':['app.js','application/javascript;charset=utf-8'],'/style.css':['style.css','text/css;charset=utf-8']};
const token=crypto.randomBytes(24).toString('hex');const port=Number(process.env.HLGB_LAB_PORT||4187);if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('port');
const server=http.createServer(async(req,res)=>{
 const respond=(status,v)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(v))};
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.headers.host!=='127.0.0.1:'+port)return respond(403,{error:'localhost'});
 if(req.method==='GET'&&files[req.url]){const [file,type]=files[req.url];res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,file),'utf8').replace(file==='index.html'?'__TOKEN__':'__UNUSED__',token))}
 if(req.method!=='POST'||req.url!=='/api'||req.headers.origin!=='http://127.0.0.1:'+port||req.headers['x-hlgb-lab']!==token||req.headers['content-type']!=='application/json')return respond(403,{error:'local fixture only'});
 try{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>160000)throw Error('body')};const v=JSON.parse(raw);return respond(200,operation(v.op,v.input))}
 catch(e){return respond(409,{error:'Operação de laboratório não confirmada. Confira os dados e a referência.',detail:String(e.stderr||e.message||'').slice(0,220)})}
});
server.listen(port,'127.0.0.1',()=>console.log('HLGB laboratório único http://127.0.0.1:'+port));
