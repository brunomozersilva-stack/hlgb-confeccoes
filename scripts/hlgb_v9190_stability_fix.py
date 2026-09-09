from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
before=len(s)
MARK='HLGB_V9190_CLOUD_STABILITY'

if MARK in s:
    print('v91.90 already applied')
    raise SystemExit(0)

# 1) Recuperações antigas continuam disponíveis manualmente, mas não podem mais rodar sozinhas
# a cada login. Elas estavam regravando dados já corretos e disparando novos refreshes.
auto_forensic="setTimeout(()=>window.hlgb9149RecoverNow(false),1500);"
auto_legacy="setTimeout(recoverLegacy949,3200);"
if s.count(auto_forensic)!=1:
    raise SystemExit(f'ERRO: auto recovery forensic esperado 1 vez, encontrado {s.count(auto_forensic)}')
if s.count(auto_legacy)!=1:
    raise SystemExit(f'ERRO: auto recovery legacy esperado 1 vez, encontrado {s.count(auto_legacy)}')
s=s.replace(auto_forensic,"/* v91.90: recuperação forense somente manual */",1)
s=s.replace(auto_legacy,"/* v91.90: recuperação legada somente manual */",1)

# 2) Um item já confirmado não pode reaparecer vindo do IndexedDB se a exclusão local atrasou.
old_merge="async function mergeIdb955(){const a=await idbAll955();if(!a.length)return;const w=read955();let ch=false;for(const e of a){if(!e?.key)continue;const cur=w.entries[e.key];if(!cur||String(e.updatedAt||'')>String(cur.updatedAt||'')){w.entries[e.key]=e;ch=true}}if(ch)write955(w)}"
new_merge="""function archivedOps990(){try{let a=JSON.parse(localStorage.getItem(ARC955)||'[]');if(!Array.isArray(a))a=[];return new Set(a.filter(x=>x?.opId&&x?.key&&x?.applied!==false).map(x=>String(x.opId)+'|'+String(x.key)))}catch(e){return new Set()}}
async function mergeIdb955(){const a=await idbAll955();if(!a.length)return;const acked=archivedOps990(),w=read955();let ch=false;for(const e of a){if(!e?.key)continue;const tag=String(e.opId||'')+'|'+String(e.key||'');if(e.opId&&acked.has(tag)){await idbDel955(e.key);continue}const cur=w.entries[e.key];if(!cur||String(e.updatedAt||'')>String(cur.updatedAt||'')){w.entries[e.key]=e;ch=true}}if(ch)write955(w)}"""
if s.count(old_merge)!=1:
    raise SystemExit(f'ERRO: mergeIdb955 esperado 1 vez, encontrado {s.count(old_merge)}')
s=s.replace(old_merge,new_merge,1)

# 3) Reconciliação segura: se a nuvem já contém exatamente a alteração pendente, apenas confirma
# a fila local. Metadados de recuperação/horário não contam como alteração de negócio.
needle="function applyData955(m,id,data,deleted){try{if(!Array.isArray(db?.[m]))return;if(deleted){db[m]=db[m].filter((x,i)=>rid955(m,x,i)!==String(id));return}let i=db[m].findIndex((x,n)=>rid955(m,x,n)===String(id));if(i>=0)db[m][i]=C955(data);else db[m].push(C955(data))}catch(e){}}"
if s.count(needle)!=1:
    raise SystemExit(f'ERRO: applyData955 esperado 1 vez, encontrado {s.count(needle)}')
helpers=r"""
const META990=new Set(['updatedAt','recoveredAt','recoveredBy','recoverySource']);
const own990=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
function stripMeta990(v){if(Array.isArray(v))return v.map(stripMeta990);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v)){if(META990.has(k))continue;o[k]=stripMeta990(v[k])}return o}return v}
function eqBusiness990(a,b){return norm955(stripMeta990(a))===norm955(stripMeta990(b))}
function deltaSatisfied990(base,wanted,latest){
 if(eqBusiness990(base,wanted))return true;
 if(Array.isArray(base)||Array.isArray(wanted)||Array.isArray(latest))return eqBusiness990(wanted,latest);
 const bo=base&&typeof base==='object',wo=wanted&&typeof wanted==='object',lo=latest&&typeof latest==='object';
 if(wo&&lo){const b=bo?base:{},keys=new Set([...Object.keys(b),...Object.keys(wanted)]);for(const k of keys){if(META990.has(k))continue;const bh=own990(b,k),wh=own990(wanted,k),lh=own990(latest,k);if(bh&&wh&&eqBusiness990(b[k],wanted[k]))continue;if(!bh&&!wh)continue;if(!wh){if(lh)return false;continue}if(!lh)return false;if(!deltaSatisfied990(bh?b[k]:undefined,wanted[k],latest[k]))return false}return true}
 return eqBusiness990(wanted,latest)
}
function pendingSatisfied990(e,s){if(!s)return false;if(e.deleted===true)return !!s.deleted_at;if(s.deleted_at)return false;if(norm955(e.data)===norm955(s.data))return true;if(eqBusiness990(e.data,s.data))return true;if(e.baseData!==undefined&&e.baseData!==null)return deltaSatisfied990(e.baseData,e.data,s.data);return false}
"""
s=s.replace(needle,needle+helpers,1)

loop_old="for(const e of es){const k=e.key,s=snap955(e.module,e.id);try{if(e.deleted){"
loop_new="for(const e of es){const k=e.key,s=snap955(e.module,e.id);try{if(s&&pendingSatisfied990(e,s)){await ack955(k,{applied:true,alreadyApplied:true,updated_at:s.updated_at,revision:s.revision,deleted_at:s.deleted_at,data:C955(s.data)},C955(s.data));if(!e.deleted&&!s.deleted_at)applyData955(e.module,e.id,C955(s.data),false);continue}if(e.deleted){"
if s.count(loop_old)!=1:
    raise SystemExit(f'ERRO: início do flush esperado 1 vez, encontrado {s.count(loop_old)}')
s=s.replace(loop_old,loop_new,1)

# 4) O flush em segundo plano não pode redesenhar a aplicação inteira. Os dados locais já estão
# na tela; confirmação da nuvem só precisa persistir e atualizar o indicador.
tail_old="if(changed){try{localSaveOnly()}catch(_){}try{if(!document.getElementById('modal')?.classList.contains('show'))renderAll()}catch(_){}}update955();return count955()===0"
tail_new="if(changed){try{localSaveOnly()}catch(_){}}update955();return count955()===0"
if s.count(tail_old)!=1:
    raise SystemExit(f'ERRO: redraw do flush esperado 1 vez, encontrado {s.count(tail_old)}')
s=s.replace(tail_old,tail_new,1)

# 5) Identificação visual da versão, sem alterar marcadores históricos dos patches.
s=s.replace('Versão v91.89','Versão v91.90')
s=s.replace('v91.89 Multiusuário','v91.90 Multiusuário')
s=s.replace("logo.textContent!=='v91.89'","logo.textContent!=='v91.90'")
s=s.replace("logo.textContent='v91.89'","logo.textContent='v91.90'")
s=s.replace("el.textContent!=='v91.89'","el.textContent!=='v91.90'")
s=s.replace("el.textContent='v91.89'","el.textContent='v91.90'")
s=re.sub(r'(<small[^>]*style=[\"\'][^\"\']*font-size:10px;opacity:\.8[^\"\']*[\"\'][^>]*>)v91\.89(</small>)',r'\1v91.90\2',s,count=1)

# Marca da correção.
pos=s.rfind('</body>')
if pos<0: raise SystemExit('ERRO: </body> ausente')
s=s[:pos]+f'<!-- {MARK} -->\n'+s[pos:]

# 6) Guardas de segurança/integridade.
required=['function doLogin()','HLGB_SUPABASE_URL','HLGB_V9189_START','function archivedOps990()','function pendingSatisfied990','function flush955','</body>','</html>']
for x in required:
    if x not in s: raise SystemExit('ERRO: trecho essencial ausente: '+x)
if auto_forensic in s or auto_legacy in s: raise SystemExit('ERRO: recuperação automática antiga ainda presente')
if tail_old in s: raise SystemExit('ERRO: renderAll do flush ainda presente')
if s.count('function archivedOps990()')!=1 or s.count('function pendingSatisfied990')!=1: raise SystemExit('ERRO: proteção v91.90 duplicada')
if '329474 bytes omitted' in s: raise SystemExit('ERRO: index truncado')
if len(s)<1000000: raise SystemExit('ERRO: index pequeno demais')

# Valida JavaScript do WAL e dos dois módulos de recuperação alterados.
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
checked=0
for i,m in enumerate(pat.finditer(s)):
    body=m.group(1)
    if not any(x in body for x in ['const WAL955=', 'window.hlgb9149RecoverNow=', 'async function recoverLegacy949']):
        continue
    tf=Path(tempfile.gettempdir())/f'hlgb9190_{i}.js'
    tf.write_text(body,encoding='utf-8')
    r=subprocess.run(['node','--check',str(tf)],capture_output=True,text=True)
    if r.returncode:
        print(r.stderr or r.stdout)
        raise SystemExit(f'ERRO de sintaxe no script {i}')
    checked+=1
if checked<3: raise SystemExit(f'ERRO: esperava validar 3 scripts, validou {checked}')

p.write_text(s,encoding='utf-8')
print(f'PASS v91.90: recovery automático desativado, WAL reconciliado e redraw de fundo removido. JS={checked}, bytes {before}->{len(s)}')
