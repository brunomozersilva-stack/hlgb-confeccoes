const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('app9240.html','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
const ops=fs.readFileSync('release-operations-pack.js','utf8');

assert(app.includes('"routePlans","labelBatches","labelTemplates","packagingAssignments","historicalImports"'),'custom operational modules must be normalized');
assert(loader.includes("'release-operations-pack.js'"),'official loader must load operations pack');
assert(loader.includes("HLGB_FORCE_MANUAL_LOGIN_9249"),'official loader must force manual login on open/refresh');
assert(ops.includes("Venda agrupada de mercadorias de terceiros"),'grouped resale sale must exist');
assert(ops.includes("deleteResale"),'resale product deletion must exist');
assert(ops.includes("Rotas de busca e entrega"),'route utility must exist');
assert(ops.includes("Etiquetas A4"),'A4 label creator must exist');
assert(ops.includes("packagingAssignments"),'packaging assignments must exist');
assert(ops.includes("labelTemplates"),'client/product label mapping must exist');
assert(ops.includes("histUpdateProduction9249"),'historical regularization must update existing production without creating a cutter assignment');
assert(ops.includes("histOpenAllocations9249"),'historical regularization must reconcile against real open client/product balances');
assert(ops.includes("readHistoricalFile9249"),'historical regularization must import PDF/files');
assert(ops.includes("pdf.js/3.11.174/pdf.min.js"),'historical PDF import must have PDF reader fallback');
assert(ops.includes("hlgbInternalAuditor"),'automatic internal audit integration must exist');

new Function(ops);
console.log('PASS operational pack v92.50: resale, mixed notes support, routes, labels, packaging, historical regularization, manual-login loader and audit integration.');
