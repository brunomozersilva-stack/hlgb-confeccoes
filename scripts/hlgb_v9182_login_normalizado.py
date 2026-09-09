from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Versão visual.
s=re.sub(r'v91\.(?:80|81)', 'v91.82', s)
s=re.sub(r'V91\.(?:80|81)', 'V91.82', s)

# Bootstrap leve: autentica e lê apenas metadados da linha legada.
helper=r'''async function hlgbFastBootstrap9182(){
  setCloudStatus("☁️ Preparando acesso multiusuário…");
  const rows=await cloudRequest("hlgb_data?select=id,versao,atualizado_em&order=id.asc&limit=1",{method:"GET"});
  if(Array.isArray(rows)&&rows.length){
    const remote=rows[0];
    cloudRowId=remote.id;
    cloudVersion=+remote.versao||1;
    cloudReady=true;
    return "records";
  }
  cloudReady=true;
  cloudRowId=null;
  cloudVersion=0;
  return "empty";
}
'''

if 'async function hlgbFastBootstrap9182()' not in s:
    m=re.search(r'function\s+doLogin\s*\(\)\s*\{',s)
    if not m: raise SystemExit('doLogin não encontrado')
    s=s[:m.start()]+helper+'\n'+s[m.start():]

# Somente os fluxos de login/restauração usam a variável "state" dessa forma.
# Troca a carga do JSON gigante pelo cabeçalho leve.
s,n1=re.subn(r'let\s+state\s*=\s*await\s+cloudLoad\(\)\s*;', 'let state=await hlgbFastBootstrap9182();', s)
s,n2=re.subn(r'(?<!let )state\s*=\s*await\s+cloudLoad\(\)\s*;', 'state=await hlgbFastBootstrap9182();', s)
if n1 < 1:
    raise SystemExit('nenhum bootstrap de login encontrado')

# Em qualquer caminho de autenticação, garante que os registros normalizados
# estejam carregados antes de procurar o perfil/permissões do usuário.
needle='let profile=await ensureCloudUserAccessOnline();'
replacement='''if(!hlgbRecordReady){
     const recordsOk=await hlgbEnsureRecordsOnlineAfterLogin();
     if(!recordsOk)throw new Error("Não foi possível carregar os registros multiusuário.");
   }
   let profile=await ensureCloudUserAccessOnline();'''
s=s.replace(needle,replacement)

# Variante sem "let", usada em retry manual.
needle2='profile=await ensureCloudUserAccessOnline();'
replacement2='''if(!hlgbRecordReady){
          const recordsOk=await hlgbEnsureRecordsOnlineAfterLogin();
          if(!recordsOk)throw new Error("Não foi possível carregar os registros multiusuário.");
        }
        profile=await ensureCloudUserAccessOnline();'''
s=s.replace(needle2,replacement2)

# Não mostrar aviso prematuro enquanto a carga normalizada trabalha.
# Se houver watchdog de 30s/90s, alonga para 180s e mantém tokens intactos.
s=re.sub(r'\},\s*(?:30000|90000)\s*\);', '},180000);', s)

# Mensagem antiga de lentidão deixa de parecer bloqueio.
s=s.replace('A conexão com a nuvem está demorando. Você pode entrar normalmente; seus dados permanecem preservados.',
            'A restauração automática está demorando. Você pode informar e-mail e senha para entrar; seus dados permanecem preservados.')

p.write_text(s,encoding='utf-8')
print(f'v91.82 aplicado: login_bootstraps={n1}, retries={n2}')
