const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-faction-master-integrity.js'),'utf8');
const db={factionMasters:[{id:1,name:'Mario',pix:'',active:true}],serviceTypes:[{id:10,name:'Sutiã'}],machines:[{id:20,name:'Overloque'}]};
let saverCalls=[],savedLocal=0,modalCb=null,closed=0,rendered=0,alerts=0;
const values={
 mfname:{value:'Mario'},mfaddress:{value:'Lumiar'},mfphone:{value:'22999999999'},mfpix:{value:'PIX-TESTE'},
 mflocation:{value:'30'}
};
const checks={
 '.mfServiceCheck:checked':[{value:'10'}],
 '.mfMachineCheck:checked':[{value:'20'}]
};
const document={
 getElementById:id=>values[id]||null,
 querySelectorAll:q=>checks[q]||[],
 querySelector:q=>q==='#modal .modalSave'?{disabled:false,textContent:'Salvar',dataset:{}}:null
};
const window={db,renderFactions(){rendered++},hlgbRecordSaveWithRetry:async(module,id,data,deleted)=>{
 saverCalls.push({module,id,data,deleted});
 return {applied:true,data:{...data,__hlgb_explicit_delete:undefined},deleted_at:deleted?'2026-09-21T13:30:00Z':null,revision:2};
}};
const context={
 window,db,document,console,Date,
 factionMasterForm:()=>'<div></div>',
 selectedCatalogNames:(ids,items)=>items.filter(x=>ids.some(id=>String(id)===String(x.id))).map(x=>x.name).join(', '),
 openModal:(title,html,cb)=>{modalCb=cb},
 closeModal:()=>{closed++},
 cloudEnsureFreshSession:async()=>true,hlgbRecordReady:true,hlgbEnsureRecordsOnlineAfterLogin:async()=>true,
 localSaveOnly:()=>{savedLocal++},setCloudStatus(){},alert:()=>{alerts++},confirm:()=>true
};
vm.createContext(context);vm.runInContext(src,context);
(async()=>{
 assert.equal(window.HLGB_FACTION_MASTER_INTEGRITY_GUARD,'v1');
 window.editFactionMaster(1);assert(modalCb,'edit must open modal');
 const ok=await modalCb();assert.equal(ok,true);
 assert.equal(saverCalls.length,1);assert.equal(saverCalls[0].module,'factionMasters');
 assert.equal(saverCalls[0].id,'1');assert.equal(saverCalls[0].data.pix,'PIX-TESTE','PIX must be part of authoritative payload');
 assert.equal(db.factionMasters[0].pix,'PIX-TESTE','confirmed PIX must replace local row');
 assert.equal(closed,1);assert(rendered>=1);assert(savedLocal>=1);

 saverCalls=[];values.mfpix.value='OUTRO-PIX';
 window.hlgbRecordSaveWithRetry=async(module,id,data,deleted)=>{saverCalls.push({module,id,data,deleted});return {applied:true,data:{...data,pix:'DIVERGENTE'},deleted_at:null,revision:3}};
 window.editFactionMaster(1);const bad=await modalCb();
 assert.equal(bad,false,'modal must stay open when cloud does not confirm exact PIX');
 assert.equal(closed,1,'failed confirmation must not close modal');
 assert.equal(alerts,1);

 window.hlgbRecordSaveWithRetry=async(module,id,data,deleted)=>({applied:true,data,deleted_at:deleted?'2026-09-21T13:31:00Z':null,revision:4});
 const del=await window.delFactionMaster(1);assert.equal(del,true);assert.equal(db.factionMasters.length,0);
 console.log('PASS faction master: PIX/edit/delete require authoritative per-record cloud confirmation.');
})().catch(e=>{console.error(e);process.exit(1)});