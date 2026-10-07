const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const manifest=JSON.parse(read('release.json'));
assert(['93.16','93.17','93.18','93.19','93.20','93.21'].includes(manifest.version),'canonical manifest must publish a supported canonical version');
assert.equal(manifest.entry,'abrir.html','canonical manifest must enter through abrir.html');
assert.equal(manifest.force_canonical,true,'canonical routing must stay forced');
const index=read('index.html'),abrir=read('abrir.html'),stable3=read('app-stable3.html'),sw=read('hlgb-canonical-sw.js'),gate=read('release-safety-gate-v9269.js');
assert(index.includes('abrir.html'),'index must route through abrir.html');
assert(abrir.includes('app-stable3.html'),'abrir must route to app-stable3');
assert(stable3.includes("fetch('./app9240.html?fresh='+ts"),'app-stable3 must load current app9240 payload');
assert(sw.includes("const CANONICAL='abrir.html'"),'service worker must route legacy navigation to abrir.html');
assert(sw.includes("/^sistema-v\\d+\\.html$/"),'service worker must protect sistema-v legacy routes');
assert(gate.includes("m?.entry||'abrir.html'"),'safety gate must obey canonical manifest entry');
for(let n=9213;n<=9239;n++){
  const f=`app${n}.html`,src=read(f);
  assert(src.includes('abrir.html'),`${f} must be retired to abrir.html`);
  assert(!src.includes('id="appShell"')&&!src.includes("id='appShell'"),`${f} must not remain an operable historical app`);
}
for(const f of ['app-stable.html','app-stable2.html','sistema-v9173.html','sistema-v9174.html']){
  const src=read(f);assert(src.includes('abrir.html'),`${f} must route to abrir.html`);
}
for(let n=9241;n<=9245;n++){
  const f=`app${n}.html`,src=read(f);assert(src.includes('index.html')||src.includes('abrir.html'),`${f} must route into canonical entry chain`);
}
console.log('PASS canonical routing: manifest, safety gate, service worker and historical user-facing HTML routes are forced into abrir.html.');
