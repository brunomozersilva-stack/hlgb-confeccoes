from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')
before=len(s)
MARK='HLGB_AUTH_GATE_V9188'

# 1) Helper leve: nada de módulos pesados antes da autenticação.
if MARK not in s:
    helper='''\n<script id="hlgb-auth-gate-v9188">\n/* HLGB_AUTH_GATE_V9188 */\n(function(){\n  if(window.hlgbAfterLogin)return;\n  window.__HLGB_AUTH_READY=false;\n  window.__HLGB_AUTH_QUEUE=[];\n  window.hlgbAfterLogin=function(fn,delay){\n    if(typeof fn!=="function")return;\n    const task=function(){setTimeout(function(){try{fn()}catch(e){console.warn("HLGB pós-login",e)}},Math.max(0,Number(delay)||0))};\n    if(window.__HLGB_AUTH_READY){task();return;}\n    window.__HLGB_AUTH_QUEUE.push(task);\n  };\n  window.hlgbMarkAuthenticated=function(){\n    if(window.__HLGB_AUTH_READY)return;\n    window.__HLGB_AUTH_READY=true;\n    const q=window.__HLGB_AUTH_QUEUE.splice(0);\n    setTimeout(function(){q.forEach(function(f){try{f()}catch(e){console.warn("HLGB fila pós-login",e)}})},0);\n  };\n})();\n</script>\n'''
    m=re.search(r'<body(?:\s[^>]*)?>',s,re.I)
    if not m: raise SystemExit('ERRO: <body> não encontrado')
    s=s[:m.end()]+helper+s[m.end():]

# 2) Ao autenticar ou restaurar uma sessão, libera a fila APÓS o painel abrir.
needle='loginEl.style.display="none";appEl.style.display="block";'
if needle in s and 'loginEl.style.display="none";appEl.style.display="block";setTimeout(()=>window.hlgbMarkAuthenticated?.(),0);' not in s:
    s=s.replace(needle, needle+'setTimeout(()=>window.hlgbMarkAuthenticated?.(),0);',1)

needle2='loginScreen.style.display="none";sessionLoader.style.display="none";appShell.style.display="block";applyAccess();restoreNavGroups();'
if needle2 in s and 'appShell.style.display="block";setTimeout(()=>window.hlgbMarkAuthenticated?.(),0);applyAccess();restoreNavGroups();' not in s:
    s=s.replace(needle2,'loginScreen.style.display="none";sessionLoader.style.display="none";appShell.style.display="block";setTimeout(()=>window.hlgbMarkAuthenticated?.(),0);applyAccess();restoreNavGroups();',1)

# 3) Somente os patches históricos tardios são quarentenados; o núcleo do login fica intocado.
# Começa no primeiro bloco v91.39, onde surgem as inicializações de relatórios/telas.
pos=s.find('function init939()')
if pos<0: raise SystemExit('ERRO: início dos patches tardios v91.39 não encontrado')
prefix=s[:pos]
suffix=s[pos:]

new=[]
gated_dom=0; gated_timer=0; gated_events=0; gated_observer=0
for line in suffix.splitlines(True):
    stripped=line.strip()
    nl='\n' if line.endswith('\n') else ''
    # Auto-starts DOMContentLoaded dos módulos antigos.
    if line.startswith("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded'") or line.startswith('if(document.readyState==="loading")document.addEventListener("DOMContentLoaded"'):
        new.append('hlgbAfterLogin(()=>{'+stripped+'},0);'+nl); gated_dom+=1; continue
    # Timers top-level de inicialização (não timers internos de funções).
    if line.startswith('setTimeout('):
        new.append('hlgbAfterLogin(()=>{'+stripped+'},0);'+nl); gated_timer+=1; continue
    # Eventos de foco/visibilidade instalados por patches tardios também só depois do login.
    if line.startswith("window.addEventListener('focus'") or line.startswith('window.addEventListener("focus"') or line.startswith("document.addEventListener('visibilitychange'") or line.startswith('document.addEventListener("visibilitychange"'):
        new.append('hlgbAfterLogin(()=>{'+stripped+'},0);'+nl); gated_events+=1; continue
    # Observador de versão da v91.85 não deve ficar ativo na tela de login.
    if line.startswith("let ver=document.querySelector('#appShell .logo small')"):
        new.append('hlgbAfterLogin(()=>{'+stripped+'},0);'+nl); gated_observer+=1; continue
    new.append(line)
suffix=''.join(new)

# 4) Elimina a disputa de versões antigas no logo/título.
suffix=re.sub(r"logo\.textContent='v91\.\d+'","logo.textContent='v91.88'",suffix)
suffix=re.sub(r"logo\.textContent!==?'v91\.\d+'","logo.textContent!=='v91.88'",suffix)
suffix=re.sub(r"el\.textContent!=='v91\.\d+'","el.textContent!=='v91.88'",suffix)
suffix=re.sub(r"el\.textContent='v91\.\d+'","el.textContent='v91.88'",suffix)
suffix=re.sub(r"document\.title='HLGB Confecções — Sistema de Gestão v91\.\d+ Multiusuário'","document.title='HLGB Confecções — Sistema de Gestão v91.88 Multiusuário'",suffix)

s=prefix+suffix
# Rótulos principais.
s=re.sub(r'<title>HLGB Confecções — Sistema de Gestão v91\.\d+ Multiusuário</title>','<title>HLGB Confecções — Sistema de Gestão v91.88 Multiusuário</title>',s, count=1)
s=re.sub(r'Versão\s+v91\.\d+','Versão v91.88',s)

# 5) Guardas de integridade.
if MARK not in s: raise SystemExit('ERRO: helper v91.88 ausente')
if 'function doLogin()' not in s or 'HLGB_SUPABASE_URL' not in s: raise SystemExit('ERRO: núcleo de login ausente')
if '329474 bytes omitted' in s: raise SystemExit('ERRO: marcador de truncamento encontrado')
if len(s)<1000000: raise SystemExit('ERRO: index.html ficou pequeno demais')
if gated_dom < 5: raise SystemExit(f'ERRO: poucos auto-starts DOM foram isolados ({gated_dom})')
if 'loginEl.style.display="none";appEl.style.display="block";setTimeout(()=>window.hlgbMarkAuthenticated?.(),0);' not in s:
    raise SystemExit('ERRO: liberação pós-login não instalada no login manual')
if 'appShell.style.display="block";setTimeout(()=>window.hlgbMarkAuthenticated?.(),0);applyAccess();restoreNavGroups();' not in s:
    raise SystemExit('ERRO: liberação pós-login não instalada na restauração')

p.write_text(s,encoding='utf-8')

# 6) Valida sintaxe do script principal de login e dos scripts que contêm o novo helper.
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
checked=0
for i,m in enumerate(pat.finditer(s)):
    body=m.group(1)
    if 'function doLogin()' not in body and MARK not in body:
        continue
    tf=Path(tempfile.gettempdir())/f'hlgb9188_{i}.js'
    tf.write_text(body,encoding='utf-8')
    r=subprocess.run(['node','--check',str(tf)],capture_output=True,text=True)
    if r.returncode:
        print(r.stderr)
        raise SystemExit(f'ERRO de sintaxe no script {i}')
    checked+=1
if checked<2: raise SystemExit('ERRO: validação JS não encontrou helper + login')

print(f'OK v91.88: DOM={gated_dom}, timers={gated_timer}, eventos={gated_events}, observers={gated_observer}, bytes {before}->{len(s)}')
