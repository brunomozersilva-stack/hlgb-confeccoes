from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

s=s.replace('v91.10 Multiusuário','v91.11 Multiusuário')
s=s.replace('Versão v91.10','Versão v91.11')
s=s.replace('>v91.10</small>','>v91.11</small>')
s=s.replace('/* ===== v91.10 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */','/* ===== v91.11 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */')
s=s.replace('/* ===== fim v91.10 ===== */','/* ===== fim v91.11 ===== */')
s=s.replace('HLGB v91.10 bootstrap','HLGB v91.11 bootstrap')
s=s.replace('HLGB v91.10 sync','HLGB v91.11 sync')
s=s.replace('HLGB v91.10 reconciliação produtos','HLGB v91.11 reconciliação produtos')
s=s.replace('HLGB v91.10 reconciliação local','HLGB v91.11 reconciliação local')

old='''async function hlgbSaveProductDirect(product,deleted=false){
  if(!product)throw new Error("Produto inválido.");
  if(!cloudAccessToken)throw new Error("Sua sessão online não está ativa. Entre novamente no sistema.");
  if(!hlgbRecordReady){
'''
new='''async function hlgbEnsureActiveWriteSession(){
  if(cloudAccessToken)return true;
  try{
    // O access token vive só em memória. Se alguma rotina o perdeu, o refresh token
    // persistido neste navegador permite reconstruir a sessão sem apagar o formulário.
    if(!cloudRefreshToken){
      try{cloudRestoreStoredAuth()}catch(e){}
    }
    if(!cloudRefreshToken)return false;
    setCloudStatus("☁️ Recuperando sessão…");
    await cloudRefreshSession(true);
    if(cloudAccessToken){
      try{hlgbRealtimeSetAuth()}catch(e){}
      return true;
    }
  }catch(e){
    console.warn("HLGB v91.11 recuperação de sessão para gravação",e);
  }
  return false;
}

async function hlgbSaveProductDirect(product,deleted=false){
  if(!product)throw new Error("Produto inválido.");
  if(!cloudAccessToken){
    const sessionOk=await hlgbEnsureActiveWriteSession();
    if(!sessionOk)throw new Error("Sua sessão expirou e não foi possível renová-la automaticamente. Entre novamente no sistema.");
  }
  if(!hlgbRecordReady){
'''
if old not in s:
    raise SystemExit('hlgbSaveProductDirect anchor not found')
s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')
print('v91.11 applied')
