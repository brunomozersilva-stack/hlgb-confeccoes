from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

s=s.replace('v91.07 Multiusuário','v91.08 Multiusuário')
s=s.replace('Versão v91.07','Versão v91.08')
s=s.replace('>v91.07</small>','>v91.08</small>')
s=s.replace('/* ===== v91.07 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */','/* ===== v91.08 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */')
s=s.replace('/* ===== fim v91.07 ===== */','/* ===== fim v91.08 ===== */')
s=s.replace('HLGB v91.07 bootstrap','HLGB v91.08 bootstrap')
s=s.replace('HLGB v91.07 sync','HLGB v91.08 sync')
s=s.replace('// v91.07 — multiusuário por registro:', '// v91.08 — multiusuário por registro:')

old="""async function hlgbRecoverLocalOnlyProducts(){
  try{
    const local=Array.isArray(HLGB_PRE_CLOUD_LOCAL_PRODUCTS)?HLGB_PRE_CLOUD_LOCAL_PRODUCTS:[];
    const cloud=Array.isArray(db.products)?db.products:[];
    if(!cloudAccessToken||!hlgbRecordReady||local.length<=cloud.length)return 0;
    const diff=local.length-cloud.length;
    const missing=local.filter(lp=>!cloud.some(cp=>hlgbProductIdentityMatches(lp,cp)));
    // Recuperação automática só acontece quando a diferença é inequívoca.
    if(diff<=0||missing.length!==diff){
      console.warn('HLGB v91.07: diferença local/nuvem não inequívoca; recuperação automática cancelada.',{local:local.length,cloud:cloud.length,diff,missing:missing.length});
      return 0;
    }
    const maxCloudCode=Math.max(0,...cloud.map(x=>/^\\d+$/.test(String(x?.code||'').trim())?+x.code:0));
    for(const p of missing){
      const code=String(p?.code||'').trim();
      // Se houver referência numérica antiga menor/igual às existentes, não ressuscita automaticamente.
      if(/^\\d+$/.test(code)&&+code<=maxCloudCode){
        console.warn('HLGB v91.07: produto local parece antigo; não recuperado automaticamente.',p);
        return 0;
      }
    }
    setCloudStatus(`☁️ Recuperando ${missing.length} produto local…`);
    let recovered=0;
    for(const p0 of missing){
      const p=hlgbRecordClone(p0);
      const result=await hlgbSaveProductDirect(p,false);
      if(!result||result.applied!==true)throw new Error('O Supabase não confirmou a recuperação do produto '+String(p.name||p.code||p.id||''));
      if(!db.products.some(x=>hlgbProductIdentityMatches(x,p)))db.products.push(p);
      recovered++;
    }
    if(recovered){
      try{ensureProductReferences()}catch(e){}
      localSaveOnly();
      try{renderProducts()}catch(e){}
      setCloudStatus('⚡ Online · produto local recuperado','ok');
      console.info(`HLGB v91.07: ${recovered} produto(s) local(is) recuperado(s) para a nuvem.`);
    }
    return recovered;
  }catch(e){
    console.error('HLGB v91.07 recuperação local',e);
    setCloudStatus('☁️ Produto local ainda não sincronizado','bad');
    return 0;
  }
}
"""
new="""function hlgbCloudProductsFromRecordSnapshot(){
  try{
    const snap=hlgbRecordSnapshots?.products;
    if(!(snap instanceof Map))return [];
    const out=[];
    for(const v of snap.values()){
      if(!v)continue;
      if(v.deleted_at||v.deletedAt||v.deleted===true)continue;
      let item=v;
      if(v.data&&typeof v.data==='object')item=v.data;
      else if(v.item&&typeof v.item==='object')item=v.item;
      else if(v.value&&typeof v.value==='object')item=v.value;
      if(item&&typeof item==='object')out.push(hlgbRecordClone(item));
    }
    return out;
  }catch(e){console.warn('HLGB v91.08 snapshot produtos',e);return []}
}
async function hlgbRecoverLocalOnlyProducts(){
  try{
    const local=Array.isArray(HLGB_PRE_CLOUD_LOCAL_PRODUCTS)?HLGB_PRE_CLOUD_LOCAL_PRODUCTS:[];
    // IMPORTANTE: não usa db.products aqui, porque cloudLoad pode preservar/mesclar um item local.
    // A fonte oficial para saber quantos produtos existem na nuvem é o snapshot de hlgb_records.
    let cloud=hlgbCloudProductsFromRecordSnapshot();
    if(!cloud.length&&Array.isArray(db.products))cloud=db.products.slice();
    if(!cloudAccessToken||!hlgbRecordReady||local.length<=cloud.length)return 0;
    const diff=local.length-cloud.length;
    const missing=local.filter(lp=>!cloud.some(cp=>hlgbProductIdentityMatches(lp,cp)));
    if(diff<=0||missing.length!==diff){
      console.warn('HLGB v91.08: diferença local/nuvem não inequívoca; recuperação automática cancelada.',{local:local.length,cloud:cloud.length,diff,missing:missing.length});
      return 0;
    }
    const maxCloudCode=Math.max(0,...cloud.map(x=>/^\\d+$/.test(String(x?.code||'').trim())?+x.code:0));
    for(const prod of missing){
      const code=String(prod?.code||'').trim();
      // Só bloqueia referências antigas se o nome também bater com algum produto da nuvem.
      // Um produto novo pode ter ficado com código duplicado por falha antiga; nesse caso ganha nova referência.
      if(/^\\d+$/.test(code)&&+code<=maxCloudCode){
        if(cloud.some(cp=>hlgbProductIdentityMatches(prod,cp)))return 0;
        prod.code=String(maxCloudCode+1);
      }
    }
    setCloudStatus(`☁️ Recuperando ${missing.length} produto local…`);
    let recovered=0;
    for(const p0 of missing){
      const prod=hlgbRecordClone(p0);
      if(!String(prod.code||'').trim()||cloud.some(cp=>String(cp.code||'').trim()===String(prod.code||'').trim())){
        prod.code=String(Math.max(maxCloudCode,...cloud.map(x=>+x.code||0))+1);
      }
      const result=await hlgbSaveProductDirect(prod,false);
      if(!result||result.applied!==true)throw new Error('O Supabase não confirmou a recuperação do produto '+String(prod.name||prod.code||prod.id||''));
      if(!db.products.some(x=>hlgbProductIdentityMatches(x,prod)))db.products.push(prod);
      cloud.push(prod);
      recovered++;
    }
    if(recovered){
      try{ensureProductReferences()}catch(e){}
      localSaveOnly();
      try{renderProducts()}catch(e){}
      setCloudStatus('⚡ Online · produto local recuperado','ok');
      console.info(`HLGB v91.08: ${recovered} produto(s) local(is) recuperado(s) para a nuvem.`);
    }
    return recovered;
  }catch(e){
    console.error('HLGB v91.08 recuperação local',e);
    setCloudStatus('☁️ Produto local ainda não sincronizado','bad');
    return 0;
  }
}
"""
if old not in s:
    raise SystemExit('old recovery block not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('v91.08 fix applied')
