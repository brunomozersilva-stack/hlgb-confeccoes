from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

s=s.replace('v91.80','v91.81').replace('V91.80','V91.81')

# Insere bootstrap leve antes de doLogin. Ele lê só o cabeçalho da linha legada;
# os dados oficiais do multiusuário continuam vindo de hlgb_records/rpc bundle.
needle='function doLogin(){'
helper=r'''async function hlgbFastBootstrap9181(){
  setCloudStatus("☁️ Preparando acesso multiusuário…");
  const rows=await cloudRequest("hlgb_data?select=id,versao,atualizado_em&order=id.asc&limit=1",{method:"GET"});
  if(Array.isArray(rows)&&rows.length){
    const remote=rows[0];
    cloudRowId=remote.id;
    cloudVersion=+remote.versao||1;
    cloudReady=true;
    return "records";
  }
  // Projeto sem linha legada: a autenticação funcionou, e o modo por registros
  // ainda pode ser carregado normalmente.
  cloudReady=true;
  cloudRowId=null;
  cloudVersion=0;
  return "empty";
}
'''
if 'async function hlgbFastBootstrap9181()' not in s:
    if needle not in s: raise SystemExit('doLogin não encontrado')
    s=s.replace(needle,helper+'\n'+needle,1)

# Login manual: não baixa mais o JSON gigante de hlgb_data.
s=s.replace('let state=await cloudLoad();','let state=await hlgbFastBootstrap9181();',1)

# Retry de autorização dentro do mesmo doLogin também deve permanecer leve.
old='''        state=await cloudLoad();
        profile=await ensureCloudUserAccessOnline();'''
new='''        state=await hlgbFastBootstrap9181();
        if(!hlgbRecordReady)await hlgbEnsureRecordsOnlineAfterLogin();
        profile=await ensureCloudUserAccessOnline();'''
s=s.replace(old,new,1)

# Restauração automática: substitui especificamente a sequência após refresh.
old='''    await cloudRefreshSession(true);
    await cloudLoad();
    await hlgbEnsureRecordsOnlineAfterLogin();'''
new='''    await cloudRefreshSession(true);
    await hlgbFastBootstrap9181();
    await hlgbEnsureRecordsOnlineAfterLogin();'''
if old not in s: raise SystemExit('bootstrap automático não encontrado')
s=s.replace(old,new,1)

# Watchdog v91.80: agora só informa depois de 90 s e não troca a tela durante
# uma tentativa manual em andamento. Em rede lenta, o usuário não é expulso.
s=s.replace('''  window.HLGB_SESSION_BOOT_WATCHDOG=setTimeout(function(){
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
  },30000);''','''  window.HLGB_SESSION_BOOT_WATCHDOG=setTimeout(function(){
    var loader=document.getElementById('sessionLoader');
    var app=document.getElementById('appShell');
    if(!loader||loader.style.display==='none'||(app&&app.style.display==='block'))return;
    loader.style.display='none';
    var login=document.getElementById('loginScreen');if(login)login.style.display='flex';
    var err=document.getElementById('loginError');
    if(err){err.textContent='Não consegui restaurar a sessão automaticamente. Entre com e-mail e senha; nenhum dado da nuvem foi alterado.';err.style.display='block'}
    setTimeout(function(){document.getElementById('loginUser')?.focus()},0);
  },90000);''',1)

p.write_text(s,encoding='utf-8')
print('v91.81 aplicado')
