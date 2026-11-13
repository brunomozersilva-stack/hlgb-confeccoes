'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('release-business-expansion-v9400.js','utf8');
assert.match(src,/p3Upload9578/);
assert.match(src,/attachPhotos9578\(p\)/);
assert.match(src,/attachPhotos9578\(n\)/);
assert.match(src,/p\.imagesV9578\.map\(img=>/);
const start=src.indexOf('async function photoData9578('),end=src.indexOf('window.new3dProduct9400=()=>',start);
assert(start>=0&&end>start);
const helpers=src.slice(start,end);
let selected=[],remove=[],photoNumber=0;
const canvas={width:0,height:0,getContext(){return {drawImage(){}}},toDataURL(){return 'data:image/jpeg;base64,'+'X'.repeat(24000)}};
const doc={getElementById(id){if(id==='p3Upload9578')return {files:selected};return null},
 querySelectorAll(){return remove.map(id=>({dataset:{p3RemovePhoto:id}}))},createElement(){return canvas}};
class FakeImage{naturalWidth=720;naturalHeight=680;onload=null;onerror=null;set src(x){if(this.onload)this.onload()}}
const ctx={document:doc,Image:FakeImage,URL:{createObjectURL:()=>'/fake.jpg',revokeObjectURL(){}},Date,Math,
 sid:x=>String(x??''),uid:()=> 'img-'+(++photoNumber),nowIso:()=>new Date().toISOString(),console,
 Promise,Set};
vm.createContext(ctx);
vm.runInContext(helpers+';globalThis.__photos={attachPhotos9578,photoData9578};',ctx);
const api=ctx.__photos;
const file=(name,type='image/jpeg',size=12000)=>({name,type,size});
(async()=>{
 selected=[file('frente.jpg'),file('costas.png','image/png')];
 let p={id:'p3d-1',name:'Jogo da velha',imageUrl:''};
 await api.attachPhotos9578(p);
 assert.equal(p.imagesV9578.length,2);
 assert(p.imagesV9578[0].src.startsWith('data:image/jpeg;base64,'));
 assert.equal(p.imageUrl,p.imagesV9578[0].src);
 assert.equal(p.imagesV9578[1].name,'costas.png');
 selected=[];remove=[p.imagesV9578[0].id];await api.attachPhotos9578(p);
 assert.equal(p.imagesV9578.length,1);assert.equal(p.imageUrl,p.imagesV9578[0].src);
 const preserved=p.imagesV9578[0].src;
 remove=[];await api.attachPhotos9578(p);
 assert.equal(p.imageUrl,preserved,'editing non-photo fields must keep the photo');
 selected=[file('a.jpg'),file('b.jpg'),file('c.jpg')];
 await assert.rejects(()=>api.attachPhotos9578(p),/até 3 fotos/);
 selected=[file('evil.txt','text/plain')];
 await assert.rejects(()=>api.attachPhotos9578({...p,imagesV9578:[]}),/imagem válida/);
 selected=[file('giant.jpg','image/jpeg',9*1024*1024)];
 await assert.rejects(()=>api.attachPhotos9578({...p,imagesV9578:[]}),/8 MB/);
 console.log('PASS 3D v95.78: upload JPG/PNG, optimized, principal photo, removal, capacity, previous image preserved; no server/schema changes');
})().catch(e=>{console.error(e);process.exitCode=1});
