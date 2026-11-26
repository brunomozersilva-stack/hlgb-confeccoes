'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const file=fs.readFileSync('release-auditor-autocorrect-v9447.js','utf8');
const start=file.indexOf('/* HLGB v96.15');
const end=file.indexOf('function render(summary){',start);
assert.ok(start>=0&&end>start,'real Auditor WAL UI block exists');
const snippet=file.slice(start,end);
function fixture(result){
 const created=[],calls=[],downloads=[];
 function el(tag){const x={tag,textContent:'',style:{},disabled:false,children:[],listeners:{},
  append(...nodes){this.children.push(...nodes)},appendChild(n){this.children.push(n)},
  addEventListener(name,fn){this.listeners[name]=fn},
  click(){downloads.push(this.download)}};created.push(x);return x}
 const context={
  sid:v=>String(v??''),authReady:()=>true,
  document:{createElement:el,body:{appendChild(){}}},
  walRemoteReadOnlyProof9482:async(max,cb)=>{calls.push(max);cb({done:2,total:2,different:1,missing:1,unverified:0});return result},
  Blob:class {constructor(content){this.content=content}},
  URL:{createObjectURL:()=>'blob:local',revokeObjectURL(){}},
  setTimeout:()=>1,Date,JSON,String,Array,Number,Set,console
 };
 vm.createContext(context);
 vm.runInContext(snippet+';globalThis.api={safeWalReview9615,renderWalReview9615,downloadWalReview9615}',context);
 return {context,created,calls,downloads};
}
const example={status:'not-confirmed',total:2,checked:2,matched:0,different:1,missing:1,unverified:0,
 items:[{module:'orders',id:'123',opId:'op-123',status:'different',
 differentFields:['quantity','password=private','<script>'],data:{email:'private@example.invalid',secret:'PRIVATE_PAYLOAD'}}],
 errors:[{error:'Bearer secret token'}]};
test('read-only report contains only identities, categories and field names',()=>{
 const f=fixture(example);
 const clean=f.context.api.safeWalReview9615(example);
 assert.equal(clean.readOnly,true);assert.equal(clean.noCleanupPerformed,true);
 assert.equal(clean.items[0].status,'different');assert.equal(clean.items[0].differentFields[0],'quantity');
 assert.equal(clean.remoteReadErrorCount,1);
 const output=JSON.stringify(clean);
 assert.doesNotMatch(output,/PRIVATE_PAYLOAD|private@example.invalid|Bearer secret|<script>|password=/);
 assert.doesNotMatch(output,/"data":|"payload":/);
});
test('explicit WAL control checks ALL operations (up to 60) and never mutates storage',async()=>{
 const f=fixture(example),card={children:[],appendChild(x){this.children.push(x)}};
 f.context.api.renderWalReview9615(card);
 assert.equal(card.children.length,1);
 const wrapper=card.children[0];
 const [button,exportBtn,status]=wrapper.children;
 assert.equal(exportBtn.disabled,true);
 assert.match(status.textContent,/até 60/);
 await button.listeners.click();
 assert.deepEqual(f.calls,[60]);
 assert.match(status.textContent,/2\/2 conferidos/);
 assert.equal(exportBtn.disabled,false);
 assert.equal(f.downloads.length,0,'no implicit download');
 assert.equal(typeof f.context.api.downloadWalReview9615,'function');
 assert.ok(!['indexedDB','localStorage','cloudRecordSave','hlgbRecordSaveWithRetry','readwrite','.prune(','fetch('].some(x=>snippet.includes(x)),'WAL UI must stay read-only');
});
test('invalid local identity is counted and reported without writes',()=>{
 const begin=file.indexOf('async function walRemoteReadOnlyProof9482('),end=file.indexOf('\nfunction metrics()',begin);
 assert.ok(begin>=0&&end>begin);
 let reads=0;const progress=[];
 const context={walRowsReadOnly9482:async()=>({status:'ok',rows:[{module:'orders',id:'1',opId:''},{module:'orders',id:'2',opId:'op-2'}]}),sid:v=>String(v??''),authReady:()=>true,navigator:{onLine:true},window:{cloudRequest:async(q,o)=>{assert.equal(o.method,'GET');reads++;return []}},setTimeout,clearTimeout,Date,Promise};
 vm.createContext(context);vm.runInContext(file.slice(begin,end)+';globalThis.proof=walRemoteReadOnlyProof9482;',context);
 return context.proof(60,p=>progress.push(p.done)).then(out=>{
  assert.equal(reads,1);assert.equal(out.checked,2);assert.equal(out.unverified,1);assert.equal(out.missing,1);
  assert.equal(out.items[0].status,'invalid-local-operation');assert.equal(out.items[1].status,'missing');
  assert.equal(out.removed,0);assert.equal(out.status,'partially-unverified');assert.deepEqual(progress,[1,2]);
 });
});
test('full audit entry remains user-initiated; 8-item regular audit unchanged',()=>{
 assert.match(file,/const fallback=await walRemoteReadOnlyProof9482\(8\)/);
 assert.match(file,/if\(walReviewBusy9615\|\|!authReady\(\)\)return/);
 assert.match(file,/const result=await walRemoteReadOnlyProof9482\(60,p=>/);
});
