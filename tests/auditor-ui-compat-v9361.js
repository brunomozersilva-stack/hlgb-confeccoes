const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('release-auditor-ui-compat-v9361.js','utf8');
for(const id of ['hlgbAuditorBlackbox9299','hlgbAuditFull9315','hlgbAuditCritical9315','hlgbAuditDownloadFull9315','hlgbAuditDownloadCritical9315']){
 if(!src.includes('#'+id))throw new Error('botao legado nao ocultado: '+id);
}
for(const action of ['hlgbAuditorRunVisual','hlgbAuditorExportVisual','hlgbAuditorCopyLatest','hlgbAuditorExportSync','hlgbAuditorCleanDerivedSync']){
 if(!src.includes(action))throw new Error('acao legada nao ocultada: '+action);
}
for(const bad of [/hlgbRecordSaveWithRetry\s*=/,/cloudRequest\s*=/,/setInterval\s*=/,/setTimeout\s*=/]){
 if(bad.test(src))throw new Error('UI compat nao deve tocar runtime critico: '+bad);
}
let appended=null;
const document={readyState:'complete',getElementById(){return null},createElement(){return {id:'',textContent:''}},head:{appendChild(x){appended=x}},documentElement:{appendChild(x){appended=x}},addEventListener(){}};
const window={document,console};
const context={window,document,console};vm.createContext(context);vm.runInContext(src,context);
if(!window.HLGB_AUDITOR_UI_COMPAT_9361)throw new Error('compat nao iniciou');
if(!appended||appended.id!=='hlgbAuditorUiCompat9361')throw new Error('css de compatibilidade nao foi instalado');
console.log('AUDITOR_UI_COMPAT_9361_OK');
