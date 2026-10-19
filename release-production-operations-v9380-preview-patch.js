/* HLGB v93.91 — bootstrap: registra baixa remota e aplica autoridade operacional única */
(function(){
  const ts=Date.now();
  let modulesOk=false,areaOk=false;
  try{
    if(typeof HLGB_RECORD_MODULES!=='undefined'&&Array.isArray(HLGB_RECORD_MODULES)){
      if(!HLGB_RECORD_MODULES.includes('operationalWriteoffs'))HLGB_RECORD_MODULES.push('operationalWriteoffs');
      modulesOk=HLGB_RECORD_MODULES.includes('operationalWriteoffs');
    }
    if(typeof HLGB_RECORD_WRITE_AREA!=='undefined'&&HLGB_RECORD_WRITE_AREA&&typeof HLGB_RECORD_WRITE_AREA==='object'){
      HLGB_RECORD_WRITE_AREA.operationalWriteoffs='producao';
      areaOk=HLGB_RECORD_WRITE_AREA.operationalWriteoffs==='producao';
    }
  }catch(e){console.error('[HLGB v93.91] falha ao registrar operationalWriteoffs no cliente',e)}
  window.HLGB_OPERATIONAL_WRITEOFF_MODULE_REGISTERED={version:'93.91',modulesOk,areaOk};
  if(!modulesOk||!areaOk)console.error('[HLGB v93.91] operationalWriteoffs não entrou integralmente no registro do cliente',{modulesOk,areaOk});
  document.write('<script src="./release-production-operations-v9385-core.js?fresh='+ts+'"><\/script>');
  document.write('<script src="./release-production-operations-v9386-finalize.js?fresh='+ts+'"><\/script>');
  document.write('<script src="./release-production-writeoff-integrity-v9391.js?fresh='+ts+'"><\/script>');
})();