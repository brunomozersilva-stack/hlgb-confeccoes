/* HLGB v92.98 — Folha: ações sempre visíveis e layout responsivo */
(function(){
'use strict';
if(window.hlgbPayrollLayout9298)return;
const V='92.98';
function inject(){
 let s=document.getElementById('hlgbPayrollLayout9298Style');
 if(s)s.remove();
 s=document.createElement('style');s.id='hlgbPayrollLayout9298Style';
 s.textContent=`
 #payrollTable .hlgb-payroll-status-row{overflow:visible!important;box-sizing:border-box!important;width:100%!important;max-width:100%!important}
 #payrollTable .payroll-row-main,
 #payrollTable .payroll-list-head{
   display:grid!important;
   grid-template-columns:minmax(180px,1.55fr) minmax(82px,.72fr) minmax(82px,.72fr) minmax(82px,.72fr) minmax(92px,.82fr) minmax(105px,.9fr) minmax(108px,.82fr) minmax(190px,1.35fr)!important;
   gap:8px!important;
   align-items:center!important;
   width:100%!important;
   min-width:0!important;
   box-sizing:border-box!important;
 }
 #payrollTable .payroll-row-main>*{min-width:0!important;box-sizing:border-box!important}
 #payrollTable .payroll-num,#payrollTable .payroll-net-cell,#payrollTable .payroll-pix{white-space:normal!important;overflow-wrap:anywhere!important}
 #payrollTable .payroll-actions{display:flex!important;gap:5px!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:wrap!important;min-width:0!important;overflow:visible!important}
 #payrollTable .payroll-actions button{display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;justify-content:center!important;min-height:34px!important;min-width:auto!important;width:auto!important;max-width:100%!important;padding:6px 9px!important;margin:0!important;white-space:nowrap!important;font-size:12px!important;line-height:1.15!important}
 #payrollTable .hlgb-status-pill{max-width:100%!important;box-sizing:border-box!important}
 #payrollTable .payroll-company,#payrollTable .payroll-company-list{max-width:100%!important;overflow:visible!important}
 @media(max-width:1180px){
   #payrollTable .payroll-row-main,#payrollTable .payroll-list-head{grid-template-columns:minmax(160px,1.4fr) repeat(4,minmax(76px,.7fr)) minmax(90px,.8fr) minmax(100px,.8fr) minmax(150px,1.15fr)!important;gap:6px!important}
   #payrollTable .payroll-actions button{font-size:11px!important;padding:6px 7px!important}
 }
 @media(max-width:900px){
   #payrollTable{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
   #payrollTable .payroll-row-main,#payrollTable .payroll-list-head{min-width:960px!important;grid-template-columns:190px 90px 90px 90px 100px 120px 115px 210px!important}
   #payrollTable .hlgb-payroll-status-row{overflow:visible!important}
 }
 `;
 document.head.appendChild(s);return true;
}
function repair(){inject();try{window.hlgbPayrollView9295?.render?.()}catch(e){}return true}
function boot(){inject();setTimeout(inject,300);setTimeout(inject,1200)}
boot();
document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(!b)return;if(String(b.textContent||'').includes('Por confecção')||String(b.textContent||'').includes('Ordem alfabética'))setTimeout(inject,30)},true);
window.hlgbPayrollLayout9298={version:V,inject,repair};
window.HLGB_PAYROLL_LAYOUT_9298=V;
console.info('[HLGB] Folha v'+V+' — ações sempre visíveis');
})();
