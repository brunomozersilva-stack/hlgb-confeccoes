from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9192_START -->'; END='<!-- HLGB_V9192_END -->'
if START in s and END in s:
    a=s.index(START);b=s.index(END,a)+len(END);s=s[:a]+s[b:]

def matching_end(src,brace):
    depth=0;quote=None;esc=False;i=brace
    while i<len(src):
        ch=src[i]
        if quote:
            if esc:esc=False
            elif ch=='\\':esc=True
            elif ch==quote:quote=None
        else:
            if ch in ('"',"'",'`'):quote=ch
            elif ch=='{':depth+=1
            elif ch=='}':
                depth-=1
                if depth==0:return i+1
        i+=1
    raise SystemExit('Bloco sem fechamento')

def replace_function(src,name,new):
    m=re.search(r'(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(',src)
    if not m:raise SystemExit('Função não encontrada: '+name)
    brace=src.find('{',m.end());end=matching_end(src,brace)
    return src[:m.start()]+new+src[end:]

# Login manual obrigatório. Nenhuma abertura/reload restaura sessão sozinha.
new_restore=r'''function cloudRestoreStoredAuth(allowExplicitRestore=false){
  if(allowExplicitRestore!==true)return false;
  try{
    let raw=localStorage.getItem(HLGB_CLOUD_AUTH_KEY);
    if(!raw){try{raw=sessionStorage.getItem(HLGB_CLOUD_AUTH_KEY)}catch(e){}}
    if(!raw)return false;
    const saved=JSON.parse(raw||"{}");
    cloudRefreshToken=saved.refresh_token||"";
    cloudTokenExpiresAt=Number(saved.expires_at||0)||0;
    cloudUser=saved.user||null;
    return !!cloudRefreshToken;
  }catch(e){return false}
}'''
s=replace_function(s,'cloudRestoreStoredAuth',new_restore)

# Evita que diferenças apenas técnicas/metadata recriem uma pendência da WAL.
new_scan=r'''async function scanDirty955(){
 try{
  if(!cloudReady955()||typeof HLGB_RECORD_MODULES==='undefined'||!Array.isArray(HLGB_RECORD_MODULES))return 0;
  let todo=[];const pendingKeys=new Set(entries955().map(x=>x?.key).filter(Boolean));
  for(const m of HLGB_RECORD_MODULES){
    if(typeof hlgbRecordCanWrite==='function'&&!hlgbRecordCanWrite(m))continue;
    const snap=hlgbRecordSnapshots?.[m];if(!(snap instanceof Map)||!Array.isArray(db?.[m]))continue;
    for(let i=0;i<db[m].length;i++){
      const r=db[m][i],id=rid955(m,r,i);if(!id||pendingKeys.has(key955(m,id)))continue;
      const sr=snap.get(String(id));
      const same=!!sr&&!sr.deleted_at&&(typeof eqBusiness990==='function'?eqBusiness990(r,sr.data):norm955(r)===norm955(sr.data));
      if(!same){todo.push([m,id,C955(r)]);if(todo.length>=40)break}
    }
    if(todo.length>=40)break;
  }
  for(const [m,id,r] of todo)await enqueue955(m,id,r,false);
  if(todo.length)await flush955(false);
  return todo.length;
 }catch(e){console.warn('HLGB v91.92 dirty scan',e);return 0}
}'''
s=replace_function(s,'scanDirty955',new_scan)

block=r'''<!-- HLGB_V9192_START -->
<script id="hlgb-v9192-script">
(function(){
'use strict';
window.HLGB_REQUIRE_MANUAL_LOGIN=true;
// Depois do login manual, reconcilia silenciosamente qualquer WAL antiga.
// Não apaga nada: flush955 só remove uma pendência após confirmação do snapshot/Supabase.
try{
  const prev=window.hlgbMarkAuthenticated;
  window.hlgbMarkAuthenticated=function(){
    const r=typeof prev==='function'?prev.apply(this,arguments):undefined;
    setTimeout(async()=>{
      try{
        if(typeof mergeIdb955==='function')await mergeIdb955();
        if(typeof flush955==='function')await flush955(false);
        if(typeof scanDirty955==='function')await scanDirty955();
        if(typeof flush955==='function')await flush955(false);
        if(typeof update955==='function')update955();
      }catch(e){console.warn('HLGB v91.92 reconciliação da fila',e)}
    },1200);
    return r;
  };
}catch(e){console.warn('HLGB v91.92 hook de autenticação',e)}
console.log('HLGB v91.92: login manual obrigatório e reconciliação da fila de nuvem.');
})();
</script>
<!-- HLGB_V9192_END -->'''
pos=s.rfind('</body>')
if pos<0:raise SystemExit('</body> não encontrado')
s=s[:pos]+block+'\n'+s[pos:]
s=s.replace('v91.91','v91.92').replace('V91.91','V91.92')

# Garantias estruturais.
if s.count('function cloudRestoreStoredAuth(')!=1:raise SystemExit('cloudRestoreStoredAuth duplicada')
if 'if(allowExplicitRestore!==true)return false;' not in s:raise SystemExit('login manual não aplicado')
if "typeof eqBusiness990==='function'?eqBusiness990" not in s:raise SystemExit('comparação de negócio não aplicada')
if s.count(START)!=1 or s.count(END)!=1:raise SystemExit('bloco v91.92 inválido')

# Valida cada script inline individualmente; scripts com type não-JS são ignorados.
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
checked=0
for i,m in enumerate(pat.finditer(s)):
    body=m.group(1)
    if not body.strip():continue
    # Evita scripts externos/JSON; neste arquivo os inline são JS.
    tf=Path(tempfile.gettempdir())/f'hlgb_v9192_{i}.js';tf.write_text(body,encoding='utf-8')
    r=subprocess.run(['node','--check',str(tf)],capture_output=True,text=True)
    if r.returncode!=0:
        print(r.stderr);raise SystemExit(f'Erro JS no script inline {i}')
    checked+=1
p.write_text(s,encoding='utf-8')
print('PASS v91.92: login manual, scan sem metadata fantasma e reconciliação da fila. scripts=',checked)
