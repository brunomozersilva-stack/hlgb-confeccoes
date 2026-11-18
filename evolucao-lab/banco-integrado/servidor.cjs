'use strict';
// Serviço de homologação LOCAL, exclusivo para dados fictícios e perfis de CI.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),db=require('./persistencia.cjs');
const permissions=require('./permissoes-lab.cjs'),productionView=require('./leitura-producao.cjs');
const root=path.resolve(__dirname,'..'),pins={A:'demo-integrado-a',B:'demo-integrado-b'},actors={A:'Operador A fictício',B:'Operador B fictício'};
const allowed=new Set(['operacao-integrada.html','operacao-integrada-core.js','operacao-integrada-ui.js','folha-homologacao.html','producao-integrada.html']);
const modules=/^modulos\/[a-z0-9-]+\.js$/;
const login=csrf=>'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>HLGB laboratório remoto</title><h1>HLGB Evolução — banco fictício</h1><p>Somente teste local. Sem dados reais.</p><form method="post" action="/login"><input type="hidden" name="csrf" value="'+csrf+'"><label>Perfil <select name="actor"><option>A</option><option>B</option></select></label><label> PIN fictício <input name="pin" type="password" required></label><button>Entrar</button></form></html>';
async function body(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)throw Error('Corpo excede limite');chunks.push(chunk);}return Buffer.concat(chunks).toString('utf8');}
async function start(port=0){
 db.guard();await db.initialize();const sessions=new Map(),loginTokens=new Map();
 const server=http.createServer(async(req,res)=>{
 const base='http://127.0.0.1:'+server.address().port,headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; object-src 'none'; frame-ancestors 'none'; form-action 'self'"};
 const send=(code,data,extra={})=>{res.writeHead(code,{...headers,'content-type':'application/json;charset=utf-8',...extra});res.end(JSON.stringify(data));};
 try{
 if(req.headers.host!==base.slice(7)){send(403,{status:'denied'});return;}
 const url=new URL(req.url,base),route=url.pathname,method=req.method;
 if(method==='POST'&&route!=='/login'&&(req.headers['x-hlgb-integrado']!=='1'||req.headers.origin&&req.headers.origin!==base||req.headers['content-type']!=='application/json')){send(403,{status:'denied'});return;}
 if(route==='/login'&&method==='GET'){const csrf=crypto.randomBytes(24).toString('hex');loginTokens.set(csrf,Date.now()+300000);res.writeHead(200,{...headers,'content-type':'text/html;charset=utf-8','set-cookie':'hlgb_login_csrf='+csrf+'; Path=/login; HttpOnly; SameSite=Strict; Max-Age=300'});res.end(login(csrf));return;}
 if(route==='/login'&&method==='POST'){
 const form=new URLSearchParams(await body(req)),key=form.get('actor'),csrf=form.get('csrf'),cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('hlgb_login_csrf='))?.slice('hlgb_login_csrf='.length);
 const csrfError=!csrf?'missing_form_token':!cookie?'missing_cookie':csrf!==cookie?'cookie_mismatch':!loginTokens.has(csrf)?'nonce_unknown':loginTokens.get(csrf)<Date.now()?'expired_nonce':null;
 if(csrfError){send(403,{status:'denied',code:csrfError});return;}
 loginTokens.delete(csrf);
 if(!Object.hasOwn(pins,key)||pins[key]!==form.get('pin')){send(401,{status:'denied'});return;}
 const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{actor:actors[key],expires:Date.now()+3600000});
 res.writeHead(303,{...headers,location:key==='B'?'/producao-integrada.html':'/', 'set-cookie':'hlgb_integrado_demo='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600'});res.end();return;}
 const token=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('hlgb_integrado_demo='))?.slice('hlgb_integrado_demo='.length),session=sessions.get(token),actor=session?.expires>Date.now()?session.actor:null;
 if(!actor){if(route.startsWith('/api/'))send(401,{status:'denied',message:'Sessão fictícia expirada'});else{res.writeHead(303,{...headers,location:'/login'});res.end();}return;}
 if(method==='GET'&&route==='/api/session'){send(200,{status:'ok',environment:'HLGB-INTEGRADO-FICTICIO',actor,permissions:permissions.publicProfile(actor)});return;}
 if(method==='GET'&&route==='/api/revision'){send(200,{status:'ok',revision:await db.revision()});return;}
 if(method==='GET'&&route==='/api/state'){
 if(permissions.profile(actor)?.id!=='demo-admin'){send(403,{status:'denied',message:'Leitura integral não autorizada'});return;}
 send(200,{status:'ok',state:await db.state()});return;
 }
 if(method==='GET'&&route==='/api/production-state'){
 if(permissions.profile(actor)?.id!=='demo-production'){send(403,{status:'denied'});return;}
 send(200,{status:'ok',state:productionView.project(await db.state(),actor)});return;
 }
 if(method==='POST'&&route==='/api/proof'){const cmd=JSON.parse(await body(req));const result=await db.readback(cmd?.commandId,cmd,actor);send(200,result);return;}
 if(method==='POST'&&route==='/api/cancel'){send(200,await db.cancel(JSON.parse(await body(req)),actor));return;}
 if(method==='POST'&&route==='/api/commands'){
 const cmd=JSON.parse(await body(req)),result=await db.commit(cmd,actor);
 // Injeção de falha só no servidor descartável, após commit, antes do ACK.
 if(req.headers['x-lab-lose-ack']==='1'&&result.status==='committed'){req.socket.destroy();return;}
 send(200,result);return;}
 if(method==='GET'&&!route.startsWith('/api/')){
 const productionActor=permissions.profile(actor)?.id==='demo-production';
 const filename=route==='/'?(productionActor?'producao-integrada.html':'operacao-integrada.html'):route.slice(1);
 if(productionActor&&!['producao-integrada.html','integrado-remoto.js','integrado-producao.js'].includes(filename)){send(403,{status:'denied'});return;}
 if(filename==='integrado-remoto.js'||filename==='integrado-producao.js'){
 res.writeHead(200,{...headers,'content-type':'text/javascript;charset=utf-8'});
 res.end(await fs.readFile(path.join(__dirname,filename==='integrado-remoto.js'?'cliente.js':'tela-producao.js')));return;
 }
 if(!allowed.has(filename)&&!modules.test(filename)){send(404,{status:'not_found'});return;}
 let bytes=await fs.readFile(path.join(root,filename),'utf8');
 if(filename==='operacao-integrada.html')bytes=bytes.replace('<script src="./operacao-integrada-ui.js"></script>','<script src="./integrado-remoto.js"></script><script src="./operacao-integrada-ui.js"></script>');
 res.writeHead(200,{...headers,'content-type':filename.endsWith('.html')?'text/html;charset=utf-8':'text/javascript;charset=utf-8'});res.end(bytes);return;
 }
 send(404,{status:'not_found'});
 }catch(e){if(!res.headersSent)send(500,{status:'uncertain',message:'Falha no laboratório; confira a prova antes de repetir.'});else res.destroy();}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return server;
}
module.exports={start};
if(require.main===module)start().then(s=>console.log('Laboratório integrado: http://127.0.0.1:'+s.address().port)).catch(e=>{console.error(e.message);process.exitCode=1;});
