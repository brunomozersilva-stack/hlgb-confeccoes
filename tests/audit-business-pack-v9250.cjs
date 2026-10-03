const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('app9240.html','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
const files=[
 'release-operations-pack.js',
 'release-assistant-mobile-v9250.js',
 'release-supplier-comparator-v9250.js',
 'release-supplier-debts-v9250.js',
 'release-employee-purchases-v9250.js',
 'release-cutter-history-v9250.js',
 'release-whatsapp-pilot-v9250.js',
 'release-daily-safety.js'
];
const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8')]));
for(const [f,s] of Object.entries(src))new Function(s);

for(const m of ['supplierDebts','supplierDebtTransactions','employeePurchases','clientAliases','productAliases','whatsappPilotRules','whatsappPilotMessages']){
 assert(app.includes('"'+m+'"'),m+' must be a normalized module');
}
for(const f of files.filter(f=>f.includes('v9250'))){
 assert(loader.includes("'"+f+"'"),f+' must be loaded by official loader');
}
assert(app.includes("window.HLGB_RELEASE_VERSION='92.50'"),'app identity must be v92.50');

const ops=src['release-operations-pack.js'];
assert(ops.includes('Quantidade de peças'),'A4 labels must contain piece quantity');
assert(ops.includes("class=\"ls\""),'A4 labels must contain size field');
assert(ops.includes('TAMANHO:'),'A4 labels must print size');
assert(ops.includes('QUANTIDADE:'),'A4 labels must print piece quantity');
assert(ops.includes('previewLabelTemplate9250'),'packaging labels must support preview');
assert(ops.includes('templateDataUrl'),'packaging labels must support uploaded PDF/image data');
assert(ops.includes('productUrl'),'packaging labels must store product URL');
assert(ops.includes('resolveHistoricalClient9250'),'PDF import must resolve unknown clients');
assert(ops.includes('resolveHistoricalProduct9250'),'PDF import must resolve unknown products');
assert(ops.includes('clientAliases'),'PDF import must persist client aliases');
assert(ops.includes('productAliases'),'PDF import must persist product aliases');

const assistant=src['release-assistant-mobile-v9250.js'];
assert(assistant.includes('hlgbAssistantMobileFab9250'),'mobile assistant FAB required');
assert(assistant.includes('Soma da grade'),'assistant grade math required');
assert(assistant.includes('Produção')&&assistant.includes('Entregas')&&assistant.includes('Financeiro'),'mobile quick actions required');

const comp=src['release-supplier-comparator-v9250.js'];
assert(comp.includes('Melhor preço por matéria-prima'),'supplier comparator required');
assert(comp.includes("sort((a,b)=>a.price-b.price"),'supplier comparator must sort by lowest price');

const debts=src['release-supplier-debts-v9250.js'];
for(const x of ['Pagamento','Juros','Acréscimo','Abatimento','Total exposto'])assert(debts.includes(x),'supplier debts missing '+x);

const emp=src['release-employee-purchases-v9250.js'];
for(const x of ['Compra de funcionário','Folha para desconto','baixar estoque','Cancelar/estornar'])assert(emp.includes(x),'employee purchases missing '+x);

const cutters=src['release-cutter-history-v9250.js'];
for(const x of ['Histórico detalhado de cortadores','Material previsto','Material realizado','exportCutterHistory9250'])assert(cutters.includes(x),'cutter history missing '+x);

const wa=src['release-whatsapp-pilot-v9250.js'];
assert(wa.includes('Sem conexão com o WhatsApp real'),'WhatsApp must remain pilot only');
assert(wa.includes('Bloqueado no piloto'),'WhatsApp pilot must block sensitive questions');

const daily=src['release-daily-safety.js'];
assert(!daily.includes('remoteBackupMeta:remote?') || daily.includes('const remote='),'daily package remote variable must be defined');
assert(daily.includes('remoteBackupMeta:remoteBackup?'),'daily audit must return remote backup metadata');

console.log('PASS v92.50 consolidated business package');
