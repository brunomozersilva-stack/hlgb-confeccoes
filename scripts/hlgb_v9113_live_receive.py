from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Version labels
s=s.replace('v91.12 Multiusuário','v91.13 Multiusuário')
s=s.replace('Versão v91.12','Versão v91.13')
s=s.replace('>v91.12</small>','>v91.13</small>')
s=s.replace('/* ===== v91.12 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */','/* ===== v91.13 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */')
s=s.replace('/* ===== fim v91.12 ===== */','/* ===== fim v91.13 ===== */')
s=s.replace('HLGB v91.12 sync','HLGB v91.13 sync')
s=s.replace('HLGB v91.12 bootstrap','HLGB v91.13 bootstrap')
s=s.replace('HLGB v91.12 pós-login','HLGB v91.13 pós-login')
s=s.replace('HLGB v91.12 restauração pós-login','HLGB v91.13 restauração pós-login')

old='''async function hlgbHandleRecordRealtime(payload){
  try{
    let row=payload?.new&&Object.keys(payload.new).length?payload.new:payload?.old;
    if(!row)return;
    if(payload.eventType==="DELETE")row={...row,deleted_at:row.deleted_at||new Date().toISOString()};
    if(!HLGB_RECORD_MODULES.includes(String(row.module||"")))return;
    hlgbApplyRecordRow(row);localSaveOnly();
    if(!cloudUserIsEditing()){
      const prev=cloudApplying;cloudApplying=true;try{renderAll()}finally{cloudApplying=prev}
    }else cloudRemoteUpdatePending=true;
    setCloudStatus("⚡ Online · atualização recebida","ok");
    setTimeout(()=>setCloudStatus("⚡ Online · multiusuário","ok"),650);
  }catch(e){console.warn("HLGB v91 realtime",e)}
}
'''
new='''function hlgbRenderIncomingRecord(module){
  module=String(module||"");
  const modalOpen=!!document.querySelector("#modal.show");
  const activePage=document.querySelector(".page.active")?.id||"";

  // A ficha aberta em modal continua protegida contra redesenho enquanto a pessoa digita.
  if(modalOpen){cloudRemoteUpdatePending=true;return false;}

  const prev=cloudApplying;cloudApplying=true;
  try{
    // Produtos precisa atualizar a tabela mesmo que o cursor esteja em Busca/Preço mínimo/Preço máximo.
    // Antes qualquer INPUT focado bloqueava a atualização visual e a edição só aparecia após sair da tela.
    if(module==="products" && activePage==="produtos"){
      if(typeof renderProducts==="function")renderProducts();
      cloudRemoteUpdatePending=false;
      return true;
    }

    // Para as demais telas mantemos a proteção antiga enquanto há um formulário/campo sendo editado.
    if(!cloudUserIsEditing()){
      renderAll();
      cloudRemoteUpdatePending=false;
      return true;
    }
    cloudRemoteUpdatePending=true;
    return false;
  }finally{cloudApplying=prev}
}

async function hlgbHandleRecordRealtime(payload){
  try{
    let row=payload?.new&&Object.keys(payload.new).length?payload.new:payload?.old;
    if(!row)return;
    if(payload.eventType==="DELETE")row={...row,deleted_at:row.deleted_at||new Date().toISOString()};
    const module=String(row.module||"");
    if(!HLGB_RECORD_MODULES.includes(module))return;
    hlgbApplyRecordRow(row);localSaveOnly();
    hlgbRenderIncomingRecord(module);
    setCloudStatus("⚡ Online · atualização recebida","ok");
    setTimeout(()=>setCloudStatus("⚡ Online · multiusuário","ok"),650);
  }catch(e){console.warn("HLGB v91.13 realtime",e)}
}
'''
if old not in s:
    raise SystemExit('realtime handler anchor not found')
s=s.replace(old,new,1)

old2='''async function hlgbPullNormalizedCoreChanges(force=false){
  if(!hlgbRecordReady||hlgbRecordPulling||!cloudAccessToken||document.hidden)return false;
  // Com Realtime conectado não fazemos polling paralelo. As rotinas legadas que
  // chamam esta função a cada poucos segundos passam a sair daqui sem gerar requests.
  if(!force&&hlgbRealtimeState==="SUBSCRIBED")return false;
  const now=Date.now();
  if(!force&&now-hlgbRecordLastPullAt<8000)return false;
'''
new2='''async function hlgbPullNormalizedCoreChanges(force=false){
  if(!hlgbRecordReady||hlgbRecordPulling||!cloudAccessToken||document.hidden)return false;
  // Realtime continua sendo o caminho principal, mas mantemos UMA leitura em lote como segurança.
  // A chamada legada ocorre com frequência, porém este limitador permite no máximo 1 pacote/8 s,
  // em vez das dezenas de consultas por módulo que existiam nas versões antigas.
  const now=Date.now();
  if(!force&&now-hlgbRecordLastPullAt<8000)return false;
'''
if old2 not in s:
    raise SystemExit('pull header anchor not found')
s=s.replace(old2,new2,1)

old3='''    if(changed){
      localSaveOnly();
      if(!cloudUserIsEditing()){
        const prev=cloudApplying;cloudApplying=true;try{renderAll()}finally{cloudApplying=prev}
      }else cloudRemoteUpdatePending=true;
    }
    return changed;
'''
new3='''    if(changed){
      localSaveOnly();
      const modules=[...new Set(rows.map(r=>String(r?.module||"")).filter(Boolean))];
      // Se Produtos mudou, atualiza sua tabela mesmo com um filtro selecionado.
      if(modules.includes("products"))hlgbRenderIncomingRecord("products");
      else if(!cloudUserIsEditing()){
        const prev=cloudApplying;cloudApplying=true;try{renderAll();cloudRemoteUpdatePending=false}finally{cloudApplying=prev}
      }else cloudRemoteUpdatePending=true;
    }
    return changed;
'''
if old3 not in s:
    raise SystemExit('pull changed anchor not found')
s=s.replace(old3,new3,1)

p.write_text(s,encoding='utf-8')
print('v91.13 applied')
