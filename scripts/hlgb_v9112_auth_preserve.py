from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

s=s.replace('v91.11 Multiusuário','v91.12 Multiusuário')
s=s.replace('Versão v91.11','Versão v91.12')
s=s.replace('>v91.11</small>','>v91.12</small>')
s=s.replace('/* ===== v91.11 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */','/* ===== v91.12 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */')
s=s.replace('/* ===== fim v91.11 ===== */','/* ===== fim v91.12 ===== */')
s=s.replace('HLGB v91.11 bootstrap','HLGB v91.12 bootstrap')
s=s.replace('HLGB v91.11 sync','HLGB v91.12 sync')
s=s.replace('HLGB v91.11 reconciliação produtos','HLGB v91.12 reconciliação produtos')
s=s.replace('HLGB v91.11 reconciliação local','HLGB v91.12 reconciliação local')
s=s.replace('HLGB v91.11 recuperação de sessão para gravação','HLGB v91.12 recuperação de sessão para gravação')

old_ui='''   applyAccess();restoreNavGroups();
   // Renderizar depois de carregar a nuvem NÃO é uma alteração do usuário.
   // Antes, renderAll() marcava a cópia local como "suja" e a máquina secundária
   // acabava bloqueando a busca de novidades ou tentando reenviar uma cópia antiga.
   {const prevApplying=cloudApplying;cloudApplying=true;try{renderAll()}finally{cloudApplying=prevApplying}}
'''
new_ui='''   // v91.12: erro de interface depois do login nunca pode apagar a sessão online.
   try{
     applyAccess();restoreNavGroups();
     // Renderizar depois de carregar a nuvem NÃO é uma alteração do usuário.
     {const prevApplying=cloudApplying;cloudApplying=true;try{renderAll()}finally{cloudApplying=prevApplying}}
   }catch(uiErr){
     console.error("HLGB v91.12 erro de interface após login; sessão preservada",uiErr);
     try{setCloudStatus("⚠️ Online · interface com aviso","warn")}catch(e){}
   }
'''
if old_ui not in s:
    raise SystemExit('post-login UI anchor not found')
s=s.replace(old_ui,new_ui,1)

old_catch='''  }catch(e){console.error(e);cloudAccessToken="";cloudRefreshToken="";cloudTokenExpiresAt=0;cloudUser=null;cloudReady=false;cloudRowId=null;cloudStoreAuth();let msg=e.message||"verifique e-mail e senha.";if(/invalid login credentials/i.test(msg))msg="E-mail ou senha incorretos. Se este usuário foi criado antes do sistema online, o Administrador precisa ativar o acesso online dele.";errorEl.textContent="Não foi possível entrar: "+msg;errorEl.style.display="block";passEl.value="";passEl.focus()}
'''
new_catch='''  }catch(e){
   console.error(e);
   const appAlreadyOpen=!!appEl && appEl.style.display==="block";
   const authenticated=!!cloudUser && (!!cloudAccessToken || !!cloudRefreshToken);
   // v91.12: se a autenticação já foi concluída e o painel já abriu, um erro posterior
   // é problema de interface/bootstrap, não de login. Preserva access + refresh token.
   if(appAlreadyOpen && authenticated){
     try{cloudStoreAuth()}catch(_e){}
     try{setCloudStatus("⚠️ Online · sessão preservada","warn")}catch(_e){}
     errorEl.textContent="";errorEl.style.display="none";
     return;
   }
   cloudAccessToken="";cloudRefreshToken="";cloudTokenExpiresAt=0;cloudUser=null;cloudReady=false;cloudRowId=null;cloudStoreAuth();
   let msg=e.message||"verifique e-mail e senha.";
   if(/invalid login credentials/i.test(msg))msg="E-mail ou senha incorretos. Se este usuário foi criado antes do sistema online, o Administrador precisa ativar o acesso online dele.";
   errorEl.textContent="Não foi possível entrar: "+msg;errorEl.style.display="block";passEl.value="";passEl.focus();
  }
'''
if old_catch not in s:
    raise SystemExit('login catch anchor not found')
s=s.replace(old_catch,new_catch,1)

p.write_text(s,encoding='utf-8')
print('v91.12 applied')
