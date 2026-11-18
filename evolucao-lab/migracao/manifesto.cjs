'use strict';
// Contrato de ensaio: somente envelopes fictícios. Não conecta a bancos nem importa para produção.
const crypto=require('node:crypto');
const SHA=/^[a-f0-9]{64}$/;
const hash=x=>crypto.createHash('sha256').update(x,'utf8').digest('hex');
const groups={
 cadastro:['clients','colors','products','materials','sizes','suppliers','serviceTypes','factionMasters','factionSettings','productionLocations','cutterPieceTypes','cutters'],
 operacao:['orders','cuts','production','separations','capacityAssignments','missingPieces','orderTrash','routePlans','materialChecklists','noteQueue','operationalWriteoffs'],
 financeiro:['factionPayments','factions','finance','hubFinanceEntries','operationalCosts','projectionInvoices','purchases','weeklyPurchaseLimits','stock'],
 pessoal:['employees','formerEmployees','employeeAdvances','payroll','terminations'],
 patrimonio:['assets','machines','printer3dProducts','printer3dSales','printer3dSettings','goals'],
 seguranca:['factionWhatsappProfiles','whatsappAccessGrants','orderCommunicationOutbox','orderCommunicationPolicies'],
 arquivo:['systemAuditRuns','systemDailyBackupManifest','systemDailyBackupParts','systemIssues']
};
const mapping=new Map(Object.entries(groups).flatMap(([group,modules])=>modules.map(m=>[m,group])));
const identities={
 hlgb_records:['module','entity_id'],
 hlgb_data:['id'],hlgb_products:['entity_id'],hlgb_materials:['entity_id'],hlgb_clients:['entity_id'],hlgb_orders:['entity_id'],
 hlgb_record_history:['history_id'],hlgb_activity_log:['id'],hlgb_sync_diagnostics:['id'],hlgb_user_access:['email'],
 hlgb_schema_meta:['key'],hlgb_assistant_memory:['id'],hlgb_assistant_feedback:['id'],hlgb_order_chain_backup_20261024:['backup_id']
};
const required=Object.keys(identities);
function envelope(x){
 if(!x||!Object.hasOwn(identities,x.table)||!Array.isArray(x.key)||x.key.length!==identities[x.table].length||
 x.key.some(k=>typeof k!=='string'||!k.length)||typeof x.raw!=='string'||!x.raw.length||!SHA.test(x.sha256)||hash(x.raw)!==x.sha256||
 !['active','tombstone','archive'].includes(x.state))throw Error('Envelope inválido ou checksum divergente');
 // O JSON original nunca é reserializado: preservar exatidão de bigint, decimais, unicode e campos desconhecidos.
 let parsed;try{parsed=JSON.parse(x.raw);}catch(e){throw Error('JSON inválido');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('JSON não é objeto');
 identities[x.table].forEach((k,i)=>{const v=parsed[k];if(typeof v==='string'&&v!==x.key[i]||typeof v==='number'&&Number.isSafeInteger(v)&&String(v)!==x.key[i]||typeof v!=='string'&&typeof v!=='number')throw Error('Identidade divergente: '+k);});
 if(x.table==='hlgb_records'||['hlgb_products','hlgb_materials','hlgb_clients','hlgb_orders'].includes(x.table)){
 if(!Object.hasOwn(parsed,'deleted_at')||(parsed.deleted_at===null?'active':'tombstone')!==x.state)throw Error('Estado de exclusão divergente');
 }
 return JSON.stringify([x.table,...x.key]);
}
function buildManifest(rows,declaredTables=required){
 const unique=new Map(),counts=Object.create(null),unknown=new Set(),conflicts=[];
 for(const table of declaredTables){if(!Object.hasOwn(identities,table)||Object.hasOwn(counts,table))throw Error('Tabela desconhecida ou repetida');counts[table]={rows:0,active:0,tombstone:0,archive:0};}
 for(const x of rows){const id=envelope(x);if(!Object.hasOwn(counts,x.table))throw Error('Tabela não declarada');
 if(unique.has(id))throw Error('Identidade repetida: '+id);unique.set(id,x.sha256+':'+x.state);counts[x.table].rows++;counts[x.table][x.state]++;
 if(x.table==='hlgb_records'&&!mapping.has(x.key[0]))unknown.add(x.key[0]);
 }
 // Tabelas espelhadas e registros centrais são armazenados separadamente. Nenhuma fusão automática.
 const mirrors={hlgb_products:'products',hlgb_materials:'materials',hlgb_orders:'orders',hlgb_clients:'clients'};
 for(const x of rows)if(Object.hasOwn(mirrors,x.table)&&unique.has(JSON.stringify(['hlgb_records',mirrors[x.table],x.key[0]])))conflicts.push({table:x.table,key:x.key[0],reason:'sobreposicao_requer_regra_de_autoridade'});
 const missing=required.filter(t=>!Object.hasOwn(counts,t));
 const digest=hash(JSON.stringify([...unique.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0)));
 return {schema:'hlgb-migration-manifest-v1',counts,digest,missing,unknown:[...unknown].sort(),overlaps:conflicts,activationAllowed:false};
}
function compare(origin,destination){const failures=[];
 if(origin.schema!==destination.schema||origin.digest!==destination.digest)failures.push('Conteúdo, identidade ou exclusão divergente');
 for(const t of new Set([...Object.keys(origin.counts),...Object.keys(destination.counts)])){
 const a=origin.counts[t],b=destination.counts[t];if(!a||!b||['rows','active','tombstone','archive'].some(k=>a[k]!==b[k]))failures.push('Contagem divergente: '+t);}
 if(origin.missing.length||destination.missing.length)failures.push('Tabelas ausentes do inventário');
 if(origin.unknown.length||destination.unknown.length)failures.push('Módulos desconhecidos exigem mapeamento');
 return {archiveMatches:failures.length===0,failures,overlaps:origin.overlaps.length,activationAllowed:false};
}
function fixture(table,key,data,state='archive'){const raw=JSON.stringify(data);return {table,key,raw,state,sha256:hash(raw)};}
module.exports={groups,mapping,identities,required,hash,buildManifest,compare,fixture};
