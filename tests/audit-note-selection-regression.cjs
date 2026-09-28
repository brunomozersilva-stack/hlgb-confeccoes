// Recovered guard adapted to the preserved Work implementation; behavioral scenarios run separately.
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('app9240.html','utf8');
const start=html.indexOf('const prevRefresh9236=window.hlgbRefreshNotes9215;');
assert(start>=0,'wrapper de refresh de Notas deve existir');
let end=html.indexOf('function stamp9236()',start);if(end<0)end=html.indexOf('function cloudApplyLegacySnapshot(next){',start);if(end<0)end=start+3500;
const src=html.slice(start,end);
assert(src.includes("const items=await loadCloudQueue9236();"),'refresh deve carregar fila autoritativa');
assert(src.includes("document.querySelectorAll('.nqSelect9202:checked')"),'refresh deve capturar seleção atual');
assert(src.includes('const active=new Set(items.map(x=>String(x.id)))'),'refresh deve validar IDs ainda ativos');
assert(src.includes('renderFresh9236(selected)'),'refresh deve preservar só seleção ainda válida');
assert(!src.includes('loadCloudQueue9236();renderFresh9236([])'),'refresh não pode apagar seleção explicitamente');
console.log('PASS notes refresh: seleção atual preservada apenas para itens ainda ativos.');
