'use strict';
(function(root,api){if(typeof module==='object'&&module.exports)module.exports=api;else root.HLGBCutDossier9661=api})(typeof globalThis==='object'?globalThis:this,(function dossierFactory(){
 const utf8=s=>{const a=[];for(const c of String(s)){const n=c.codePointAt(0);if(n<128)a.push(n);else if(n<2048)a.push(192|n>>6,128|n&63);else if(n<65536)a.push(224|n>>12,128|n>>6&63,128|n&63);else a.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|n&63)}return Uint8Array.from(a)};
 const crc32=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0};
 const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
 const join=parts=>{const out=new Uint8Array(parts.reduce((s,x)=>s+x.length,0));let n=0;for(const x of parts){out.set(x,n);n+=x.length}return out};
 function zip(files){
  if(!Array.isArray(files)||!files.length||files.length>5)throw Error('invalid-files');
  const local=[],central=[],names=new Set();let offset=0;
  for(const f of files){
   if(typeof f.name!=='string'||!f.name||f.name.length>180||/[\\/\u0000-\u001f\u007f]/.test(f.name)||f.name==='.'||f.name==='..'||names.has(f.name)||!(f.bytes instanceof Uint8Array)||f.bytes.length>16*1024*1024)throw Error('invalid-file');names.add(f.name);
   const name=utf8(f.name),crc=crc32(f.bytes),l=new Uint8Array(30),v=new DataView(l.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,f.bytes.length,true);v.setUint32(22,f.bytes.length,true);v.setUint16(26,name.length,true);
   const c=new Uint8Array(46),w=new DataView(c.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,33,true);w.setUint32(16,crc,true);w.setUint32(20,f.bytes.length,true);w.setUint32(24,f.bytes.length,true);w.setUint16(28,name.length,true);w.setUint32(42,offset,true);
   local.push(l,name,f.bytes);central.push(c,name);offset+=l.length+name.length+f.bytes.length;
  }
  if(offset>17*1024*1024)throw Error('archive-limit');
  const directory=join(central),end=new Uint8Array(22),d=new DataView(end.buffer);d.setUint32(0,0x06054b50,true);d.setUint16(8,files.length,true);d.setUint16(10,files.length,true);d.setUint32(12,directory.length,true);d.setUint32(16,offset,true);return join([...local,directory,end]);
 }
 async function build(row,draft,files,checklist,digest){
  if(!row||!Array.isArray(files)||files.length>3||typeof digest!=='function'||typeof checklist?.review!=='function')throw Error('invalid-input');
  const observed=checklist.review(row,draft);if(!['shortage-observed','reviewed-locally'].includes(observed.state))throw Error('incomplete-or-stale');
  const snapshotHash=await digest(utf8(draft.signature));if(!hash(snapshotHash))throw Error('hash-unavailable');
  const docs=[],names=new Set(),parts=[];
  for(let i=0;i<files.length;i++){const f=files[i];if(!(f.bytes instanceof Uint8Array)||f.bytes.length>checklist.maxBytes)throw Error('file-size');const info=checklist.fileInfo(f.name,f.bytes.length,f.bytes.slice(0,12));if(!info)throw Error('file-type');const sha256=await digest(f.bytes);if(!hash(sha256)||names.has(sha256))throw Error('duplicate-or-invalid-hash');names.add(sha256);const filename=(i+1)+'-'+info.name;docs.push({...info,filename,sha256});parts.push({name:filename,bytes:f.bytes})}
  const manifest={format:'hlgb-cut-dossier-local-v1',state:'local-export-only',orderId:row.orderId,orderNumber:row.orderNumber,productId:row.productId,productName:row.productName,cutId:row.cutId||null,snapshotHash,ordered:row.ordered,grade:row.grade,issues:row.issues,responsible:observed.responsible,note:observed.note,lines:observed.lines,documents:docs,confirmed:false,stockChanged:false,uploaded:false};
  const txt=['HLGB — CONFERÊNCIA LOCAL (NÃO CONFIRMA SEPARAÇÃO)','Pedido '+row.orderNumber+' | Modelo '+row.productName,'Responsável informado: '+observed.responsible,'Peças pedidas: '+row.ordered,...row.grade.map(g=>g.color+' '+g.size+': '+g.qty),'Materiais:',...observed.lines.map(l=>l.name+' | estimado '+l.estimated+' | informado '+l.actual+' | falta '+l.shortage+' '+l.unit+' | '+l.note),'Observações: '+observed.note,'Documentos: '+docs.map(x=>x.filename).join(', '),'SHA-256 do contexto: '+snapshotHash,'Arquivo local, não enviado à nuvem.'].join('\r\n');
  return {manifest,bytes:zip([{name:'conferencia.txt',bytes:utf8(txt)},{name:'manifesto.json',bytes:utf8(JSON.stringify(manifest,null,2))},...parts])};
 }
 return {utf8,crc32,zip,build};
})());
