'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const legacy=fs.readFileSync(path.join(root,'release-label-destination-v9310.js'),'utf8');
const core=fs.readFileSync(path.join(root,'hlgb-modules/utilidades/etiquetas-layout-v9602b.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
const samples=[
 {name:'Cortador & Cliente <A>',model:'Conjunto Rosa',size:'P/M/G',pieceQty:'560',volume:'1 de 5',date:'2026-11-18',destination:'Facção Roseli',includeDate:true,copies:2},
 {name:'Joana "Teste"',model:'Robe Gabrielle',size:'GG',pieceQty:'120',volume:'2 de 5',date:'',destination:"L'Equipe",includeDate:false,copies:9},
 {name:'',model:'Calcinha',size:'P',pieceQty:'10',volume:'3 de 5',date:'2026-11-19',destination:'',includeDate:false,copies:1}
];
function environment(withCore,rows=samples,mode='large'){
 let printed='',preview={innerHTML:''};
 const selectors={'.ln':'name','.lm':'model','.ls':'size','.lpq':'pieceQty','.lv':'volume','.ld':'date','.ldest9310':'destination','.lq':'copies'};
 const elements=rows.map(r=>({
  querySelector(selector){
   if(selector==='.grid')return null; // DOM already managed by legacy source; focus on pure rendering.
   if(selector==='.ldate9310')return {checked:r.includeDate};
   const key=selectors[selector];return key?{value:r[key]}:null;
  }
 }));
 const doc={
  getElementById:id=>id==='opsLabelPreview'?preview:id==='opsLabelSize'?{value:mode}:null,
  querySelectorAll:selector=>selector==='.ops-label-row'?elements:[],
  createElement(){throw Error('unexpected DOM creation')}
 };
 const window={open:()=>({document:{write(s){printed=s},close(){}},focus(){}})};
 const context={window,document:doc,console:{info(){},warn(){}},setInterval:()=>1,clearInterval:()=>{},alert:()=>{throw Error('printing blocked')},setTimeout:()=>1};
 vm.createContext(context);
 if(withCore)vm.runInContext(core,context);
 vm.runInContext(legacy,context);
 return {window,html:()=>preview.innerHTML,printed:()=>printed,
  api:window.hlgbLabelDestination9310,rows:copy(rows)};
}
test('carregador mantém 156 scripts anteriores mais Etiquetas, Separação e Auth opcionais',()=>{
 const anchor='const files=',start=loader.indexOf(anchor),end=loader.indexOf(';/* A base pode trazer',start);
 assert.ok(start>=0&&end>start);
 assert.ok(!loader.includes('const moduleGroups='),'proibido ativar os 16 grupos que coincidiram com a falha de login');
 const files=Function('return '+loader.slice(start+anchor.length,end))();
 const addon="hlgb-modules/utilidades/etiquetas-layout-v9602b.js";
 const original=["release-faction-ledger-preservation-v9597.js","release-auditor-call-trace-v9380.js","release-runtime-profiler-v9292.js","hotfix9241.js","release-current.js","release-save-transport-v9320.js","release-wal-idb-convergence-v9536.js","release-pricing.js","release-limits.js","release-cut-organization.js","release-cut-material-usage.js","release-cut-weight-v9579.js","release-cut-model-split.js","release-cut-model-grade-adjust.js","release-cutter-sheet-materials-v9523.js","release-record-integrity.js","release-cut-duplicate-repair-v95105.js","release-notes.js","release-note-integrity.js","release-trade-settlement-v9422.js","release-projection-delivery-integrity.js","release-projection-team-view.js","release-material-tools.js","release-faction-payments.js","release-faction-manual-payment.js","release-faction-send-model-grade.js","release-faction-integrity.js","release-faction-master-integrity.js","release-faction-safe-adjust-v9514.js","release-faction-operations-v9520.js","release-payroll-integrity.js","release-payroll-termination-provisions.js","release-checklist-integrity.js","release-capacity-integrity.js","release-cutter-planner.js","release-hub-tombstone-online.js","release-hub-personal-integrity.js","release-hub-search.js","release-hub-period-summary.js","release-purchase-checkers.js","release-weekly-material-planner-v9583.js","release-hub-integrity.js","release-diagnostics-center.js","release-diagnostics-maintenance-v9406.js","release-internal-auditor.js","release-health-monitor-panel-v9541.js","release-sync-diagnostic-runtime-v9350.js","release-faction-checklist-grade-standard.js","release-faction-material-refresh-v9522.js","release-assistant-query.js","release-assistant-orders.js","release-assistant-invoice.js","release-assistant-invoice-v3.js","release-assistant-voice.js","release-assistant-system-wide.js","release-assistant-order-import.js","release-purchase-note-import.js","release-assistant-invoice-fresh.js","release-assistant-voice-continuous.js","release-assistant-fresh-query.js","release-night-ui-fixes.js","release-operational-polish-v2.js","release-assistant-intent-router-v2.js","release-operations-pack.js","release-label-typography-v9308.js","release-label-destination-v9310.js","release-assistant-mobile-v9250.js","release-mobile-friendly-v9512.js","release-supplier-comparator-v9250.js","release-supplier-debts-v9250.js","release-finance-locations-v9251.js","release-employee-purchases-v9250.js","release-cutter-history-v9250.js","release-whatsapp-pilot-v9250.js","release-business-expansion-v9400.js","release-product-traceability-v9580.js","release-printer3d-nav-guard-v9516.js","release-product-catalog-v9419.js","release-login-3d-baseline-v9407.js","release-printer3d-persistence-v9431.js","release-printer3d-cloud-hydration-v9517.js","release-printer3d-module-recovery-v9596.js","release-daily-safety.js","release-improvements-v9252.js","release-hub-week-v9253.js","release-catalog-recovery-v9254.js","release-critical-ui-v9255.js","release-batch-v9256.js","release-patch-v9257.js","release-hub-master-v9258.js","release-material-health-v9260.js","release-tab-resume-v9262.js","release-auditor-restore-v9263.js","release-assistant-brain-v9265.js","release-hub-editor-v9267.js","release-hub-editor-v9270.js","release-assistant-ui-v9269.js","release-safety-gate-v9269.js","release-system-stability-v9301.js","release-faction-ux-v9287.js","release-payroll-stability-v9293.js","release-advance-sync-v9309.js","release-payroll-termination-stability-v9294.js","release-payroll-view-v9295.js","release-payroll-save-stability-v9296.js","release-payroll-layout-v9298.js","release-hub-forensics-v9291.js","release-auditor-max-debug-v9292.js","release-auditor-blackbox-v9299.js","release-hub-live-refresh-v9289.js","release-auditor-operational-v9314.js","release-sync-recovery-v9301.js","release-orders-cloud-visibility-v9537.js","release-order-delivery-trace-v9539.js","release-sync-guard-v9306.js","release-production-cut-reconcile-v9307.js","release-production-render-fix-v9330.js","release-separation-commit-v9319.js","release-separation-cut-target-v9335.js","release-save-actions-v9322.js","release-wal-replay-bridge-v9332.js","release-wal-confirmed-replay-v9333.js","release-payroll-month-wal-v9334.js","release-payroll-reliable-save-guard-v9344.js","release-payroll-wal-race-v9346.js","release-payroll-snapshot-watch-v9354.js","release-hub-primary-v9323.js","release-hub-delivery-v9324.js","release-auditor-hub-reliability-v9315.js","release-hub-week-unified-v9317.js","release-runtime-recovery-v9326.js","release-ui-stability.js","release-safari-resume-v9266.js","release-production-operations-v9378-preview.js","release-production-operations-v9380-preview-patch.js","release-auditor-boot-analysis-v9381.js","release-auditor-production-v9369.js","release-auditor-authority-map-v9374.js","release-auditor-script-multiplicity-v9438.js","release-auditor-business-v9401.js","release-ui-actions-v9402.js","release-hub-payroll-paid-date-v9515.js","release-cut-step-queues-v9528.js","release-notes-live-sync-v9563.js","release-notes-receivables-v9564.js","release-acerto-returns-v9565.js","release-faction-manual-payment-v9566.js","release-faction-acerto-consolidated-v95102.js","release-faction-payee-settlement-v95104.js","release-note-price-reconcile-v95103.js","release-note-receipts-v9576.js","release-faction-service-rates-v9577.js","release-hub-save-proof-v9567.js","release-hub-learning-v9568.js","release-learning-cloud-v9573.js","release-faction-feature-guard-v9598.js"];
 const authAddon='hlgb-modules/autenticacao/rede-segura-v9613.js';
 const separationAddon='hlgb-modules/producao/separacao-progresso-v9617.js';
 const cutAddon='hlgb-modules/producao/corte-alvo-v9618.js';
 assert.equal(files.length,160);assert.equal(new Set(files).size,160);
 assert.deepEqual(files.filter(f=>f!==addon&&f!==authAddon&&f!==separationAddon&&f!==cutAddon),original);
 assert.equal(files[files.length-1],authAddon,'Auth opcional continua por último');
 assert.equal(files.indexOf(separationAddon)+1,files.indexOf('release-separation-commit-v9319.js'),'Cálculo novo deve carregar antes do controlador legado');
 assert.equal(files.indexOf(cutAddon)+1,files.indexOf('release-separation-cut-target-v9335.js'),'Corte alvo deve carregar antes do controlador legado');
 assert.equal(files.indexOf(addon)+1,files.indexOf('release-label-destination-v9310.js'));
 assert.match(loader,/__HLGB_BOOT_READY_9477=true/);
 assert.ok(!loader.includes('hlgbSyncFinalizedCutsToProductionV9240'));
});
test('módulo novo não usa DOM, banco, rede, impressora, WAL ou timer',()=>{
 for(const forbidden of ['document.','cloudRequest','indexedDB','localStorage','hlgbRecordSaveWithRetry','window.open','setInterval','fetch('])
  assert.equal(core.includes(forbidden),false,'cálculo puro não pode executar '+forbidden);
 assert.equal(core.includes('function labelSize(mode)'),true);
 assert.equal(core.includes("function labelBody(x,tag='span')"),true);
});
test('pequena/média/grande: prévia HTML e geometria idênticas ao fallback',()=>{
 for(const mode of ['small','medium','large','INVALID',null]){
  const before=environment(false,samples,mode),after=environment(true,samples,mode);
  assert.deepEqual(JSON.parse(JSON.stringify(after.api.collect())),JSON.parse(JSON.stringify(before.api.collect())));
  assert.equal(after.html(),before.html(),'prévia inicial diferente');
  const a=before.window.HLGB_LABEL_LAYOUT_9602B,b=after.window.HLGB_LABEL_LAYOUT_9602B;
  assert.equal(a,undefined);assert.ok(b);
  assert.equal(JSON.stringify(b.labelSize(mode)),JSON.stringify(b.labelSize(mode==='INVALID'?'small':mode)));
 }
});
test('impressão completa A4 é byte a byte idêntica com core ou fallback',()=>{
 const a=environment(false),b=environment(true),old=JSON.stringify(a.rows);
 a.window.printLabels9249();b.window.printLabels9249();
 assert.equal(b.printed(),a.printed(),'HTML da impressão deve manter todos os pixels e textos da saída original');
 assert.match(b.printed(),/DESTINO:/);
 assert.match(b.printed(),/Facção Roseli/);
 assert.match(b.printed(),/1 de 5/);
 assert.match(b.printed(),/class="page labelpage"/);
 assert.equal((b.printed().match(/class="page labelpage"/g)||[]).length,2,'12 etiquetas devem ocupar duas páginas de até 10');
 assert.equal(JSON.stringify(b.rows),old,'impressão não pode modificar registros locais');
});
test('escape HTML, opcional de data e nomes vazios mantêm a mesma saída',()=>{
 const old=environment(false),newMode=environment(true);
 const pure=newMode.window.HLGB_LABEL_LAYOUT_9602B;
 for(const row of [
  ...samples,{}, {name:"<script>alert(1)</script>",destination:'X & Y',includeDate:true,date:'2026-11-18'},
  {name:'Teste',model:'',size:'',pieceQty:'',volume:'',destination:'',includeDate:false}
 ]){
  for(const tag of ['span','div']){
   // Compare pure output against an independent capture of the unchanged function body
   const start=legacy.indexOf("function labelBody(x,tag='span'){"),end=legacy.indexOf('function renderPreview(){',start);
   const original=legacy.slice(start,end);
   const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
   const expected=new Function('esc','x','tag','const labelCore9602b=null;\n'+original+' return labelBody(x,tag);')(esc,row,tag);
   assert.equal(pure.labelBody(row,tag),expected);
  }
 }
 const sanitized=pure.labelBody(samples[0]);
 assert.match(sanitized,/&lt;A&gt;/);
 assert.ok(!sanitized.includes('<A>'));
 assert.doesNotMatch(pure.labelBody(samples[1]),/DATA:/);
});
