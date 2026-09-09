from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Atualiza a identificação visual da versão.
s=s.replace('v91.79','v91.80').replace('V91.79','V91.80')

# Remove o watchdog destrutivo da v91.74, que apagava os tokens de autenticação
# após 10 segundos e expulsava usuários mesmo quando a nuvem ainda estava carregando.
pat=re.compile(r'''<!-- v91\.74: o Safari não pode manter a tela de sessão bloqueada indefinidamente\. -->\s*<script>\s*\(function\(\)\{\s*window\.HLGB_SESSION_BOOT_CANCELLED=false;\s*window\.HLGB_SESSION_BOOT_WATCHDOG=setTimeout\(function\(\)\{.*?\},10000\);\s*\}\)\(\);\s*</script>''',re.S)
replacement='''<!-- v91.80: watchdog de sessão não destrutivo -->
<script>
(function(){
  window.HLGB_SESSION_BOOT_CANCELLED=false;
  window.HLGB_SESSION_BOOT_WATCHDOG=setTimeout(function(){
    var loader=document.getElementById('sessionLoader');
    var app=document.getElementById('appShell');
    if(!loader||loader.style.display==='none'||(app&&app.style.display==='block'))return;
    // A nuvem pode levar mais de 10s em contas com muitos registros.
    // Nunca apague tokens nem cancele a sessão só por lentidão.
    loader.style.display='none';
    var login=document.getElementById('loginScreen');if(login)login.style.display='flex';
    var err=document.getElementById('loginError');
    if(err){err.textContent='A conexão com a nuvem está demorando. Você pode entrar normalmente; seus dados permanecem preservados.';err.style.display='block'}
    setTimeout(function(){document.getElementById('loginUser')?.focus()},0);
  },30000);
})();
</script>'''
s,n=pat.subn(replacement,s)
if n==0:
    raise SystemExit('ERRO: watchdog v91.74 não encontrado; nada foi alterado')

# Ao clicar em Entrar, cancela qualquer watchdog pendente para que ele não interrompa
# o login manual no meio da carga da nuvem.
needle='function doLogin(){'
insert='''function doLogin(){
 try{if(window.HLGB_SESSION_BOOT_WATCHDOG){clearTimeout(window.HLGB_SESSION_BOOT_WATCHDOG);window.HLGB_SESSION_BOOT_WATCHDOG=null}}catch(e){}
 try{var __hl=document.getElementById('sessionLoader');if(__hl)__hl.style.display='none'}catch(e){}'''
if insert not in s:
    if needle not in s: raise SystemExit('ERRO: doLogin não encontrado')
    s=s.replace(needle,insert,1)

# A proteção de login da v91.79 estava abortando a autenticação em 12s.
# Para redes lentas, aumenta para 30s e mantém uma tentativa adicional.
s=s.replace('setTimeout(()=>controller.abort(),12000)','setTimeout(()=>controller.abort(),30000)')

p.write_text(s,encoding='utf-8')
print('v91.80 aplicada: watchdog destrutivo removido, tokens preservados e login protegido')
