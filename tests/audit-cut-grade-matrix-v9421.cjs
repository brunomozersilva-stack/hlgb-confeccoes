const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('app9240.html','utf8');
const m=html.match(/window\.hlgbAdjustCutGrade9191=function\(id\)\{[\s\S]*?\n\};/);
assert(m,'hlgbAdjustCutGrade9191 não encontrada');
const fn=m[0];
assert(fn.includes('cut-grade-matrix9421'),'matriz horizontal v94.21 ausente');
assert(fn.includes("hlgbSortedSizes(db.sizes||[])"),'não reutiliza a ordem de tamanhos da grade dos cortadores');
assert(!fn.includes("table(['Modelo','Cor','Tamanho'"),'estrutura vertical antiga ainda ativa');
let captured=null;
const db={
  sizes:['P','M','G','GG'],
  products:[{id:10,name:'Cueca Fem Tabata'}],
  orders:[{id:20}],
  cuts:[{id:30,orderId:20,originalGrade:[
    {productId:10,color:'Preto',size:'P',qty:20},{productId:10,color:'Preto',size:'M',qty:40},{productId:10,color:'Preto',size:'G',qty:40},{productId:10,color:'Preto',size:'GG',qty:40},
    {productId:10,color:'Branco',size:'P',qty:10},{productId:10,color:'Branco',size:'M',qty:20},{productId:10,color:'Branco',size:'G',qty:20},{productId:10,color:'Branco',size:'GG',qty:20}
  ],actualCutGrade:[
    {productId:10,color:'Preto',size:'P',qty:0},{productId:10,color:'Preto',size:'M',qty:48},{productId:10,color:'Preto',size:'G',qty:48},{productId:10,color:'Preto',size:'GG',qty:48},
    {productId:10,color:'Branco',size:'P',qty:0},{productId:10,color:'Branco',size:'M',qty:20},{productId:10,color:'Branco',size:'G',qty:20},{productId:10,color:'Branco',size:'GG',qty:20}
  ]}]
};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sandbox={window:{},db,console,clone9191:v=>JSON.parse(JSON.stringify(v)),orderFor9191:c=>db.orders.find(o=>String(o.id)===String(c.orderId)),cutOriginalGrade:c=>c.originalGrade,esc9191:esc,hlgbSortedSizes:a=>a.slice(),openModal:(title,body,cb)=>{captured={title,body,cb}},document:{getElementById:()=>null,querySelector:()=>null}};
vm.createContext(sandbox);vm.runInContext(fn,sandbox,{filename:'hlgbAdjustCutGrade9191.js'});
sandbox.window.hlgbAdjustCutGrade9191(30);
assert(captured,'modal não foi aberto');
assert.strictEqual(captured.title,'Ajustar grade do corte');
for(const h of ['Modelo','Cor','P','M','G','GG','Total previsto'])assert(captured.body.includes('<th>'+h+'</th>'),'cabeçalho ausente: '+h);
assert(!captured.body.includes('<th>Tamanho</th>'),'Tamanho ainda aparece como coluna vertical');
const tbody=(captured.body.match(/<tbody>([\s\S]*?)<\/tbody>/)||[])[1]||'';
assert.strictEqual((tbody.match(/<tr>/g)||[]).length,2,'cada cor deve ocupar uma linha');
assert.strictEqual((tbody.match(/id="adj9191_/g)||[]).length,8,'cada tamanho deve continuar editável');
assert(/Preto/.test(tbody)&&/Branco/.test(tbody),'cores não viraram linhas da matriz');
assert(/Prev\. 20/.test(tbody)&&/value="48"/.test(tbody),'previsto/corte real não estão preservados');
console.log('PASS grade corte v94.21: cores nas linhas, P/M/G/GG nas colunas e campos editáveis no padrão da folha dos cortadores.');
