from pathlib import Path

PATH = Path("app9240.html")
MARKER = "HLGB_V9240_REFRESH_AUTH_CATALOG_GUARD"

s = PATH.read_text(encoding="utf-8")

if MARKER not in s:
    startup_anchor = "if(cloudRestoreStoredAuth()){\n (async()=>{\n  try{"
    if startup_anchor not in s:
        raise SystemExit("bootstrap de restauração de sessão não encontrado")

    helper = r'''
/* HLGB_V9240_REFRESH_AUTH_CATALOG_GUARD
   O refresh só libera a interface depois de confirmar a carga por registros.
   Falhas transitórias tentam novamente e jamais podem gravar por cima do
   navegador uma cópia parcial do JSON legado. */
async function hlgb9240EnsureRecordsResilient(){
 if(!cloudAccessToken||!cloudReady)return false;
 for(let attempt=0;attempt<3;attempt++){
  try{
   if(!hlgbRecordReady){
    const ok=await hlgbEnsureRecordsOnlineAfterLogin();
    if(!ok||!hlgbRecordReady)throw new Error(hlgbLastRecordLoadError||"Carga por registros não ficou pronta.");
   }
   const missing=[];
   for(const module of ["materials","colors","sizes"]){
    try{
     if(typeof hlgbRecordCanRead==="function"&&!hlgbRecordCanRead(module))continue;
     const snap=hlgbRecordSnapshots?.[module];
     if(!(snap instanceof Map))continue;
     let active=0;
     for(const row of snap.values())if(row&&!row.deleted_at)active++;
     const local=Array.isArray(db?.[module])?db[module].length:0;
     // Itens locais pendentes podem deixar local > nuvem; o perigoso é local < nuvem.
     if(local<active)missing.push(`${module}:${local}/${active}`);
    }catch(_e){}
   }
   if(!missing.length)return true;
   hlgbLastRecordLoadError="Carga parcial detectada: "+missing.join(", ");
   console.warn("HLGB v92.40: carga parcial de cadastros; repetindo",missing);
  }catch(e){
   hlgbLastRecordLoadError=String(e?.message||e||"Falha ao carregar dados");
   console.warn("HLGB v92.40: tentativa de carga por registros",attempt+1,e);
  }
  hlgbRecordReady=false;
  try{hlgbNormalizedReady=false}catch(_e){}
  if(attempt<2)await new Promise(r=>setTimeout(r,attempt===0?350:900));
 }
 return false;
}
'''
    s = s.replace(startup_anchor, helper + "\n" + startup_anchor, 1)

    # Guarda o estado local completo antes de qualquer leitura que possa substituir db.
    s = s.replace(
        "if(cloudRestoreStoredAuth()){\n (async()=>{\n  try{",
        "if(cloudRestoreStoredAuth()){\n (async()=>{\n  const preRestoreDb9240=(()=>{try{return typeof cloudClone==='function'?cloudClone(db):JSON.parse(JSON.stringify(db))}catch(_e){return null}})();\n  try{",
        1,
    )

    # O refresh antigo ignorava false e abria o sistema com o JSON legado incompleto.
    old_refresh_load = "   await cloudLoad();\n   await hlgbEnsureRecordsOnlineAfterLogin();"
    new_refresh_load = """   await cloudLoad();
   if(!await hlgb9240EnsureRecordsResilient()){
    const err=new Error("Não foi possível confirmar todos os dados multiusuário após o refresh. "+(hlgbLastRecordLoadError||""));
    err.hlgbKeepStoredAuth=true;
    throw err;
   }"""
    if old_refresh_load not in s:
        raise SystemExit("carga do refresh não encontrada")
    s = s.replace(old_refresh_load, new_refresh_load, 1)

    # Login manual também ganha as mesmas tentativas, evitando quedas transitórias no Chrome/Safari.
    manual_old = "const recordsOk=await hlgbEnsureRecordsOnlineAfterLogin();"
    manual_count = s.count(manual_old)
    if manual_count < 1:
        raise SystemExit("carga do login manual não encontrada")
    s = s.replace(manual_old, "const recordsOk=await hlgb9240EnsureRecordsResilient();")

    # Corrige apenas o catch do bootstrap restaurado. Erro de dados/rede não apaga refresh token.
    boot_start = s.index("if(cloudRestoreStoredAuth()){")
    boot_end = s.index("}else{sessionLoader.style.display=\"none\";loginScreen.style.display=\"flex\"}", boot_start)
    boot = s[boot_start:boot_end]
    old_clear = """   cloudAccessToken="";cloudRefreshToken="";cloudTokenExpiresAt=0;cloudUser=null;cloudReady=false;cloudRowId=null;cloudStoreAuth();
   db.session=null;localSaveOnly();
   sessionLoader.style.display="none";appShell.style.display="none";loginScreen.style.display="flex";"""
    new_clear = r'''   const restoreMsg9240=String(e?.message||e||"");
   const authInvalid9240=/invalid\s+(refresh\s+)?token|refresh\s+token.*(?:not found|expired|invalid)|jwt.*(?:expired|invalid)|unauthenticated|não foi autorizado|ainda não foi autorizado/i.test(restoreMsg9240);
   // Se cloudLoad chegou a trocar db pelo JSON legado e a carga por registros falhou,
   // devolve exatamente a cópia que existia no navegador antes do refresh.
   if(preRestoreDb9240&&typeof preRestoreDb9240==="object"){
    const prevApplying9240=cloudApplying;cloudApplying=true;try{db=preRestoreDb9240}finally{cloudApplying=prevApplying9240}
   }
   if(authInvalid9240){
    cloudAccessToken="";cloudRefreshToken="";cloudTokenExpiresAt=0;cloudUser=null;cloudReady=false;cloudRowId=null;cloudStoreAuth();
   }else{
    // Sessão Supabase continua recuperável: mantém refresh token e usuário salvos.
    cloudAccessToken="";cloudTokenExpiresAt=0;cloudReady=false;cloudRowId=null;
    try{cloudStoreAuth()}catch(_e){}
   }
   db.session=null;try{localSaveOnly()}catch(_e){}
   sessionLoader.style.display="none";appShell.style.display="none";loginScreen.style.display="flex";
   try{
    const errEl9240=document.getElementById("loginError");
    if(errEl9240){
     errEl9240.textContent=authInvalid9240?"Sua sessão online expirou. Entre novamente.":"Sua sessão foi preservada, mas os dados não terminaram de carregar. Atualize a página para tentar novamente.";
     errEl9240.style.display="block";
    }
   }catch(_e){}'''
    if old_clear not in boot:
        raise SystemExit("catch da restauração não encontrado")
    boot = boot.replace(old_clear, new_clear, 1)
    s = s[:boot_start] + boot + s[boot_end:]

    PATH.write_text(s, encoding="utf-8")

print("v92.40: refresh protegido contra carga parcial, perda de catálogos e descarte indevido de sessão")
