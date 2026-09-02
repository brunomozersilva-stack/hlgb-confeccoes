from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

s=s.replace('v91.06 Multiusuário','v91.07 Multiusuário')
s=s.replace('Versão v91.06','Versão v91.07')
s=s.replace('>v91.06</small>','>v91.07</small>')
s=s.replace('/* ===== v91.06 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */','/* ===== v91.07 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */')
s=s.replace('/* ===== fim v91.06 ===== */','/* ===== fim v91.07 ===== */')
s=s.replace('HLGB v91.06 bootstrap','HLGB v91.07 bootstrap')
s=s.replace('HLGB v91.06 sync','HLGB v91.07 sync')
s=s.replace('// v91.06 — multiusuário por registro:', '// v91.07 — multiusuário por registro:')

anchor='''db.users=Array.isArray(db.users)?db.users:[];\ndb.auditLog=Array.isArray(db.auditLog)?db.auditLog:[];\ndb.userSessions=Array.isArray(db.userSessions)?db.userSessions:[];\n// v89.69: o acesso online é sempre validado pelo Supabase.\n'''
insert='''db.users=Array.isArray(db.users)?db.users:[];\ndb.auditLog=Array.isArray(db.auditLog)?db.auditLog:[];\ndb.userSessions=Array.isArray(db.userSessions)?db.userSessions:[];\n// v91.07: guarda os produtos que já estavam neste navegador ANTES de a nuvem carregar.\n// Isso permite recuperar, com segurança, um produto que ficou preso apenas em uma máquina.\nconst HLGB_PRE_CLOUD_LOCAL_PRODUCTS=(()=>{\n  try{return JSON.parse(JSON.stringify(Array.isArray(db.products)?db.products:[]))}catch(e){return []}\n})();\n// v89.69: o acesso online é sempre validado pelo Supabase.\n'''
if anchor not in s:
    raise SystemExit('anchor pre-cloud not found')
s=s.replace(anchor,insert,1)

anchor2='''async function hlgbSaveProductDirect(product,deleted=false){\n  if(!product)throw new Error("Produto inválido.");\n  if(!cloudAccessToken)throw new Error("Sua sessão online não está ativa. Entre novamente no sistema.");\n  if(!hlgbRecordReady){\n    const ok=await hlgbEnsureRecordsOnlineAfterLogin();\n    if(!ok||!hlgbRecordReady)throw new Error("O modo multiusuário não conseguiu iniciar.");\n  }\n  const id=hlgbRecordId("products",product);\n  if(!id)throw new Error("Não foi possível identificar o produto.");\n  setCloudStatus(deleted?"☁️ Excluindo produto…":"☁️ Salvando produto…");\n  const result=await hlgbRecordSaveWithRetry("products",id,product,deleted);\n  try{hlgbRecordPendingStore()}catch(e){}\n  localSaveOnly();\n  setCloudStatus("⚡ Online · multiusuário","ok");\n  return result;\n}\n\n'''
recover='''async function hlgbSaveProductDirect(product,deleted=false){\n  if(!product)throw new Error("Produto inválido.");\n  if(!cloudAccessToken)throw new Error("Sua sessão online não está ativa. Entre novamente no sistema.");\n  if(!hlgbRecordReady){\n    const ok=await hlgbEnsureRecordsOnlineAfterLogin();\n    if(!ok||!hlgbRecordReady)throw new Error("O modo multiusuário não conseguiu iniciar.");\n  }\n  const id=hlgbRecordId("products",product);\n  if(!id)throw new Error("Não foi possível identificar o produto.");\n  setCloudStatus(deleted?"☁️ Excluindo produto…":"☁️ Salvando produto…");\n  const result=await hlgbRecordSaveWithRetry("products",id,product,deleted);\n  try{hlgbRecordPendingStore()}catch(e){}\n  localSaveOnly();\n  setCloudStatus("⚡ Online · multiusuário","ok");\n  return result;\n}\n\nfunction hlgbProductIdentityMatches(a,b){\n  if(!a||!b)return false;\n  const aid=String(a.id??'').trim(),bid=String(b.id??'').trim();\n  if(aid&&bid&&aid===bid)return true;\n  const ac=String(a.code??'').trim().toLowerCase(),bc=String(b.code??'').trim().toLowerCase();\n  if(ac&&bc&&ac===bc)return true;\n  const norm=v=>String(v??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim().toLowerCase().replace(/\\s+/g,' ');\n  const an=norm(a.name),bn=norm(b.name);\n  return !!an&&!!bn&&an===bn;\n}\nasync function hlgbRecoverLocalOnlyProducts(){\n  try{\n    const local=Array.isArray(HLGB_PRE_CLOUD_LOCAL_PRODUCTS)?HLGB_PRE_CLOUD_LOCAL_PRODUCTS:[];\n    const cloud=Array.isArray(db.products)?db.products:[];\n    if(!cloudAccessToken||!hlgbRecordReady||local.length<=cloud.length)return 0;\n    const diff=local.length-cloud.length;\n    const missing=local.filter(lp=>!cloud.some(cp=>hlgbProductIdentityMatches(lp,cp)));\n    // Recuperação automática só acontece quando a diferença é inequívoca.\n    if(diff<=0||missing.length!==diff){\n      console.warn('HLGB v91.07: diferença local/nuvem não inequívoca; recuperação automática cancelada.',{local:local.length,cloud:cloud.length,diff,missing:missing.length});\n      return 0;\n    }\n    const maxCloudCode=Math.max(0,...cloud.map(x=>/^\\d+$/.test(String(x?.code||'').trim())?+x.code:0));\n    for(const p of missing){\n      const code=String(p?.code||'').trim();\n      // Se houver referência numérica antiga menor/igual às existentes, não ressuscita automaticamente.\n      if(/^\\d+$/.test(code)&&+code<=maxCloudCode){\n        console.warn('HLGB v91.07: produto local parece antigo; não recuperado automaticamente.',p);\n        return 0;\n      }\n    }\n    setCloudStatus(`☁️ Recuperando ${missing.length} produto local…`);\n    let recovered=0;\n    for(const p0 of missing){\n      const p=hlgbRecordClone(p0);\n      const result=await hlgbSaveProductDirect(p,false);\n      if(!result||result.applied!==true)throw new Error('O Supabase não confirmou a recuperação do produto '+String(p.name||p.code||p.id||''));\n      if(!db.products.some(x=>hlgbProductIdentityMatches(x,p)))db.products.push(p);\n      recovered++;\n    }\n    if(recovered){\n      try{ensureProductReferences()}catch(e){}\n      localSaveOnly();\n      try{renderProducts()}catch(e){}\n      setCloudStatus('⚡ Online · produto local recuperado','ok');\n      console.info(`HLGB v91.07: ${recovered} produto(s) local(is) recuperado(s) para a nuvem.`);\n    }\n    return recovered;\n  }catch(e){\n    console.error('HLGB v91.07 recuperação local',e);\n    setCloudStatus('☁️ Produto local ainda não sincronizado','bad');\n    return 0;\n  }\n}\n\n'''
if anchor2 not in s:
    raise SystemExit('anchor save direct not found')
s=s.replace(anchor2,recover,1)

old='''   await cloudRefreshSession(true);\n   await cloudLoad();\n   await hlgbEnsureRecordsOnlineAfterLogin();\n   if(normEmail(cloudUser?.email)===normEmail(HLGB_OWNER_EMAIL)){normalizeUserDirectoryForOwner();}\n   const profile=await ensureCloudUserAccessOnline();\n   cloudBootstrapping=false;\n'''
new='''   await cloudRefreshSession(true);\n   await cloudLoad();\n   await hlgbEnsureRecordsOnlineAfterLogin();\n   if(normEmail(cloudUser?.email)===normEmail(HLGB_OWNER_EMAIL)){normalizeUserDirectoryForOwner();}\n   const profile=await ensureCloudUserAccessOnline();\n   // Depois que permissões e os 44/45 registros da nuvem foram carregados, recupera somente\n   // eventual produto excedente que já existia neste navegador antes da nuvem.\n   await hlgbRecoverLocalOnlyProducts();\n   cloudBootstrapping=false;\n'''
if old not in s:
    raise SystemExit('restore boot anchor not found')
s=s.replace(old,new,1)

# Há também o fluxo de login manual; injeta recuperação logo após validar o perfil quando o padrão existir.
manual='''    const profile=await ensureCloudUserAccessOnline();\n    cloudBootstrapping=false;\n'''
manual_new='''    const profile=await ensureCloudUserAccessOnline();\n    await hlgbRecoverLocalOnlyProducts();\n    cloudBootstrapping=false;\n'''
if manual in s:
    s=s.replace(manual,manual_new,1)

p.write_text(s,encoding='utf-8')
print('v91.07 patch applied')
