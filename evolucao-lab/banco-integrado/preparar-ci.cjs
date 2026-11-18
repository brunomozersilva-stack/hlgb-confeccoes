'use strict';
// Preparador descartável para GitHub Actions; nunca executar em Supabase ou fora do CI local.
const fs=require('node:fs'),path=require('node:path'),{Client}=require('pg');
const DB='hlgb_integrado_lab',HOST='127.0.0.1',MARK='HLGB-EVOLUCAO-FICTICIO-LOCAL-V1';
function guard(env=process.env){
 if(env.CI!=='true'||env.GITHUB_ACTIONS!=='true'||env.PGHOST!==HOST||env.PGDATABASE!==DB||env.PGUSER!=='postgres'||env.PGPORT!=='5432'||env.PGPASSWORD!=='somente_ci_ficticio_integrado')throw Error('Preparação proibida: somente Postgres descartável em GitHub Actions.');
}
function schema(){
 let sql=fs.readFileSync(path.join(__dirname,'01-schema-local.sql'),'utf8');
 sql=sql.replace(/^\\set ON_ERROR_STOP on\s*\r?\n/m,'');
 if(/^\\[a-z]+/m.test(sql)||!sql.includes("IF current_database() <> 'hlgb_integrado_lab'")||!sql.includes("INSERT INTO hlgb_integrado_lab.environment(marker)"))throw Error('Esquema contém comandos não aceitos ou perdeu o marcador.');
 return sql;
}
async function main(){
 guard();const c=new Client({host:HOST,port:5432,database:DB,user:'postgres',password:process.env.PGPASSWORD,ssl:false,connectionTimeoutMillis:4000,statement_timeout:20000});
 await c.connect();try{
 const database=(await c.query('SELECT current_database() AS db')).rows[0]?.db;if(database!==DB)throw Error('Banco errado');
 await c.query(schema());
 const evidence=(await c.query('SELECT marker FROM hlgb_integrado_lab.environment WHERE singleton=true')).rows[0];
 if(evidence?.marker!==MARK)throw Error('Marcador SQL inexistente');
 process.stdout.write('Preparação CI do PostgreSQL fictício confirmada.\n');
 }finally{await c.end();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={guard,schema,main};
