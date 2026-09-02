from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('v91.08 Multiusuário','v91.09 Multiusuário')
s=s.replace('Versão v91.08','Versão v91.09')
s=s.replace('>v91.08</small>','>v91.09</small>')
s=s.replace('/* ===== v91.08 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */','/* ===== v91.09 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */')
s=s.replace('/* ===== fim v91.08 ===== */','/* ===== fim v91.09 ===== */')
s=s.replace('HLGB v91.08 bootstrap','HLGB v91.09 bootstrap')
s=s.replace('HLGB v91.08 sync','HLGB v91.09 sync')

pat=r"async function hlgbRecoverLocalOnlyProducts\(\)\{.*?\n\}\n\nlet hlgbProductDirectBusy=false;"
new='''async function hlgbRecoverLocalOnlyProducts(){
  const local=Array.isArray(HLGB_PRE_CLOUD_LOCAL_PRODUCTS)?HLGB_PRE_CLOUD_LOCAL_PRODUCTS:[];
  if(!cloudAccessToken||!local.length)return 0;
  try{
    setCloudStatus(`☁️ Conferindo ${local.length} produtos deste computador…`);
    let result=await cloudRequest("rpc/hlgb_reconcile_local_products",{
      method:"POST",
      body:JSON.stringify({p_products:local})
    });
    if(Array.isArray(result))result=result[0]||null;
    console.info("HLGB v91.09 reconciliação produtos",result);
    if(result?.recovered===true){
      setCloudStatus(`☁️ Recuperando ${result.name||"produto"}…`);
      // Recarrega os registros oficiais depois que o servidor confirmou o 45º produto.
      hlgbRecordReady=false;
      await hlgbLoadNormalizedCore({preserveLocal:false});
      localSaveOnly();
      try{renderProducts()}catch(e){}
      setCloudStatus(`⚡ Online · ${result.cloud_count_after||""} produtos`,"ok");
      return 1;
    }
    if(result?.cloud_count_after!=null){
      setCloudStatus(`⚡ Online · ${result.cloud_count_after} produtos na nuvem`,"ok");
    }
    return 0;
  }catch(e){
    console.error("HLGB v91.09 reconciliação local",e);
    setCloudStatus("☁️ Falha ao conferir produtos locais","bad");
    return 0;
  }
}

let hlgbProductDirectBusy=false;'''
s2,n=re.subn(pat,new,s,flags=re.S)
if n!=1:
    raise SystemExit(f'recovery function replace count={n}')
s=s2
p.write_text(s,encoding='utf-8')
print('v91.09 applied')
