from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

if 'HLGB v91.56 SNAPSHOT ACK + REDUNDANT SAVE FIX' in s:
    print('v91.56 already applied')
    raise SystemExit(0)

if 'HLGB v91.55 DURABLE WRITE-AHEAD LOG + CLOUD ACK + DEPLOY SAFE' not in s:
    raise SystemExit('v91.55 durable save layer not found')

old_norm = "function norm955(v){try{return JSON.stringify(v,Object.keys(v||{}).sort())}catch(e){try{return JSON.stringify(v)}catch(_){return String(v)}}}"
new_norm = "function stable955(v){if(Array.isArray(v))return v.map(stable955);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=stable955(v[k]);return o}return v}\nfunction norm955(v){try{return JSON.stringify(stable955(v))}catch(e){try{return JSON.stringify(v)}catch(_){return String(v)}}}"
if s.count(old_norm) != 1:
    raise SystemExit(f'norm955 target count={s.count(old_norm)}')
s = s.replace(old_norm, new_norm, 1)

old_ack = "async function ack955(k,out){const w=read955(),e=w.entries[k];if(!e)return;if(out?.applied!==true)return;archive955(e,out);delete w.entries[k];write955(w);await idbDel955(k);lastOk955=now955();lastErr955='';update955()}"
new_ack = "function syncSnap955(e,out,finalData){try{const map=hlgbRecordSnapshots?.[e.module];if(!(map instanceof Map))return;const id=String(e.id),prev=map.get(id)||{},stamp=String(out?.updated_at||out?.updatedAt||now955());if(e.deleted){map.set(id,{...prev,module:e.module,entity_id:id,data:C955(finalData??e.data),deleted_at:out?.deleted_at||stamp,updated_at:stamp,revision:out?.revision??prev.revision})}else{map.set(id,{...prev,module:e.module,entity_id:id,data:C955(finalData??out?.data??e.data),deleted_at:null,updated_at:stamp,revision:out?.revision??prev.revision})}}catch(err){console.warn('HLGB v91.56 snapshot ack',err)}}\nasync function ack955(k,out,finalData){const w=read955(),e=w.entries[k];if(!e)return;if(out?.applied!==true)return;syncSnap955(e,out,finalData);archive955(e,out);delete w.entries[k];write955(w);await idbDel955(k);lastOk955=now955();lastErr955='';update955()}"
if s.count(old_ack) != 1:
    raise SystemExit(f'ack955 target count={s.count(old_ack)}')
s = s.replace(old_ack, new_ack, 1)

repls = [
    (
        "await ack955(k,{applied:true,alreadyApplied:true});changed=true;continue",
        "await ack955(k,{applied:true,alreadyApplied:true},e.data);changed=true;continue",
        1,
    ),
    (
        "await ack955(k,out);applyData955(e.module,e.id,null,true);changed=true;continue",
        "await ack955(k,out,e.data);applyData955(e.module,e.id,null,true);changed=true;continue",
        1,
    ),
    (
        "await ack955(k,out);applyData955(e.module,e.id,C955(out.data||payload),false);changed=true",
        "await ack955(k,out,out.data||payload);applyData955(e.module,e.id,C955(out.data||payload),false);changed=true",
        1,
    ),
]
for old, new, expected in repls:
    if s.count(old) != expected:
        raise SystemExit(f'target count mismatch for {old[:45]!r}: {s.count(old)}')
    s = s.replace(old, new, expected)

old_direct_ack = "await ack955(e.key,out);return out"
if s.count(old_direct_ack) != 2:
    raise SystemExit(f'direct ack target count={s.count(old_direct_ack)}')
s = s.replace(old_direct_ack, "await ack955(e.key,out,out.data||data);return out")

old_scan = "async function scanDirty955(){try{if(!cloudReady955()||typeof HLGB_RECORD_MODULES==='undefined'||!Array.isArray(HLGB_RECORD_MODULES))return 0;let todo=[];for(const m of HLGB_RECORD_MODULES){const snap=hlgbRecordSnapshots?.[m];if(!(snap instanceof Map)||!Array.isArray(db?.[m]))continue;for(let i=0;i<db[m].length;i++){const r=db[m][i],id=rid955(m,r,i);if(!id)continue;const s=snap.get(String(id));if(!s||s.deleted_at||norm955(r)!==norm955(s.data)){todo.push([m,id,C955(r)]);if(todo.length>=40)break}}if(todo.length>=40)break}for(const [m,id,r] of todo)await enqueue955(m,id,r,false);if(todo.length)flush955(false);return todo.length}catch(e){console.warn('HLGB v91.55 dirty scan',e);return 0}}"
new_scan = "async function scanDirty955(){try{if(!cloudReady955()||typeof HLGB_RECORD_MODULES==='undefined'||!Array.isArray(HLGB_RECORD_MODULES))return 0;let todo=[];const pendingKeys=new Set(entries955().map(x=>x?.key).filter(Boolean));for(const m of HLGB_RECORD_MODULES){const snap=hlgbRecordSnapshots?.[m];if(!(snap instanceof Map)||!Array.isArray(db?.[m]))continue;for(let i=0;i<db[m].length;i++){const r=db[m][i],id=rid955(m,r,i);if(!id||pendingKeys.has(key955(m,id)))continue;const s=snap.get(String(id));if(!s||s.deleted_at||norm955(r)!==norm955(s.data)){todo.push([m,id,C955(r)]);if(todo.length>=40)break}}if(todo.length>=40)break}for(const [m,id,r] of todo)await enqueue955(m,id,r,false);if(todo.length)flush955(false);return todo.length}catch(e){console.warn('HLGB v91.56 dirty scan',e);return 0}}"
if s.count(old_scan) != 1:
    raise SystemExit(f'scanDirty955 target count={s.count(old_scan)}')
s = s.replace(old_scan, new_scan, 1)

old_wrap = "function wrapGeneric955(){const f=window.save;if(typeof f!=='function'||f.__hlgb955Generic)return;const w=function(){const out=f.apply(this,arguments);Promise.resolve(out).finally(()=>setTimeout(()=>scanDirty955(),20));return out};w.__hlgb955Generic=true;window.save=w}"
new_wrap = "function wrapGeneric955(){const f=window.save;if(typeof f!=='function'||f.__hlgb955Generic)return;const w=function(){const out=f.apply(this,arguments);Promise.resolve(out).finally(()=>{try{clearTimeout(window.__hlgb955DirtyTimer)}catch(_){}window.__hlgb955DirtyTimer=setTimeout(()=>scanDirty955(),250)});return out};w.__hlgb955Generic=true;window.save=w}"
if s.count(old_wrap) != 1:
    raise SystemExit(f'wrapGeneric955 target count={s.count(old_wrap)}')
s = s.replace(old_wrap, new_wrap, 1)

if "const VER955='91.55';" in s:
    s = s.replace("const VER955='91.55';", "const VER955='91.56';", 1)

s = s.replace('v91.55 Multiusuário', 'v91.56 Multiusuário')
s = s.replace('Versão v91.55', 'Versão v91.56')
s = s.replace('>v91.55<', '>v91.56<')

marker = '<!-- HLGB v91.56 SNAPSHOT ACK + REDUNDANT SAVE FIX -->'
pos = s.rfind('</body>')
if pos < 0:
    raise SystemExit('index.html without </body>')
s = s[:pos] + marker + '\n' + s[pos:]

p.write_text(s, encoding='utf-8')
print('v91.56 snapshot ack + redundant save fix applied')
