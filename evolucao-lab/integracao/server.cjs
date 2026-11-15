'use strict';
// HLGB Evolução. SERVIDOR EXCLUSIVO PARA CI/LOCALHOST: NÃO EXPOR NA INTERNET OU USAR COM DADOS REAIS.
// Testa identidade de conexão, bytes de PDF, armazenamento privado e readback no banco descartável.
const http=require('node:http');
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {Client}=require('pg');
const DB_NAME='hlgb_permissoes_lab';
const ID_RE=/^[A-Za-z0-9_-]{3,90}$/;
const MAX_PDF=512*1024;
const MAX_BODY=750*1024;
const PIN_FIXTURES=Object.freeze({
  finA:{login:'hlab_fin_a',password:'ci_ficticio_fin_a',pin:'demo-fin-a',label:'Financeiro · Empresa A'},
  finB:{login:'hlab_fin_b',password:'ci_ficticio_fin_b',pin:'demo-fin-b',label:'Segundo financeiro · Empresa A'},
  other:{login:'hlab_fin_other',password:'ci_ficticio_fin_other',pin:'demo-other',label:'Financeiro · Empresa B'},
  operation:{login:'hlab_operation_a',password:'ci_ficticio_operation',pin:'demo-operation',label:'Operação · Empresa A'},
  viewer:{login:'hlab_viewer_a',password:'ci_ficticio_viewer',pin:'demo-viewer',label:'Consulta · Empresa A'},
  inactive:{login:'hlab_fin_inactive',password:'ci_ficticio_inactive',pin:'demo-inactive',label:'Funcionário desativado'}
});
const equal=(a,b)=>{
 const x=Buffer.from(a||''),y=Buffer.from(b||'');
 return x.length===y.length&&crypto.timingSafeEqual(x,y);
};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const isPdf=bytes=>bytes.length>16&&bytes.subarray(0,5).toString('ascii')==='%PDF-'&&
 /%%EOF\s*$/.test(bytes.subarray(-512).toString('latin1'));
const safeName=name=>typeof name==='string'&&name.length>=5&&name.length<=100&&
 !/[/\\\0\r\n]/.test(name)&&/\.pdf$/i.test(name);
const statusCode=status=>({denied:403,rejected:422,conflict:409,not_found:404}[status]||200);
function response(res,status,obj,headers={}){
 const data=Buffer.from(JSON.stringify(obj));
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':data.length,
 'cache-control':'no-store','x-content-type-options':'nosniff',...headers});
 res.end(data);
}
async function readJson(req){
 const pieces=[];let len=0;
 for await(const part of req){
  len+=part.length;
  if(len>MAX_BODY){const e=new Error('Corpo excede o limite da demonstração');e.httpStatus=413;throw e}
  pieces.push(part);
 }
 try{return JSON.parse(Buffer.concat(pieces).toString('utf8'))}catch{
  const e=new Error('JSON inválido');e.httpStatus=400;throw e;
 }
}
async function database(actor,fn){
 const client=new Client({host:'127.0.0.1',port:Number(process.env.PGPORT||5432),
 database:DB_NAME,user:actor.login,password:actor.password,connectionTimeoutMillis:4000});
 await client.connect();
 try{return await fn(client)}finally{await client.end()}
}
async function rpc(actor,functionName,params){
 const safe={
  preview_group:1,
  stage_receipt:5,
  pay_group:5,
  receipt_info:1,
  command_status:1
 };
 if(safe[functionName]!==params.length)throw Error('Função indisponível');
 const args=params.map((_,i)=>'$'+(i+1)).join(',');
 const typeCast=functionName==='stage_receipt'?'$1,$2,$3,$4::bigint,$5':
  functionName==='pay_group'?'$1,$2,$3::integer,$4,$5':args;
 try{
  const result=await database(actor,client=>client.query(
   'SELECT evolucao_access_lab.'+functionName+'('+typeCast+') AS result',params));
  return result.rows[0].result;
 }catch(e){
  if(e.code==='42501')return {status:'denied',message:'O perfil não tem permissão para esta operação.'};
  throw e;
 }
}
async function startServer(){
 if(process.env.PGDATABASE!==DB_NAME)throw Error('Serviço bloqueado fora de hlgb_permissoes_lab');
 const storage=await fs.mkdtemp(path.join(os.tmpdir(),'hlgb-evolucao-pdf-'));
 const sessions=new Map();
 const server=http.createServer(async(req,res)=>{
  const base='http://127.0.0.1:'+server.address().port;
  const reqUrl=new URL(req.url,base),method=req.method||'GET';
  const headers={'x-content-type-options':'nosniff','cache-control':'no-store',
   'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'",
   'x-frame-options':'DENY','referrer-policy':'no-referrer'};
  const send=(status,obj,extra={})=>response(res,status,obj,{...headers,...extra});
  try{
   if(req.headers.host!=='127.0.0.1:'+server.address().port){send(403,{status:'denied',message:'Host inválido'});return}
   if(method==='POST'&&(req.headers.origin!==base||req.headers['x-hlgb-demo-request']!=='1')){
    send(403,{status:'denied',message:'Requisição de origem inválida'});return;
   }
   if(method==='GET'&&['/','/app.js'].includes(reqUrl.pathname)){
    const file=reqUrl.pathname==='/'?'app.html':'client.js';
    const data=await fs.readFile(path.join(__dirname,file));
    res.writeHead(200,{...headers,'content-type':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8',
     'content-length':data.length});
    res.end(data);return;
   }
   if(method==='GET'&&reqUrl.pathname==='/api/health'){send(200,{status:'ok',mode:'isolated-local-demo'});return}
   const cookies=String(req.headers.cookie||'').split(';').map(x=>x.trim());
   const sessionCookie=cookies.find(x=>x.startsWith('hlgb_evolucao_session='));
   const token=sessionCookie?.slice('hlgb_evolucao_session='.length)||'';
   const found=sessions.get(token);
   const identity=found&&found.expires>Date.now()?PIN_FIXTURES[found.role]:null;
   if(method==='POST'&&reqUrl.pathname==='/api/login'){
    const body=await readJson(req),role=String(body.role||''),actor=PIN_FIXTURES[role];
    if(!actor||!equal(String(body.pin||''),actor.pin)){
     send(401,{status:'denied',message:'Credenciais fictícias inválidas'});return;
    }
    const id=crypto.randomBytes(32).toString('hex');
    sessions.set(id,{role,expires:Date.now()+30*60*1000});
    send(200,{status:'ok',role,label:actor.label},{
     'set-cookie':'hlgb_evolucao_session='+id+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800'});
    return;
   }
   if(method==='POST'&&reqUrl.pathname==='/api/logout'){
    sessions.delete(token);
    send(200,{status:'ok'},{
     'set-cookie':'hlgb_evolucao_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});return;
   }
   if(!identity){send(401,{status:'denied',message:'Faça o login fictício.'});return}
   if(method==='GET'&&reqUrl.pathname==='/api/session'){
    send(200,{status:'ok',role:found.role,label:identity.label});return;
   }
   if(method==='GET'&&reqUrl.pathname.startsWith('/api/groups/')){
    const groupId=decodeURIComponent(reqUrl.pathname.slice('/api/groups/'.length));
    if(!ID_RE.test(groupId)){send(400,{status:'rejected'});return}
    const data=await rpc(identity,'preview_group',[groupId]);
    send(statusCode(data.status),data);return;
   }
   if(method==='POST'&&reqUrl.pathname==='/api/upload'){
    const body=await readJson(req),id=String(body.id||''),name=body.name,mime=body.mime,base64=body.base64;
    if(!ID_RE.test(id)||!safeName(name)||mime!=='application/pdf'||
     typeof base64!=='string'||base64.length<24||base64.length>Math.ceil(MAX_PDF/3)*4+4||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)){
     send(422,{status:'rejected',message:'Nome, MIME ou conteúdo inválido'});return;
    }
    const bytes=Buffer.from(base64,'base64');
    if(bytes.length>MAX_PDF||!isPdf(bytes)){
     send(422,{status:'rejected',message:'Assinatura PDF ou tamanho inválido'});return;
    }
    const digest=hash(bytes);
    const filename=path.join(storage,id+'.pdf');
    let created=false;
    try{await fs.writeFile(filename,bytes,{flag:'wx',mode:0o600});created=true}
    catch(e){
     if(e.code!=='EEXIST')throw e;
     const existing=await fs.readFile(filename);
     if(!equal(hash(existing),digest)){send(409,{status:'rejected',message:'ID de upload já utilizado'});return}
    }
    try{
     const result=await rpc(identity,'stage_receipt',[id,name,digest,bytes.length,mime]);
     if(result.status==='staged'||result.status==='already_staged'){
      send(200,{status:result.status,id,size:bytes.length,sha256:digest});return;
     }
     if(created)await fs.unlink(filename);
     send(statusCode(result.status),result);
    }catch(e){if(created)await fs.unlink(filename).catch(()=>{});throw e}
    return;
   }
   if(method==='POST'&&reqUrl.pathname==='/api/pay'){
    const body=await readJson(req);
    const id=String(body.commandId||''),gid=String(body.groupId||'');
    if(!ID_RE.test(id)||!ID_RE.test(gid)||!Number.isInteger(body.revision)||
      !['PIX','Transferência','Dinheiro'].includes(body.method)||body.uploadId&&!ID_RE.test(body.uploadId)){
     send(422,{status:'rejected',message:'Campos inválidos'});return;
    }
    const upload=body.uploadId||null;
    if(upload){
     const pathToFile=path.join(storage,upload+'.pdf');
     let bytes;try{bytes=await fs.readFile(pathToFile)}catch{send(422,{status:'rejected',message:'PDF ainda não disponível no laboratório'});return}
     if(!isPdf(bytes)){send(422,{status:'rejected',message:'PDF inválido'});return}
    }
    const result=await rpc(identity,'pay_group',[id,gid,body.revision,body.method,upload]);
    if(result.status==='readback_confirmed'&&body.simulateLostAck===true){
     send(202,{status:'uncertain',commandId:id,message:'Resposta simulada perdida. Consulte o mesmo ID.'});return;
    }
    send(statusCode(result.status),result);return;
   }
   if(method==='GET'&&reqUrl.pathname.startsWith('/api/commands/')){
    const id=reqUrl.pathname.slice('/api/commands/'.length);
    if(!ID_RE.test(id)){send(400,{status:'rejected'});return}
    const result=await rpc(identity,'command_status',[id]);
    send(statusCode(result.status),result);return;
   }
   if(method==='GET'&&reqUrl.pathname.startsWith('/api/receipts/')){
    const id=reqUrl.pathname.slice('/api/receipts/'.length);
    if(!ID_RE.test(id)){send(400,{status:'rejected'});return}
    const metadata=await rpc(identity,'receipt_info',[id]);
    if(metadata.status!=='ok'){send(statusCode(metadata.status),metadata);return}
    let bytes;
    try{bytes=await fs.readFile(path.join(storage,id+'.pdf'))}
    catch{send(404,{status:'not_found',message:'Arquivo físico não encontrado'});return}
    if(!isPdf(bytes)||hash(bytes)!==metadata.sha256||bytes.length!==Number(metadata.size)){
     send(409,{status:'rejected',message:'Integridade do PDF diverge'});return;
    }
    res.writeHead(200,{...headers,'content-type':'application/pdf','content-length':bytes.length,
     'content-disposition':'attachment; filename="comprovante-demonstracao.pdf"'});
    res.end(bytes);return;
   }
   send(404,{status:'not_found',message:'Rota de teste não existe'});
  }catch(e){send(e.httpStatus||500,{status:'error',message:e.httpStatus?e.message:'Falha no serviço de laboratório'})}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 return {server,url:'http://127.0.0.1:'+server.address().port,storage,
  close:async()=>{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));sessions.clear();await fs.rm(storage,{recursive:true,force:true})}};
}
module.exports={startServer,PIN_FIXTURES};
if(require.main===module){
 startServer().then(x=>process.stdout.write('Laboratório local ativo: '+x.url+'\n'))
 .catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1});
}
