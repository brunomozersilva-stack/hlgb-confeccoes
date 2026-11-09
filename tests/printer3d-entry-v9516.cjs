'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app9240.html','utf8');
const current=fs.readFileSync('app-stable3.html','utf8');
const audit=fs.readFileSync('release-internal-auditor.js','utf8');
const sw=fs.readFileSync('hlgb-canonical-sw.js','utf8');
const guard=source.match(/<script id="hlgb-canonical-entry-v9516">([\s\S]*?)<\/script>/)?.[1];
test('legacy guard is first script and redirects direct old URLs',()=>{
 assert.ok(guard,'guard missing');
 assert.ok(source.indexOf('hlgb-canonical-entry-v9516')<source.indexOf('hlgb-release-identity'),'must redirect before legacy app boot');
 for(const path of ['/hlgb-confeccoes/app9240.html','/hlgb-confeccoes/app9240']){
  let to='';const location={pathname:path,hash:'#foo',replace(url){to=url}};
  vm.runInNewContext(guard,{location,Date:{now:()=>12345}});
  assert.equal(to,'./abrir.html?source=legacy-app9240&fresh=12345#foo',path);
 }
});
test('router fetch of legacy HTML does not redirect recursively',()=>{
 let redirected=false;
 vm.runInNewContext(guard,{location:{pathname:'/hlgb-confeccoes/app-stable3.html',replace(){redirected=true}},Date});
 assert.equal(redirected,false);
 assert.match(current,/release-business-expansion-v9400\.js/);
 assert.match(current,/release-internal-auditor\.js/);
 assert.match(current,/<title>HLGB Confecções<\/title>/);
});
test('service worker intercepts legacy extensionless and .html navigations only',async()=>{
 let handler=null;
 const self={location:{origin:'https://test.test'},registration:{scope:'https://test.test/hlgb-confeccoes/'},addEventListener(type,fn){if(type==='fetch')handler=fn},skipWaiting(){},clients:{claim(){}}};
 const Response={redirect(url,status){return {url,status}}};
 vm.runInNewContext(sw,{self,URL,Date:{now:()=>12345},Response,Promise});
 assert.equal(typeof handler,'function');
 for(const ending of ['app9240','app9240.html']){
  let result;handler({request:{mode:'navigate',url:'https://test.test/hlgb-confeccoes/'+ending},respondWith(p){result=p}});
  assert.equal((await result).status,302,ending);
  assert.match((await result).url,/abrir\.html\?reroute=legacy/);
 }
 let hit=false;handler({request:{mode:'navigate',url:'https://test.test/hlgb-confeccoes/app-stable3.html'},respondWith(){hit=true}});
 assert.equal(hit,false);
});
test('auditor checks 3D pages, all navigation links, and canonical entry',()=>{
 for(const id of ['printer3dHome9400','printer3dProducts9400','printer3dSales9400','printer3dCatalog9400','printer3dNav9400','p3HomeNav9400','p3ProductsNav9400','p3SalesNav9400','p3CatalogNav9400'])assert.ok(audit.includes(id),'missing '+id);
 assert.ok(audit.includes("'nav:printer3d'"));
 assert.ok(audit.includes("'module:printer3d'"));
 assert.ok(audit.includes("'route:canonical-entry'"));
});
