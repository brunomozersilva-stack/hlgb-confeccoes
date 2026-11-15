'use strict';
// TESTE LOCAL: duas sessões reais do navegador, banco PostgreSQL descartável.
// NÃO importar em código HLGB, NÃO fazer deploy, NÃO usar credenciais reais.
const http=require('node:http'),fs=require('node:fs/promises');
const crypto=require('node:crypto'),path=require('node:path'),{Client}=require('pg');
const DB='hlgb_sync_persist_lab',PORT_RE=/^[0-9]+$/,ID=/^TX-DEMO-[a-z0-9-]{8,72}$/;
const id='HUB-DEMO-001';
const maxBody=4096;
function mustBeIsolated(){
 if(process.env.PGDATABASE!==DB||process.env.PGHOST!=='127.0.0.1'||
 !PORT_RE.test(process.env.PGPORT||'')||!process.env.PGUSER||!process.env.PGPASSWORD)
 throw Error('Serviço recusado: requer PGDATABASE=hlgb_sync_persist_lab e PGHOST=127.0.0.1.');
}
const copy=x=>JSON.parse(JSON.stringify(x));
const makeClient=()=>new Client({host:'127.0.0.1',port:Number(process.env.PGPORT),user:process.env.PGUSER,
 password:process.env.PGPASSWORD,database:DB,ssl:false,connectionTimeoutMillis:4000});
async function database(fn){
 const client=makeClient();await client.connect();try{return await fn(client)}finally{await client.end()}
}
const validCommand=(cmd,actor)=>cmd&&typeof cmd==='object'&&!Array.isArray(cmd)&&
 Object.keys(cmd).sort().join(',')==='amountCents,commandId,expectedRevision,recordId'&&
 typeof cmd.commandId==='string'&&ID.test(cmd.commandId)&&cmd.recordId===id&&
 Number.isSafeInteger(cmd.amountCents)&&cmd.amountCents>=100&&cmd.amountCents<=1000000&&
 Number.isSafeInteger(cmd.expectedRevision)&&cmd.expectedRevision>=1&&cmd.expectedRevision<=100000000&&
 ['A','B'].includes(actor);
const fingerprint=(cmd,actor)=>crypto.createHash('sha256').update(JSON.stringify([
 'hub.set_value',actor,cmd.recordId,cmd.expectedRevision,cmd.amountCents])).digest('hex');
async function getRecord(){
 return database(async c=>{
  const record=(await c.query('SELECT id,amount_cents,revision,description FROM sync_lab.records WHERE id=$1',[id])).rows[0];
  const events=(await c.query('SELECT event_id,command_id,record_id,actor,before_cents,after_cents,revision FROM sync_lab.events ORDER BY event_id ASC')).rows;
  return {record:{id:record.id,amountCents:Number(record.amount_cents),revision:Number(record.revision),description:record.description},
   events:events.map(e=>({eventId:Number(e.event_id),commandId:e.command_id,actor:e.actor,
    recordId:e.record_id,beforeCents:Number(e.before_cents),afterCents:Number(e.after_cents),revision:Number(e.revision)}))};
 });
}
async function getCommand(commandId){
 return database(async client=>{
  const cmd=(await client.query('SELECT result FROM sync_lab.commands WHERE command_id=$1',[commandId])).rows[0];
  if(!cmd)return {status:'not_found',commandId,message:'Comando ainda não encontrado; não reenviar automaticamente.'};
  const ev=(await client.query('SELECT event_id,after_cents,revision FROM sync_lab.events WHERE command_id=$1',[commandId])).rows[0];
  const record=(await client.query('SELECT revision,amount_cents FROM sync_lab.records WHERE id=$1',[id])).rows[0];
  if(!ev||cmd.result.revision!==Number(ev.revision)||cmd.result.eventId!==Number(ev.event_id)||
    cmd.result.amountCents!==Number(ev.after_cents))
   return {status:'uncertain',commandId,message:'A prova do comando não corresponde ao evento de auditoria.'};
  return {status:'readback_confirmed',commandId,revision:Number(ev.revision),eventId:Number(ev.event_id),
   amountCents:Number(ev.after_cents),latestRevision:Number(record.revision),latestAmountCents:Number(record.amount_cents)};
 });
}
async function commit(cmd,actor){
 if(!validCommand(cmd,actor))return {status:'rejected',message:'Comando inválido para laboratório.'};
 const hash=fingerprint(cmd,actor);
 return database(async client=>{
  await client.query('BEGIN');
  try{
   // Serializa tentativas com o mesmo ID, inclusive entre processos/servidores de CI.
   await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[cmd.commandId]);
   const previous=(await client.query('SELECT fingerprint,result FROM sync_lab.commands WHERE command_id=$1 FOR UPDATE',[cmd.commandId])).rows[0];
   if(previous){
    await client.query('COMMIT');
    if(previous.fingerprint!==hash)return {status:'rejected',message:'Mesmo ID com conteúdo diferente: rejeitado sem alterações.'};
    return {status:'already_committed',commandId:cmd.commandId,revision:previous.result.revision,eventId:previous.result.eventId};
   }
   const rec=(await client.query('SELECT amount_cents,revision FROM sync_lab.records WHERE id=$1 FOR UPDATE',[id])).rows[0];
   if(Number(rec.revision)!==cmd.expectedRevision){
    await client.query('ROLLBACK');
    return {status:'conflict',commandId:cmd.commandId,serverRevision:Number(rec.revision),
     message:'Revisão antiga. Preserve o rascunho e compare com o registro atual.'};
   }
   const nextRev=Number(rec.revision)+1;
   const result={status:'committed',commandId:cmd.commandId,revision:nextRev,amountCents:cmd.amountCents};
   // Regra transacional: alteração, comando e evento são atômicos.
   const inserted=(await client.query('INSERT INTO sync_lab.commands(command_id,fingerprint,request,result) VALUES($1,$2,$3::jsonb,$4::jsonb)',
    [cmd.commandId,hash,JSON.stringify({...cmd,actor}),JSON.stringify(result)])).rowCount;
   if(inserted!==1)throw Error('Falha no registro imutável do comando.');
   await client.query('UPDATE sync_lab.records SET amount_cents=$1,revision=$2 WHERE id=$3',[cmd.amountCents,nextRev,id]);
   const ev=(await client.query('INSERT INTO sync_lab.events(command_id,record_id,actor,before_cents,after_cents,revision) VALUES($1,$2,$3,$4,$5,$6) RETURNING event_id',
    [cmd.commandId,id,actor,Number(rec.amount_cents),cmd.amountCents,nextRev])).rows[0];
   result.eventId=Number(ev.event_id);
   await client.query('UPDATE sync_lab.commands SET result=$1::jsonb WHERE command_id=$2',[JSON.stringify(result),cmd.commandId]);
   await client.query('COMMIT');
   return result;
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
 });
}
function json(res,status,data,security){
 const text=JSON.stringify(data),payload=Buffer.from(text,'utf8');
 res.writeHead(status,{...security,'content-type':'application/json; charset=utf-8','content-length':payload.length});
 res.end(payload);
}
async function body(req){
 const parts=[];let total=0;
 for await(const chunk of req){total+=chunk.length;if(total>maxBody){
  const err=Error('Corpo grande demais.');err.httpStatus=413;throw err
 }parts.push(chunk)}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{
  const err=Error('JSON inválido.');err.httpStatus=400;throw err
 }
}
const pins=Object.freeze({A:'demo-session-a',B:'demo-session-b'});
function fromCookie(cookie){
 return String(cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('hlgb_sync_lab='))?.slice('hlgb_sync_lab='.length)||'';
}
async function startServer(){
 mustBeIsolated();
 const test=await database(async c=>(await c.query('SELECT current_database() AS name')).rows[0].name);
 if(test!==DB)throw Error('Banco não autorizado.');
 const sessions=new Map();
 const server=http.createServer(async(req,res)=>{
  const port=server.address().port;
  const origin='http://127.0.0.1:'+port;
  const pathname=new URL(req.url,origin).pathname;
  const method=req.method;
  const security={'cache-control':'no-store','x-content-type-options':'nosniff',
   'referrer-policy':'no-referrer','x-frame-options':'DENY',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"};
  const send=(status,value,extra={})=>json(res,status,value,{...security,...extra});
  try{
   if(req.headers.host!=='127.0.0.1:'+port){send(403,{status:'denied',message:'Host não autorizado.'});return}
   if(method==='POST'&&(req.headers.origin!==origin||req.headers['x-hlgb-lab-request']!=='1')){
    send(403,{status:'denied',message:'Origem não autorizada.'});return;
   }
   if(method==='GET'&&(pathname==='/'||pathname==='/app.js')){
    const file=pathname==='/'?'app.html':'client.js';
    const bytes=await fs.readFile(path.join(__dirname,file));
    res.writeHead(200,{...security,'content-type':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8',
     'content-length':bytes.length});res.end(bytes);return;
   }
   if(method==='GET'&&pathname==='/api/health'){
    send(200,{status:'ok',database:'hlgb_sync_persist_lab',production:false});return;
   }
   const token=fromCookie(req.headers.cookie);
   const session=sessions.get(token);
   const actor=session&&session.expiry>Date.now()?session.actor:null;
   if(method==='POST'&&pathname==='/api/login'){
    const reqBody=await body(req);
    if(!['A','B'].includes(reqBody.actor)||typeof reqBody.pin!=='string'||
      reqBody.pin!==pins[reqBody.actor]){
     send(401,{status:'denied',message:'PIN fictício inválido.'});return;
    }
    const id=crypto.randomBytes(32).toString('hex');
    sessions.set(id,{actor:reqBody.actor,expiry:Date.now()+1800000});
    send(200,{status:'ok',actor:reqBody.actor},{'set-cookie':'hlgb_sync_lab='+id+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800'});return;
   }
   if(!actor){send(401,{status:'denied',message:'Faça o login fictício novamente.'});return}
   if(method==='GET'&&pathname==='/api/session'){send(200,{status:'ok',actor});return}
   if(method==='GET'&&pathname==='/api/state'){
    const view=await getRecord();send(200,{status:'ok',...view});return;
   }
   if(method==='GET'&&pathname.startsWith('/api/commands/')){
    const commandId=pathname.slice('/api/commands/'.length);
    if(!ID.test(commandId)){send(400,{status:'rejected',message:'ID inválido.'});return}
    const data=await getCommand(commandId);send(data.status==='not_found'?404:200,data);return;
   }
   if(method==='POST'&&pathname==='/api/commands'){
    const reqBody=await body(req);
    // Campo de falha estritamente de laboratório, não integra o comando persistido.
    const simulateLostAck=reqBody.simulateLostAck===true;
    const {simulateLostAck:ignored,...cmd}=reqBody;
    if(!validCommand(cmd,actor)){send(422,{status:'rejected',message:'Comando inválido.'});return}
    const result=await commit(cmd,actor);
    if(result.status==='committed'&&simulateLostAck){
     send(202,{status:'uncertain',commandId:cmd.commandId,message:'Commit aconteceu, ACK simulado perdido. Conferir pelo ID.'});return;
    }
    send(result.status==='conflict'?409:result.status==='rejected'?422:200,result);return;
   }
   send(404,{status:'not_found',message:'Rota local não existe.'});
  }catch(e){send(e.httpStatus||500,{status:'error',message:e.httpStatus?e.message:'Falha interna no laboratório.'})}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 return {url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve())),server};
}
module.exports={startServer,commit,getCommand,getRecord,mustBeIsolated};
if(require.main===module)startServer().then(s=>process.stdout.write('TESTE LOCAL: '+s.url+'\n')).catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1});
