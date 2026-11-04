const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const specs=[
 ['release-sync-recovery-v9301.js','function userEditing(){','function recordPendingCount(){','userEditing'],
 ['release-interaction-lock-v9434.js','function editing(){','function snap(){','editing'],
 ['release-ui-stability.js','function isEditing(){','function isRemote(){','isEditing']
];
for(const [file,start,end,name] of specs){
 const src=fs.readFileSync(file,'utf8'),a=src.indexOf(start),b=src.indexOf(end,a);
 assert(a>=0&&b>a,'function found: '+file);
 let modal=false,active={id:'productSearchName',tagName:'INPUT',closest:()=>({})};
 const document={get activeElement(){return active},querySelector:()=>modal?{}:null};
 const win={cloudUserIsEditing:()=>true};
 const ctx={window:win,document,visibleModal:()=>modal?{}:null,cloudUserIsEditing:()=>true,Array,String,console};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 for(const id of ['productSearchName','productPriceMin','productPriceMax','factionChecklistSearch9198']){
  active={id,tagName:'INPUT',closest:()=>({})};
  assert.equal(ctx[name](),false,file+' filter focus must NOT hold remote refresh for '+id);
 }
 active={id:'fname',tagName:'INPUT',closest:()=>({})};
 assert.equal(ctx[name](),true,file+' business field must remain protected');
 modal=true;active={id:'productSearchName',tagName:'INPUT',closest:()=>({})};
 assert.equal(ctx[name](),true,file+' modal must remain protected even when filter has focus');
}
console.log('PASS 3 remote refresh guards: known read-only filters are nonediting, business fields and modals remain locked');
