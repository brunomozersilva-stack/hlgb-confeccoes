from pathlib import Path
p=Path('app9240.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9240_MEMORY_START -->'
END='<!-- HLGB_V9240_MEMORY_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]
addon=r'''<!-- HLGB_V9240_MEMORY_START -->
<script>
(function(){
'use strict';
const safe=(name,...args)=>{try{const fn=window[name];if(typeof fn==='function')return fn(...args)}catch(e){console.warn('[HLGB memoria] '+name,e)}};
window.renderAll=function(){
  try{
    safe('syncOrdersToCuts');
    const id=document.querySelector('.page.active')?.id||'dashboard';
    if(id==='dashboard')safe('renderDash');
    else if(id==='projecao')safe('renderProjection');
    else if(id==='capacidadeProducao')safe('renderCapacityPlanning');
    else if(['cadFaccoes','cadLocaisProducao','cadMaquinas','cadTiposServico','faccoes'].includes(id))safe('renderFactions');
    else if(id==='lixeiraPedidos')safe('renderOrderTrash');
    else if(id==='metas')safe('renderGoals');
    else if(id==='notas')safe('renderOrderNotes');
    else if(id==='corte')safe('renderCuts');
    else if(id==='pagamentosFaccoes')safe('renderFactionPayments');
    else if(id==='cortadores'){safe('renderCutters');safe('drawCutterChart');safe('renderCutterProductCosts')}
    else if(id==='produtos')safe('renderProducts');
    else if(id==='pedidos'){safe('renderOrders');safe('renderOrderNotes')}
    else if(id==='clientes'){safe('renderClients');safe('renderClientPotentialReport')}
    else if(id==='producao'){safe('syncFinalizedCutsToProduction');safe('renderProduction');safe('renderProductionHub')}
    else if(id==='faltas')safe('renderMissingPieces');
    else if(id==='devolucoesDefeitos')safe('renderDefectReturns');
    else if(id==='financeiro')safe('renderFinance');
    else if(id==='hubFinanceiro')safe('renderHubFinance');
    else if(id==='estoque')safe('renderStock');
    else if(id==='inventarioBens')safe('renderAssets');
    else if(id==='funcionarios')safe('renderEmployees');
    else if(id==='exFuncionarios')safe('renderFormerEmployees');
    else if(id==='folhaPagamento')safe('renderPayroll');
    else if(id==='fornecedores')safe('renderSuppliers');
    else if(id==='compras')safe('renderPurchases');
    else if(id==='relatorios')safe('renderReports');
    else {
      const sep=document.getElementById('separationOrder');
      if(sep&&sep.closest('.page')?.id===id){
        const keep=String(window.__hlgbOpenSeparation9240||sep.value||'');
        safe('fillSeparationOrders');
        if(keep){sep.value=keep;if(String(sep.value)===keep)safe('renderSeparation')}
        safe('renderDestinationChecklists');safe('renderFactionChecklists9198');
      }
    }
    safe('ensurePageSyncButtons');
  }catch(e){console.warn('[HLGB memoria] renderAll',e)}
};
window.HLGB_MEMORY_PATCH='92.40';
console.info('[HLGB] renderização econômica ativa');
})();
</script>
<!-- HLGB_V9240_MEMORY_END -->'''
head,tail=s.rsplit('</body>',1)
s=head+addon+'\n</body>'+tail
p.write_text(s,encoding='utf-8')
print('hotfix de memória aplicado')
