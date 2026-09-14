from pathlib import Path

p = Path('app9240.html')
s = p.read_text(encoding='utf-8')

# O app e regenerado a partir da v92.39 em toda publicacao. Ainda assim, se este
# patch for executado duas vezes na mesma arvore, removemos o bloco auxiliar.
START = '<!-- HLGB_V9240_MEMORY_GUARD_START -->'
END = '<!-- HLGB_V9240_MEMORY_GUARD_END -->'
if START in s and END in s:
    a = s.index(START)
    b = s.index(END, a) + len(END)
    s = s[:a] + s[b:]

# Nao basta sobrescrever window.renderAll no fim do arquivo: rotinas antigas
# podem ter capturado a funcao pesada. Aqui trocamos a declaracao principal na
# origem e preservamos a versao antiga apenas para diagnostico.
anchor = 'function renderAll(){'
if anchor not in s:
    raise SystemExit('ERRO: renderAll principal nao encontrado')

light = r'''function hlgbLowMemorySafeV9240(name,...args){
 try{const fn=window[name];if(typeof fn==='function')return fn(...args)}
 catch(e){console.warn('[HLGB memoria v92.40] '+name,e)}
}
let hlgbLowMemoryTimerV9240=null;
function hlgbLowMemoryRenderNowV9240(){
 const page=document.querySelector('.page.active');
 const id=page?.id||'dashboard';
 const sep=document.getElementById('separationOrder');
 const keepSep=String(window.__hlgbOpenSeparation9240||sep?.value||'');
 const R=(name,...args)=>hlgbLowMemorySafeV9240(name,...args);

 switch(id){
  case 'dashboard': R('renderDash'); break;
  case 'pedidos': R('renderOrders');R('fillSeparationOrders');R('renderOrderNotes');break;
  case 'corte': R('renderCuts');R('renderCutAssignmentQueue');break;
  case 'producao': R('renderProduction');R('renderProductionHub');break;
  case 'projecao': R('renderProjection');break;
  case 'capacidadeProducao': R('renderCapacityPlanning');break;
  case 'clientes': R('renderClients');R('renderClientPotentialReport');break;
  case 'produtos': R('renderProducts');break;
  case 'materiais': R('renderMaterials');R('fillSeparationOrders');break;
  case 'estoque': R('renderStock');break;
  case 'faccoes': case 'cadFaccoes': case 'cadLocaisProducao': case 'cadMaquinas': case 'cadTiposServico': R('renderFactions');break;
  case 'pagamentosFaccoes': R('renderFactionPayments');R('renderFactionPaymentPlanner');break;
  case 'cortadores': R('renderCutters');R('drawCutterChart');R('renderCutterProductCosts');break;
  case 'financeiro': R('renderFinance');break;
  case 'hubFinanceiro': R('renderHubFinance');break;
  case 'fornecedores': R('renderSuppliers');break;
  case 'compras': R('renderPurchases');break;
  case 'funcionarios': R('renderEmployees');break;
  case 'exFuncionarios': R('renderFormerEmployees');break;
  case 'folhaPagamento': R('renderPayroll');break;
  case 'faltas': R('renderMissingPieces');break;
  case 'devolucoesDefeitos': R('renderDefectReturns');break;
  case 'inventarioBens': R('renderAssets');break;
  case 'lixeiraPedidos': R('renderOrderTrash');break;
  case 'metas': R('renderGoals');break;
  case 'notas': R('renderOrderNotes');break;
  case 'relatorios': R('renderReports');break;
  case 'usuarios': R('renderUsers');break;
  default:
   // Paginas de cadastro/legadas sao atualizadas ao serem abertas pelo roteador.
   // Evitamos redesenhar dezenas de telas invisiveis a cada evento da nuvem.
   break;
 }

 // Separacao de materiais: mantem a selecao aberta sem reconstruir o sistema.
 if(page?.querySelector?.('#separationOrder')){
  R('fillSeparationOrders');
  const sel=document.getElementById('separationOrder');
  if(keepSep&&sel){sel.value=keepSep;R('renderSeparation')}
  R('renderDestinationChecklists');
  R('renderFactionChecklists9198');
 }
 R('ensurePageSyncButtons');
}
function renderAll(){
 // Realtime pode entregar varias linhas juntas. Uma unica renderizacao atende
 // ao lote inteiro e impede crescimento de DOM/heap por tempestade de eventos.
 if(hlgbLowMemoryTimerV9240)clearTimeout(hlgbLowMemoryTimerV9240);
 hlgbLowMemoryTimerV9240=setTimeout(()=>{
  hlgbLowMemoryTimerV9240=null;
  hlgbLowMemoryRenderNowV9240();
 },120);
}
function renderAllFullV9240(){'''

s = s.replace(anchor, light, 1)

# Reduz polling duplicado. Realtime continua sendo o caminho principal; estes
# timers ficam apenas como rede de seguranca, sem forcar download/render a cada
# poucos segundos.
replacements = [
(
'''setInterval(()=>{\n // JSON legado: somente módulos ainda não migrados.\n cloudCheckRemoteVersion().catch(()=>{});\n},2500);''',
'''setInterval(()=>{\n if(typeof hlgbRecordReady==='undefined'||!hlgbRecordReady)cloudCheckRemoteVersion().catch(()=>{});\n},30000);'''
),
(
'''setInterval(()=>{\n // Fallback das tabelas v90. O Realtime costuma ser instantâneo; esta verificação\n // garante recuperação automática se WebSocket/RLS perder algum evento.\n hlgbPullNormalizedCoreChanges().catch(()=>{});\n},1800);''',
'''setInterval(()=>{\n // Realtime e o caminho principal; fallback leve somente a cada 30 s.\n hlgbPullNormalizedCoreChanges(false).catch(()=>{});\n},30000);'''
),
(
'''setInterval(()=>{\n if(hlgbNormalizedReady&&cloudAccessToken&&hlgbCorePendingRead())hlgbNormalizedSyncNow(false).catch(()=>{});\n},7000);''',
'''setInterval(()=>{\n if(hlgbNormalizedReady&&cloudAccessToken&&hlgbCorePendingRead())hlgbNormalizedSyncNow(false).catch(()=>{});\n},20000);'''
),
(
'''setInterval(()=>{if(hlgbRecordReady&&cloudAccessToken&&hlgbRecordPendingRead())hlgbNormalizedSyncNow(false).catch(()=>{})},3500);''',
'''setInterval(()=>{if(hlgbRecordReady&&cloudAccessToken&&hlgbRecordPendingRead())hlgbNormalizedSyncNow(false).catch(()=>{})},15000);'''
),
(
'''setInterval(()=>{if(hlgbRecordReady&&cloudAccessToken&&!document.hidden)hlgbPullNormalizedCoreChanges(true).catch(()=>{})},6000);''',
'''setInterval(()=>{if(hlgbRecordReady&&cloudAccessToken&&!document.hidden)hlgbPullNormalizedCoreChanges(false).catch(()=>{})},30000);'''
),
]
counts=[]
for old,new in replacements:
    c=s.count(old)
    if c:
        s=s.replace(old,new)
    counts.append(c)

# Marcador pequeno, persistente, para conferir o que realmente foi publicado.
marker = r'''<!-- HLGB_V9240_MEMORY_GUARD_START -->
<script>
(function(){
 'use strict';
 window.__HLGB_MEMORY_GUARD_V9240__={active:true,mode:'active-page',pollFallbackMs:30000};
 console.info('[HLGB] protecao estrutural de memoria v92.40 ativa');
})();
</script>
<!-- HLGB_V9240_MEMORY_GUARD_END -->'''
if '</body>' not in s:
    raise SystemExit('ERRO: </body> nao encontrado')
head,tail=s.rsplit('</body>',1)
s=head+marker+'\n</body>'+tail

p.write_text(s,encoding='utf-8')
print('memory guard estrutural aplicado')
print('renderAll pesado renomeado:', s.count('function renderAllFullV9240(){'))
print('renderAll leve:', s.count('function renderAll(){'))
print('poll replacements:', counts)
print('bytes:', p.stat().st_size)
