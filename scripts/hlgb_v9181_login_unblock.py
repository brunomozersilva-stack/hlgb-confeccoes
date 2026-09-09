from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# v91.81 — login deve autenticar primeiro; manutenção de backups locais não pode bloquear o acesso.
s = s.replace('v91.80', 'v91.81').replace('V91.80', 'V91.81')

old_loader = '<div id="sessionLoader" style="position:fixed;inset:0;background:linear-gradient(135deg,#6f3f59,#c96b8f);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px">'
new_loader = '<div id="sessionLoader" style="position:fixed;inset:0;background:linear-gradient(135deg,#6f3f59,#c96b8f);z-index:10000;display:none;align-items:center;justify-content:center;padding:20px">'
if old_loader not in s:
    raise SystemExit('ERRO: loader esperado nao encontrado')
s = s.replace(old_loader, new_loader, 1)

old = '''  try{\n   await hlgbPrepareStorage9178();\n   await cloudSignIn(email,password);'''
new = '''  try{\n   await cloudSignIn(email,password);'''
if old not in s:
    raise SystemExit('ERRO: chamada bloqueante hlgbPrepareStorage9178 nao encontrada no login')
s = s.replace(old, new, 1)

needle = '''   errorEl.textContent="";errorEl.style.display="none";\n   loginEl.style.display="none";appEl.style.display="block";'''
replacement = '''   errorEl.textContent="";errorEl.style.display="none";\n   loginEl.style.display="none";appEl.style.display="block";\n   // v91.81: manutenção de backups fora do caminho crítico do login.\n   setTimeout(()=>{\n     try{\n       Promise.resolve(hlgbPrepareStorage9178()).catch(e=>console.warn("HLGB v91.81: manutenção de backups adiada",e));\n     }catch(e){console.warn("HLGB v91.81: manutenção de backups adiada",e)}\n   },2500);'''
if needle not in s:
    raise SystemExit('ERRO: ponto de abertura do app nao encontrado')
s = s.replace(needle, replacement, 1)

old_msg = "if(err){err.textContent='A conexão com a nuvem está demorando. Você pode entrar normalmente; seus dados permanecem preservados.';err.style.display='block'}"
new_msg = "if(err){err.textContent='';err.style.display='none'}"
if old_msg in s:
    s = s.replace(old_msg, new_msg, 1)

old_state = '''   await cloudSignIn(email,password);\n   let state=await cloudLoad();'''
new_state = '''   await cloudSignIn(email,password);\n   errorEl.textContent="Acesso confirmado. Carregando seus dados da nuvem…";errorEl.style.display="block";\n   let state=await cloudLoad();'''
if old_state not in s:
    raise SystemExit('ERRO: fluxo cloudSignIn/cloudLoad nao encontrado')
s = s.replace(old_state, new_state, 1)

p.write_text(s, encoding='utf-8')
print('HLGB v91.81 aplicado com sucesso')
