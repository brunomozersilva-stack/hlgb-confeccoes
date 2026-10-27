from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"{label}: esperado 1 trecho, encontrado {count}")
    p.write_text(s.replace(old, new, 1))


# 1) app-stable3: o roteador deve reconhecer o bloco ATUAL de restauração do app9240.
# O renderAll fica dentro da entrada restaurada, depois que appShell foi liberado e authReady marcado.
p = Path("app-stable3.html")
s = p.read_text()
start = s.find("const autoOpenOld=")
marker = "if(h.includes(autoOpenOld))h=h.split(autoOpenOld).join(autoOpenNew);else console.warn('[HLGB v94.06] trecho de restauração automática não localizado; gate v94.07 continua ativo');"
end = s.find(marker, start)
if start < 0 or end < 0:
    raise SystemExit("app-stable3: bloco v94.06 antigo não encontrado")
end += len(marker)
new_block = '''const autoOpenCurrent=`loginScreen.style.display="none";sessionLoader.style.display="none";appShell.style.display="block";window.hlgbMarkAuthenticated?.();applyAccess();restoreNavGroups();\n   {const prevApplying=cloudApplying;cloudApplying=true;try{renderAll()}finally{cloudApplying=prevApplying}}`;
const autoOpenNew=`sessionLoader.style.display="none";appShell.style.display="none";loginScreen.style.display="flex";window.__HLGB_RESTORED_SESSION_READY=true;window.__HLGB_RESTORED_SESSION_ENTER=function(){if(!window.__HLGB_RESTORED_SESSION_READY)return false;window.__HLGB_RESTORED_SESSION_READY=false;loginScreen.style.display="none";sessionLoader.style.display="none";appShell.style.display="block";window.hlgbMarkAuthenticated?.();applyAccess();restoreNavGroups();{const prevApplying=cloudApplying;cloudApplying=true;try{renderAll()}finally{cloudApplying=prevApplying}}return true};`;
if(h.includes(autoOpenCurrent))h=h.split(autoOpenCurrent).join(autoOpenNew);else console.warn('[HLGB v94.08] trecho atual de restauração não localizado; gate v94.07 continua ativo');'''
p.write_text(s[:start] + new_block + s[end:])


# 2) Autoridade única WAL: considerar localStorage + IndexedDB na poda confirmada.
wal = "release-wal-single-authority-v9339.js"
s = Path(wal).read_text()
needle = "function idbDeleteSame(key,opId){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve(false);return}let r;try{r=indexedDB.open(DB_NAME)}catch(e){resolve(false);return}r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(e){};resolve(false)};r.onerror=()=>resolve(false);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve(false);return}const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),g=s.get(key);g.onsuccess=()=>{const cur=g.result;if(cur&&sid(cur.opId)===sid(opId))s.delete(key)};tx.oncomplete=()=>{d.close();resolve(true)};tx.onerror=tx.onabort=()=>{d.close();resolve(false)}}catch(e){try{d.close()}catch(_){}resolve(false)}}})}"
idb_all = "function idbAll(){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve([]);return}let r;try{r=indexedDB.open(DB_NAME)}catch(e){resolve([]);return}r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(e){};resolve([])};r.onerror=()=>resolve([]);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve([]);return}const tx=d.transaction(STORE,'readonly'),s=tx.objectStore(STORE),g=s.getAll();g.onsuccess=()=>{const out=Array.isArray(g.result)?g.result:[];try{d.close()}catch(_){}resolve(out)};g.onerror=()=>{try{d.close()}catch(_){}resolve([])}}catch(e){try{d.close()}catch(_){}resolve([])}}})}\nfunction newerWal(a,b){const ta=Date.parse(a?.updatedAt||a?.createdAt||'')||0,tb=Date.parse(b?.updatedAt||b?.createdAt||'')||0;return tb>ta?b:a}\nasync function mergedWalEntries(){const w=readWal(),out={...(w?.entries||{})};try{for(const e of await idbAll()){const key=sid(e?.key);if(!key)continue;out[key]=out[key]?newerWal(out[key],e):e}}catch(e){}return out}\n"
if needle not in s:
    raise SystemExit("wal authority: idbDeleteSame não encontrado")
s = s.replace(needle, idb_all + needle, 1)
old = "async function confirmRemove(key,opId){const w=readWal();const cur=w?.entries?.[key];if(!cur||sid(cur.opId)!==sid(opId))return false;delete w.entries[key];if(!writeWal(w))return false;await idbDeleteSame(key,opId);return true}"
new = "async function confirmRemove(key,opId){const w=readWal();const cur=w?.entries?.[key]||null;let idbCur=null;try{idbCur=(await idbAll()).find(x=>sid(x?.key)===sid(key))||null}catch(e){}let matched=false;if(cur&&sid(cur.opId)===sid(opId)){delete w.entries[key];if(!writeWal(w))return false;matched=true}if(idbCur&&sid(idbCur.opId)===sid(opId)){await idbDeleteSame(key,opId);matched=true}return matched}"
if old not in s:
    raise SystemExit("wal authority: confirmRemove não encontrado")
s = s.replace(old, new, 1)
old = "const w=readWal();const items=Object.entries(w?.entries||{}).slice(0,Math.max(1,max));"
new = "const items=Object.entries(await mergedWalEntries()).slice(0,Math.max(1,max));"
if old not in s:
    raise SystemExit("wal authority: leitura local-only não encontrada")
s = s.replace(old, new, 1)
s = s.replace("/* HLGB v93.49 — autoridade única do replay WAL + poda somente após confirmação da nuvem.", "/* HLGB v93.50 — autoridade única do replay WAL + poda somente após confirmação da nuvem.", 1)
s = s.replace("const V='93.49'", "const V='93.50'", 1)
Path(wal).write_text(s)


# 3) Replay confirmado: uma operação real preservada só no IndexedDB também precisa ser reenviada.
replay = "release-wal-confirmed-replay-v9333.js"
s = Path(replay).read_text()
needle = "function idbPut(entry,key){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve(false);return}let r;try{r=indexedDB.open(DB)}catch(e){resolve(false);return}r.onupgradeneeded=()=>{try{const d=r.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'key'})}catch(e){}};r.onerror=()=>resolve(false);r.onsuccess=()=>{const d=r.result;try{const tx=d.transaction(STORE,'readwrite'),s=tx.objectStore(STORE),v={...clone(entry),key:key||entry?.key};s.put(v);tx.oncomplete=()=>{d.close();resolve(true)};tx.onerror=tx.onabort=()=>{d.close();resolve(false)}}catch(e){try{d.close()}catch(_){}resolve(false)}}})}"
idb_all = "function idbAll(){return new Promise(resolve=>{if(typeof indexedDB==='undefined'){resolve([]);return}let r;try{r=indexedDB.open(DB)}catch(e){resolve([]);return}r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(e){};resolve([])};r.onerror=()=>resolve([]);r.onsuccess=()=>{const d=r.result;try{if(!d.objectStoreNames.contains(STORE)){d.close();resolve([]);return}const tx=d.transaction(STORE,'readonly'),s=tx.objectStore(STORE),g=s.getAll();g.onsuccess=()=>{const out=Array.isArray(g.result)?g.result:[];try{d.close()}catch(_){}resolve(out)};g.onerror=()=>{try{d.close()}catch(_){}resolve([])}}catch(e){try{d.close()}catch(_){}resolve([])}}})}\nfunction newerWal(a,b){const ta=Date.parse(a?.updatedAt||a?.createdAt||'')||0,tb=Date.parse(b?.updatedAt||b?.createdAt||'')||0;return tb>ta?b:a}\nasync function combinedEntries(){const w=readWal(),out={...(w.entries||{})};try{for(const e of await idbAll()){const key=sid(e?.key);if(!key)continue;out[key]=out[key]?newerWal(out[key],e):e}}catch(e){}return out}\n"
if needle not in s:
    raise SystemExit("confirmed replay: idbPut não encontrado")
s = s.replace(needle, needle + "\n" + idb_all, 1)
old = "async function markAttempt(key,op){const w=readWal(),cur=w.entries?.[key];if(!cur||sid(cur.opId)!==sid(op.opId))return null;const now=new Date().toISOString();cur.attempts=(+cur.attempts||0)+1;cur.lastAttemptAt=now;cur.updatedAt=now;cur.lastError='';cur.state='sending';w.entries[key]=cur;if(!writeWal(w))return null;await idbPut(cur,key);return clone(cur)}"
new = "async function markAttempt(key,op){const w=readWal();let cur=w.entries?.[key]||null;if(!cur||sid(cur.opId)!==sid(op.opId)){try{cur=(await idbAll()).find(x=>sid(x?.key)===sid(key)&&sid(x?.opId)===sid(op.opId))||null}catch(e){cur=null}}if(!cur)return null;const now=new Date().toISOString();cur.attempts=(+cur.attempts||0)+1;cur.lastAttemptAt=now;cur.updatedAt=now;cur.lastError='';cur.state='sending';if(w.entries?.[key]&&sid(w.entries[key].opId)===sid(cur.opId)){w.entries[key]=cur;writeWal(w)}await idbPut(cur,key);return clone(cur)}"
if old not in s:
    raise SystemExit("confirmed replay: markAttempt não encontrado")
s = s.replace(old, new, 1)
old = "async function markFailure(key,opId,err){const w=readWal(),cur=w.entries?.[key];if(!cur||sid(cur.opId)!==sid(opId))return false;cur.lastError=sid(err?.message||err).slice(0,1200);cur.updatedAt=new Date().toISOString();cur.state='pending';w.entries[key]=cur;writeWal(w);await idbPut(cur,key);return true}"
new = "async function markFailure(key,opId,err){const w=readWal();let cur=w.entries?.[key]||null;if(!cur||sid(cur.opId)!==sid(opId)){try{cur=(await idbAll()).find(x=>sid(x?.key)===sid(key)&&sid(x?.opId)===sid(opId))||null}catch(e){cur=null}}if(!cur)return false;cur.lastError=sid(err?.message||err).slice(0,1200);cur.updatedAt=new Date().toISOString();cur.state='pending';if(w.entries?.[key]&&sid(w.entries[key].opId)===sid(cur.opId)){w.entries[key]=cur;writeWal(w)}await idbPut(cur,key);return true}"
if old not in s:
    raise SystemExit("confirmed replay: markFailure não encontrado")
s = s.replace(old, new, 1)
old = "async function confirmRemove(key,opId){const w=readWal(),cur=w.entries?.[key];if(cur&&sid(cur.opId)===sid(opId)){delete w.entries[key];writeWal(w)}await idbDeleteIfSame(key,opId);return true}"
new = "async function confirmRemove(key,opId){const w=readWal(),cur=w.entries?.[key]||null;let idbCur=null;try{idbCur=(await idbAll()).find(x=>sid(x?.key)===sid(key))||null}catch(e){}let matched=false;if(cur&&sid(cur.opId)===sid(opId)){delete w.entries[key];if(!writeWal(w))return false;matched=true}if(idbCur&&sid(idbCur.opId)===sid(opId)){await idbDeleteIfSame(key,opId);matched=true}return matched}"
if old not in s:
    raise SystemExit("confirmed replay: confirmRemove não encontrado")
s = s.replace(old, new, 1)
old = "const w=readWal(),items=Object.entries(w.entries||{});"
new = "const items=Object.entries(await combinedEntries());"
if old not in s:
    raise SystemExit("confirmed replay: run local-only não encontrado")
s = s.replace(old, new, 1)
old = "intervalId=setInterval(()=>{if(Object.keys(readWal().entries||{}).length)run('interval',false).catch(()=>{})},15000);"
new = "intervalId=setInterval(()=>{run('interval',false).catch(()=>{})},15000);"
if old not in s:
    raise SystemExit("confirmed replay: intervalo local-only não encontrado")
s = s.replace(old, new, 1)
s = s.replace("/* HLGB v93.38 — reenvio confirmado do WAL durável.", "/* HLGB v93.50 — reenvio confirmado do WAL durável.", 1)
s = s.replace("const V='93.38'", "const V='93.50'", 1)
Path(replay).write_text(s)


# 4) Regressão do roteador real usado no Safari.
Path("tests/audit-app-stable3-restored-render-regression.cjs").write_text(r'''\
'use strict';
const fs=require('fs'),assert=require('assert');
const router=fs.readFileSync('app-stable3.html','utf8');
const app=fs.readFileSync('app9240.html','utf8');
const cur=router.match(/const autoOpenCurrent=`([\s\S]*?)`;/);
const next=router.match(/const autoOpenNew=`([\s\S]*?)`;/);
assert(cur&&next,'roteador deve expor os blocos atual e transformado da restauração');
assert(app.includes(cur[1]),'roteador precisa reconhecer exatamente o bloco atual do app9240');
assert(router.includes('if(h.includes(autoOpenCurrent))h=h.split(autoOpenCurrent).join(autoOpenNew)'),'roteador deve aplicar o replace atual');
const n=next[1],show=n.indexOf('appShell.style.display="block"'),auth=n.indexOf('window.hlgbMarkAuthenticated?.();'),render=n.indexOf('renderAll()');
assert(show>=0&&auth>show&&render>auth,'entrada restaurada deve mostrar app, marcar authReady e só então renderizar');
assert(!n.includes('setTimeout(()=>window.hlgbMarkAuthenticated?.(),0)'),'restauração do roteador não deve adiar authReady');
console.log('OK app-stable3 restore: app visível -> authReady -> renderAll.');
''')


# 5) Regressão dinâmica: IDB-only equivalente é podado; IDB-only real é reenviado.
Path("tests/audit-wal-idb-only-regression.cjs").write_text(r'''\
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const clone=v=>JSON.parse(JSON.stringify(v));
function fakeIdb(entries){
  const store=new Map(entries.map(e=>[String(e.key),clone(e)]));
  const indexedDB={open(){
    const req={};
    queueMicrotask(()=>{
      const db={objectStoreNames:{contains:n=>n==='entries'},close(){},transaction(){
        const tx={oncomplete:null,onerror:null,onabort:null};
        const os={
          getAll(){const q={};queueMicrotask(()=>{q.result=[...store.values()].map(clone);q.onsuccess&&q.onsuccess()});return q},
          get(key){const q={};queueMicrotask(()=>{q.result=store.has(String(key))?clone(store.get(String(key))):undefined;q.onsuccess&&q.onsuccess()});return q},
          put(v){store.set(String(v.key),clone(v))},
          delete(key){store.delete(String(key))}
        };
        tx.objectStore=()=>os;
        queueMicrotask(()=>queueMicrotask(()=>tx.oncomplete&&tx.oncomplete()));
        return tx
      }};
      req.result=db;req.onsuccess&&req.onsuccess()
    });
    return req
  }};
  return {indexedDB,store}
}
function baseContext(indexedDB,window,localStorage){
  return {window,localStorage,indexedDB,navigator:{onLine:true},document:{getElementById:id=>id==='appShell'?{}:id==='loginScreen'?{style:{display:'none'}}:null,querySelector:()=>null,readyState:'complete',addEventListener(){}},getComputedStyle:el=>({display:el?.style?.display||'block'}),console,structuredClone:global.structuredClone,URL,Promise,Date,JSON,Object,Array,String,Number,Math,encodeURIComponent,queueMicrotask,setTimeout:(fn)=>{queueMicrotask(fn);return 1},clearTimeout(){},setInterval:()=>1,clearInterval(){}}
}
const pending={id:1793032272043,cutId:1793031962977,orderId:1793031962976,productId:1788434159326,op:'PED-1793031962976',product:'Conjunto Gigi',client:'Dell',color:'',size:'',planned:372,done:0,stage:'Aguardando atribuição',productionLocationId:null,factionId:null,date:'2026-10-26',assignmentSource:true,cutProductKey:'1793031962977:1788434159326',cutEffectiveQtyV9240:true};
const entry={key:'production|1793032272043',opId:'op-idb-only',module:'production',id:'1793032272043',deleted:false,data:pending,createdAt:'2026-10-26T19:36:49.218Z',updatedAt:'2026-10-26T19:36:49.264Z',attempts:1,state:'pending'};
(async()=>{
  {
    const src=fs.readFileSync('release-wal-single-authority-v9339.js','utf8'),mem=new Map();
    const localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
    const idb=fakeIdb([entry]);
    const remote={...pending,id:1793032752538,cutEffectiveQtyV9246:true,cutQuantityLinkedV9246:true};
    const window={HLGB_RELEASE_VERSION:'93.50',addEventListener(){},hlgb955FlushSilent:async()=>true,hlgbWalConfirmedReplay9333:{version:'93.50',state:{busy:false},run:async()=>true},cloudRequest:async q=>q.includes('entity_id=eq.1793032272043')?[]:q.includes('data->>cutProductKey=eq.')?[{module:'production',entity_id:'1793032752538',data:remote,deleted_at:null}]:[]};
    const ctx=baseContext(idb.indexedDB,window,localStorage);vm.createContext(ctx);vm.runInContext(src,ctx);
    const out=await window.hlgbWalSingleAuthority9339.pruneConfirmed(true,8);
    assert.strictEqual(out.removed,1,'equivalente IDB-only deveria ser podado');
    assert.strictEqual(out.equivalent.length,1,'poda deve registrar substituição equivalente');
    assert.strictEqual(idb.store.size,0,'equivalente IDB-only deve sair do IndexedDB');
  }
  {
    const src=fs.readFileSync('release-wal-confirmed-replay-v9333.js','utf8'),mem=new Map(),calls=[];
    const localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
    const genuine={...entry,key:'finance|idb-real',opId:'op-real',module:'finance',id:'idb-real',data:{id:'idb-real',value:99}};
    const idb=fakeIdb([genuine]);
    const window={HLGB_RELEASE_VERSION:'93.50',addEventListener(){},hlgbRecordSaveWithRetry:async(...args)=>{calls.push(args);return {applied:true}}};
    const ctx=baseContext(idb.indexedDB,window,localStorage);vm.createContext(ctx);vm.runInContext(src,ctx);
    const ok=await window.hlgbWalConfirmedReplay9333.run('idb-only-test',true);
    assert.strictEqual(ok,true,'replay IDB-only deveria concluir');
    assert.strictEqual(calls.length,1,'operação IDB-only real deve ser reenviada');
    assert.strictEqual(idb.store.size,0,'WAL IDB-only só sai após confirmação applied:true');
  }
  console.log('OK WAL IDB-only: poda equivalente + replay real confirmados.');
})().catch(e=>{console.error(e);process.exitCode=1});
''')
