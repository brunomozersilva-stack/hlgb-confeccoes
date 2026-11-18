'use strict';
// Adaptador de persistência integral, exclusivamente localhost/CI. Não é API pública.
const {Client}=require('pg'),crypto=require('node:crypto'),core=require('../operacao-integrada-core.js');
const DB='hlgb_integrado_lab',MARK='HLGB-EVOLUCAO-FICTICIO-LOCAL-V1',ID='operacao-ficticia';
function guard(env=process.env){if(env.PGDATABASE!==DB||env.PGHOST!=='127.0.0.1'||!/^\d+$/.test(env.PGPORT||'')||env.PGUSER!=='hlgb_lab_runner'||!env.PGPASSWORD)throw Error('Conexão recusada: somente banco local descartável.');}
function canonical(v){if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype)return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 throw Error('Payload fora do contrato JSON');}
function validate(cmd,actor){if(!cmd||Object.keys(cmd).sort().join(',')!=='commandId,expectedRevision,payload,type'||typeof cmd.commandId!=='string'||!/^LAB-[a-zA-Z0-9_-]{4,90}$/.test(cmd.commandId)||typeof cmd.type!=='string'||!/^([a-z]+\.)+[a-zA-Z]+$/.test(cmd.type)||cmd.type==='demo.reset'||!Number.isSafeInteger(cmd.expectedRevision)||cmd.expectedRevision<1||cmd.expectedRevision>=100000000||!cmd.payload||Object.getPrototypeOf(cmd.payload)!==Object.prototype||typeof actor!=='string'||!['Operador A fictício','Operador B fictício'].includes(actor))throw Error('Comando ou ator fora do laboratório.');
 const input=canonical([actor,cmd]);if(Buffer.byteLength(input)>2*1024*1024)throw Error('Comando excede limite.');return crypto.createHash('sha256').update(input).digest('hex');}
async function withDb(fn){guard();const c=new Client({host:'127.0.0.1',port:Number(process.env.PGPORT),database:DB,user:process.env.PGUSER,password:process.env.PGPASSWORD,ssl:false,connectionTimeoutMillis:4000,statement_timeout:10000});
 await c.connect();try{const res=(await c.query('SELECT current_database() AS db, marker FROM hlgb_integrado_lab.environment WHERE singleton')).rows[0];if(res?.db!==DB||res.marker!==MARK)throw Error('Marcador do ambiente inválido.');return await fn(c);}finally{await c.end();}}
async function initialize(){return withDb(async c=>{const seed=core.initial();await c.query('INSERT INTO hlgb_integrado_lab.documents(id,revision,state) VALUES($1,1,$2::jsonb) ON CONFLICT(id) DO NOTHING',[ID,JSON.stringify(seed)]);return state();});}
function verifyChain(state){if(!state||!Number.isSafeInteger(state.revision)||state.revision<1||!Array.isArray(state.log)||state.log.length!==state.revision-1)return false;const seen=new Set();for(let i=0;i<state.log.length;i++){let e=state.log[i];if(!e||e.revision!==i+2||typeof e.commandId!=='string'||!e.commandId||seen.has(e.commandId)||e.type==='demo.reset'||!['Operador A fictício','Operador B fictício'].includes(e.actor))return false;seen.add(e.commandId);}return state.revisionProof===(state.log.at(-1)?.commandId||'seed');}
function verifyDocument(row){if(!row||Number(row.revision)!==row.state?.revision||!verifyChain(row.state)||!core.inspect(row.state).ok)throw Error('Snapshot inconsistente; nenhuma alteração autorizada.');return row.state;}
function ledgerMatches(current,rows){
 if(!Array.isArray(rows)||rows.length!==current.log.length)return false;
 return rows.every((row,i)=>{const e=current.log[i];return row.command_id===e.commandId&&Number(row.revision)===e.revision&&Number(row.expected_revision)===e.revision-1&&row.actor===e.actor&&row.kind===e.type&&row.result===e.description&&/^[a-f0-9]{64}$/.test(row.fingerprint)&&row.event&&canonical(row.event)===canonical(e);});
}
async function verifyLedger(c,current){
 const rows=(await c.query('SELECT c.command_id,c.revision,c.expected_revision,c.actor,c.kind,c.result,c.fingerprint,e.event FROM hlgb_integrado_lab.commands c LEFT JOIN hlgb_integrado_lab.events e USING(command_id,document_id,revision) WHERE c.document_id=$1 ORDER BY c.revision',[ID])).rows;
 if(!ledgerMatches(current,rows))throw Error('Trilha de comandos e eventos diverge do documento. Escritas bloqueadas.');
 return current;
}
async function state(){return withDb(async c=>{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{const current=verifyDocument((await c.query('SELECT revision,state FROM hlgb_integrado_lab.documents WHERE id=$1',[ID])).rows[0]);await verifyLedger(c,current);await c.query('COMMIT');return current;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}});}
async function revision(){return withDb(async c=>{const row=(await c.query('SELECT revision FROM hlgb_integrado_lab.documents WHERE id=$1',[ID])).rows[0],n=Number(row?.revision);if(!Number.isSafeInteger(n)||n<1)throw Error('Revisão indisponível.');return n;});}
async function commit(cmd,actor){let fingerprint;try{fingerprint=validate(cmd,actor);}catch(e){return {status:'rejected',message:e.message};}
 return withDb(async c=>{await c.query('BEGIN');try{
 const current=verifyDocument((await c.query('SELECT revision,state FROM hlgb_integrado_lab.documents WHERE id=$1 FOR UPDATE',[ID])).rows[0]);
 await verifyLedger(c,current);
 const old=(await c.query('SELECT fingerprint, revision, result FROM hlgb_integrado_lab.commands WHERE command_id=$1',[cmd.commandId])).rows[0];
 if(old){await c.query('ROLLBACK');return old.fingerprint===fingerprint?{status:'already_committed',commandId:cmd.commandId,revision:Number(old.revision),result:old.result}:{status:'rejected',message:'ID já vinculado a outro conteúdo ou ator.'};}
 const cancelled=(await c.query('SELECT fingerprint FROM hlgb_integrado_lab.cancellations WHERE command_id=$1',[cmd.commandId])).rows[0];
 if(cancelled){await c.query('ROLLBACK');return {status:'rejected',message:'ID foi cancelado de forma definitiva.'};}
 if(current.revision!==cmd.expectedRevision){await c.query('ROLLBACK');return {status:'conflict',serverRevision:current.revision,commandId:cmd.commandId};}
 let next;try{next=core.apply(current,{...cmd,actor,recordedAt:new Date().toISOString()});}catch(e){await c.query('ROLLBACK');return {status:'rejected',message:e.message};}
 const revision=next.state.revision,event=next.state.log.at(-1);
 if(event.commandId!==cmd.commandId||revision!==cmd.expectedRevision+1||event.type!==cmd.type)throw Error('Prova da transação inválida.');
 await c.query('INSERT INTO hlgb_integrado_lab.commands(command_id,document_id,actor,fingerprint,kind,expected_revision,revision,result) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[cmd.commandId,ID,actor,fingerprint,cmd.type,cmd.expectedRevision,revision,next.result]);
 await c.query('INSERT INTO hlgb_integrado_lab.events(command_id,document_id,revision,event) VALUES($1,$2,$3,$4::jsonb)',[cmd.commandId,ID,revision,JSON.stringify(event)]);
 const update=await c.query('UPDATE hlgb_integrado_lab.documents SET revision=$1,state=$2::jsonb WHERE id=$3 AND revision=$4',[revision,JSON.stringify(next.state),ID,current.revision]);
 if(update.rowCount!==1)throw Error('Conflito de revisão.');
 await c.query('COMMIT');return {status:'committed',commandId:cmd.commandId,revision,result:next.result};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}});}
async function readback(commandId,expected=null,actor=null){
 let fingerprint=null;if(expected!==null){try{if(expected.commandId!==commandId)throw Error('ID divergente');fingerprint=validate(expected,actor);}catch(e){return {status:'rejected'};}}if(typeof commandId!=='string'||!/^LAB-[a-zA-Z0-9_-]{4,90}$/.test(commandId))return {status:'rejected'};
 return withDb(async c=>{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{
 const row=(await c.query('SELECT c.revision,c.kind,c.actor,c.result,c.fingerprint,e.event FROM hlgb_integrado_lab.commands c JOIN hlgb_integrado_lab.events e USING(command_id,document_id,revision) WHERE c.command_id=$1',[commandId])).rows[0];
 const current=verifyDocument((await c.query('SELECT revision,state FROM hlgb_integrado_lab.documents WHERE id=$1',[ID])).rows[0]);
 await verifyLedger(c,current);
 if(!row){const cancelled=(await c.query('SELECT actor,fingerprint FROM hlgb_integrado_lab.cancellations WHERE command_id=$1',[commandId])).rows[0];if(cancelled){await c.query('COMMIT');return fingerprint&&(cancelled.fingerprint!==fingerprint||cancelled.actor!==actor)?{status:'rejected'}:{status:'cancelled',commandId,latestRevision:current.revision};}const found=(await c.query('SELECT 1 FROM hlgb_integrado_lab.commands WHERE command_id=$1',[commandId])).rowCount;await c.query('COMMIT');return {status:found?'uncertain':'not_found',latestRevision:current.revision};}
 if(fingerprint&&(row.fingerprint!==fingerprint||row.actor!==actor)){await c.query('COMMIT');return {status:'rejected'};}
 const ev=current.log.find(x=>x.commandId===commandId);const proof=ev&&canonical(ev)===canonical(row.event)&&ev.revision===Number(row.revision)&&ev.type===row.kind&&ev.actor===row.actor&&ev.description===row.result;
 await c.query('COMMIT');return proof?{status:'readback_confirmed',commandId,revision:Number(row.revision),latestRevision:current.revision,result:row.result}:{status:'uncertain',commandId};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}});}
async function cancel(cmd,actor){
 let fingerprint;try{fingerprint=validate(cmd,actor);}catch(e){return {status:'rejected',message:e.message};}
 return withDb(async c=>{await c.query('BEGIN');try{
 const current=verifyDocument((await c.query('SELECT revision,state FROM hlgb_integrado_lab.documents WHERE id=$1 FOR UPDATE',[ID])).rows[0]);await verifyLedger(c,current);
 const old=(await c.query('SELECT fingerprint FROM hlgb_integrado_lab.commands WHERE command_id=$1',[cmd.commandId])).rows[0];
 if(old){await c.query('ROLLBACK');return old.fingerprint===fingerprint?{status:'committed',commandId:cmd.commandId}:{status:'rejected'};}
 const cancelled=(await c.query('SELECT fingerprint FROM hlgb_integrado_lab.cancellations WHERE command_id=$1',[cmd.commandId])).rows[0];
 if(cancelled){await c.query('ROLLBACK');return cancelled.fingerprint===fingerprint?{status:'cancelled',commandId:cmd.commandId}:{status:'rejected'};}
 await c.query('INSERT INTO hlgb_integrado_lab.cancellations(command_id,actor,fingerprint) VALUES($1,$2,$3)',[cmd.commandId,actor,fingerprint]);
 await c.query('COMMIT');return {status:'cancelled',commandId:cmd.commandId};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}});}
module.exports={guard,canonical,validate,initialize,state,revision,commit,readback,cancel,verifyChain,ledgerMatches};
