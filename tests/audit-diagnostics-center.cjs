const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');

const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'release-diagnostics-center.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');

assert(loader.includes("'release-diagnostics-center.js'"),'official loader must include diagnostics center');

const context={
  console,
  db:{
    orders:[
      {id:'o1',orderNumber:'101',grade:[{productId:'p1'}]},
      {id:'o2',orderNumber:'102',grade:[{productId:'p1'},{productId:'p2'}]}
    ],
    products:[{id:'p1'},{id:'p2'}],
    cuts:[
      {id:'c1',orderId:'missing-order',productId:null},
      {id:'c2',orderId:'o1',productId:'p1'},
      {id:'c3',orderId:'o2',productId:null},
      {id:'c4',orderId:null,productId:null,pieces:293},
      {id:1,op:'OP-00126',orderId:null,productId:null,pieces:293,layers:20,meters:82,color:'Rubi',fabric:'Tule'},
      {id:'c5',orderId:'o1',productId:null}
    ],
    production:[],
    capacityAssignments:[],
    finance:[],
    projectionInvoices:[],
    employees:[{id:'e1',name:'Funcionário Teste',active:true,terminationDate:'2026-09-01'}],
    terminations:[],
    factions:[],
    missingPieces:[],
    systemIssues:[],
    systemSuggestions:[]
  },
  window:{
    HLGB_RELEASE_VERSION:'92.47',
    addEventListener(){},
  },
  navigator:{userAgent:'Mozilla/5.0 Safari/605.1.15'},
  document:{
    readyState:'loading',
    addEventListener(){},
    querySelector(){return null},
    getElementById(){return null}
  },
  setTimeout(){return 0},
  clearTimeout(){},
  alert(){},
  confirm(){return true},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},
  CSS:{escape:v=>String(v)},
  Blob:function(){},
  URL:{createObjectURL(){return ''},revokeObjectURL(){}}
};
vm.createContext(context);
vm.runInContext(src,context);

const api=context.window.hlgbDiagnosticsCenter;
assert(api,'diagnostics API must load');
assert.deepEqual(Array.from(api.modules),['systemIssues','systemSuggestions'],'diagnostics modules must be declared');

const sanitized=api.sanitize('access_token=secret123 password:abc Bearer tokenvalue');
assert(!sanitized.includes('secret123'),'access token value must be removed');
assert(!sanitized.includes('password:abc'),'password value must be removed');
assert(sanitized.includes('[REMOVIDO]'),'sanitizer must leave redaction marker');

const findings=api.scanSystem();
assert(findings.some(x=>x.code==='cut-order-missing'&&String(x.description).includes('c1')),'scan must find cut linked to missing order');
assert(!findings.some(x=>x.code==='cut-product-missing'&&String(x.description).includes('c1')),'missing-order cut must not be duplicated as missing-product');
assert(!findings.some(x=>String(x.description||'').includes('c3')),'aggregate multi-product cut must not be reported as product error');
assert(findings.some(x=>x.code==='cut-legacy-unlinked'&&String(x.description).includes('c4')&&x.severity==='Média'),'manual legacy cut must be a warning, not a failure');
assert(!findings.some(x=>x.code==='cut-legacy-unlinked'&&String(x.description).includes('Corte 1 ')),'confirmed historical OP-00126 cut must be ignored by diagnostics');
assert(findings.some(x=>x.code==='cut-product-missing'&&String(x.description).includes('c5')),'single-product active cut without productId must remain a real error');
assert(findings.some(x=>x.code==='active-with-termination'),'scan must find active employee with termination date');
assert(!findings.some(x=>String(x.description||'').includes('c2')&&x.code==='cut-order-missing'),'valid cut must not be reported as missing-order');

assert(!findings.some(x=>x.code==='duplicate-order-number'),'different active order numbers must not be flagged as duplicates');
context.db.orders.push({id:'o3',orderNumber:'102',grade:[{productId:'p1'}]});
const duplicateOrderFindings=api.scanSystem();
assert(duplicateOrderFindings.some(x=>x.code==='duplicate-order-number'&&String(x.description).includes('#102')),'duplicate active order number must be detected');
context.db.orders.pop();

const fp1=api.fingerprint(['same','record']);
const fp2=api.fingerprint(['same','record']);
assert.equal(fp1,fp2,'fingerprint must be deterministic');

const net=api.classifySaveError(new Error('Load failed'),'orders','o-net');
assert.equal(net.kind,'network-save','Safari Load failed must be classified as network save failure');
assert.equal(net.priority,'Alta','network save failure must not be marked as critical data corruption');
const conflictErr=new Error('Conflito de edição'); conflictErr.code='HLGB_SAME_FIELD_CONFLICT'; conflictErr.paths=['materials','gradeV9198'];
const protectedCls=api.classifySaveError(conflictErr,'materialChecklists','mc1');
assert.equal(protectedCls.kind,'protected-conflict','same-field conflicts must remain protected conflicts');
const legacyProd=api.classifySaveError(new Error('Conflito ao salvar production. Atualize e tente novamente.'),'production','p1');
assert.equal(legacyProd.kind,'protected-conflict','legacy production conflict text must be recognized even without error code');
const legacyCut=new Error('Falha ao salvar cuts');
legacyCut.stack='conflictError@http://localhost/release-record-integrity.js:172:21\nsafeMerge@http://localhost/release-record-integrity.js:229:126';
assert.equal(api.classifySaveError(legacyCut,'cuts','c1').kind,'protected-conflict','legacy cut conflict stack must be recognized without code');
const hard=api.classifySaveError(new Error('Banco rejeitou gravação'),'orders','o-hard');
assert.equal(hard.kind,'save','non-network/non-protected save errors must remain real save failures');
assert.equal(hard.priority,'Crítica','real save failures must remain critical');

console.log('PASS diagnostics center: loader, sanitizer, deterministic scan and integrity findings.');
