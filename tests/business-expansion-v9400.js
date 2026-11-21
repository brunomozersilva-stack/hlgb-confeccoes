const fs=require('fs');
const src=fs.readFileSync('release-business-expansion-v9400.js','utf8');
const app=fs.readFileSync('app-stable3.html','utf8');
function must(ok,msg){if(!ok)throw new Error(msg)}
must(src.includes("const V='94.00'"),'versão 94.00 ausente');
must(app.includes("'release-business-expansion-v9400.js'"),'módulo v94.00 não é carregado pelo app-stable3');
for(const id of ['printer3dHome9400','printer3dProducts9400','printer3dSales9400','printer3dCatalog9400','communications9400','whatsappAccess9400','factionLookup9400'])must(src.includes(id),'página ausente: '+id);
for(const m of ['printer3dSettings','printer3dProducts','printer3dSales','orderCommunicationPolicies','orderCommunicationOutbox','whatsappAccessGrants','factionWhatsappProfiles'])must(src.includes("'"+m+"'")||src.includes('"'+m+'"'),'módulo de dados ausente: '+m);
must(src.includes('filamentPriceKg')&&src.includes('machineHourRate')&&src.includes('cleaningQty')&&src.includes('accessories')&&src.includes('multiplier'),'ficha técnica 3D incompleta');
must(src.includes('aguardando_integracao_email'),'fila de e-mail deve assumir que entrega externa ainda não existe');
must(/Não é autorização externa segura|não substitui autenticação do servidor/i.test(src),'WhatsApp precisa declarar limite de segurança');
must(!/window\.hlgbRecordSaveWithRetry\s*=/.test(src),'v94.00 não pode substituir hlgbRecordSaveWithRetry');
must(!/window\.hlgb955ReliableSave\s*=/.test(src),'v94.00 não pode substituir hlgb955ReliableSave');
must(!/setInterval\s*\(/.test(src),'v94.00 não deve adicionar polling permanente');
must(!/new\s+MutationObserver\s*\(/.test(src),'v94.00 não deve adicionar observer global');
must(!/beforeunload/.test(src),'v94.00 não deve interferir na saída/boot');
const loadCount=(app.match(/release-business-expansion-v9400\.js/g)||[]).length;must(loadCount===1,'módulo v94.00 deve ser carregado exatamente uma vez; atual='+loadCount);
console.log('BUSINESS_EXPANSION_V9400_STATIC_OK',JSON.stringify({loadCount,pages:7,dataModules:7,noSaveWrapper:true,noPermanentPolling:true}));
