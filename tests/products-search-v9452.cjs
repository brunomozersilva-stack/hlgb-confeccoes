const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('app9240.html','utf8'),loader=fs.readFileSync('app-stable3.html','utf8');
assert(!loader.includes("'release-products-search-v9452.js'"),'old redundant DOM-only filter must not load');
const start=app.indexOf('function renderProducts(){'),end=app.indexOf('function saveProductFromForm(p){',start);
assert(start>=0&&end>start,'canonical renderer found');
const text=app.slice(start,end);
assert(text.includes("normalize(\"NFD\")"),'canonical filter must normalize diacritics');
const controls={productSearchName:{value:''},productPriceMin:{value:''},productPriceMax:{value:''},productFilterSummary:{textContent:''},productTable:{innerHTML:''}};
const db={products:[
 {id:1,code:'001',name:'Camisola',price:10,materials:[],sizes:[]},
 {id:2,code:'F200',name:'Fio Brândão',price:20,materials:[],sizes:[]},
 {id:3,code:'033',name:'Cueca',price:30,materials:[],sizes:[]}
],materials:[],clients:[]};
const ctx={db,document:{getElementById:id=>controls[id]||null},
 ensureProductSuggestionSettings:()=>{},renderProductSuggestionSettings:()=>{},ensureProductReferences:()=>{},
 productAllowedColors:()=>[],materialCostPerPiece:()=>0,money:v=>String(v),esc:v=>String(v??''),table:(_heads,rows)=>JSON.stringify(rows),
 Array,Object,String,Number,Math,console};
vm.createContext(ctx);vm.runInContext(text,ctx);
const read=()=>{ctx.renderProducts();return controls.productTable.innerHTML};
controls.productSearchName.value='f200';let result=read();
assert(result.includes('Fio Brândão')&&!result.includes('Cueca'),'code-only query must match code and one consistent row set');
assert(controls.productFilterSummary.textContent.startsWith('1 produto(s)'),'count must agree with table');
controls.productSearchName.value='brandao';result=read();
assert(result.includes('Fio Brândão')&&!result.includes('Camisola'),'unaccented input matches accented name');
controls.productSearchName.value='CUECA';result=read();
assert(result.includes('Cueca')&&!result.includes('Camisola'),'case-insensitive name');
controls.productSearchName.value='';controls.productPriceMin.value='25';controls.productPriceMax.value='30';result=read();
assert(result.includes('Cueca')&&!result.includes('Fio Brândão'),'inclusive price filter');
controls.productSearchName.value='033';controls.productPriceMin.value='';controls.productPriceMax.value='';result=read();
assert(result.includes('Cueca')&&!result.includes('Fio Brândão'),'numeric code query');
controls.productSearchName.value='';result=read();
assert(result.includes('Camisola')&&result.includes('Fio Brândão')&&result.includes('Cueca'),'cleared filters restore all');
console.log('PASS single canonical Products filter: name/code, accents, prices, count and clear');
