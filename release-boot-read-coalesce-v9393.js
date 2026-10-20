/* HLGB v93.93 — coalescência de leitura ampla somente no boot.
   Não altera gravação, WAL nem sincronização incremental. */
(function(){
'use strict';
const V='93.93',ACTIVE_MS=15000,REUSE_MS=8000;
if(window.HLGB_BOOT_READ_COALESCE_9393?.installed)return;
let installedAt=Date.now(),firstBroadAt=0,inFlight=null,lastAt=0,lastResult=null,coalesced=0,reused=0,wrapped=false;
function install(){
 const base=window.hlgbRecordLoadBundle;
 if(typeof base!=='function')return false;
 if(base.__hlgbBootCoalesce9393){wrapped=true;return true}
 const w=function(opts){
   const o=opts&&typeof opts==='object'?opts:{};
   const broad=o.since==null;
   if(!broad||o.force===true)return base.apply(this,arguments);
   const now=Date.now();
   if(!firstBroadAt)firstBroadAt=now;
   if(now-firstBroadAt>ACTIVE_MS)return base.apply(this,arguments);
   if(inFlight){coalesced++;return inFlight}
   if(lastResult&&now-lastAt<REUSE_MS){reused++;return Promise.resolve(lastResult)}
   let p;
   try{p=Promise.resolve(base.apply(this,arguments))}catch(e){throw e}
   inFlight=p;
   return p.then(r=>{lastResult=r;lastAt=Date.now();return r}).finally(()=>{if(inFlight===p)inFlight=null});
 };
 w.__hlgbBootCoalesce9393=true;w.__original=base;
 window.hlgbRecordLoadBundle=w;wrapped=true;return true;
}
function status(){return{version:V,installed:wrapped,installedAt,firstBroadAt,active:firstBroadAt?Date.now()-firstBroadAt<=ACTIVE_MS:true,coalesced,reused,inFlight:!!inFlight}}
window.HLGB_BOOT_READ_COALESCE_9393={version:V,installed:true,install,status};
install();[25,75,150,300,600,1000,1800,3000].forEach(ms=>setTimeout(install,ms));
console.info('[HLGB] v'+V+' coalescência de leitura de boot ativa');
})();
