from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
old='renderGoals();hlgb916EnsureData();renderCutAssignmentQueue();renderDestinationChecklists();renderFactionPaymentPlanner();renderHubFinance();if(document.getElementById("missingOpenTable"))renderMissingPieces();'
new='renderGoals();\n try{hlgb916EnsureData()}catch(e){console.error("HLGB v91.17 ensureData",e)}\n try{renderCutAssignmentQueue()}catch(e){console.error("HLGB v91.17 cutAssignment",e)}\n try{renderDestinationChecklists()}catch(e){console.error("HLGB v91.17 destinationChecklists",e)}\n try{renderFactionPaymentPlanner()}catch(e){console.error("HLGB v91.17 factionPlanner",e)}\n try{renderHubFinance()}catch(e){console.error("HLGB v91.17 hubFinance",e)}\n if(document.getElementById("missingOpenTable"))renderMissingPieces();'
if old not in s:
    raise SystemExit('renderAll target not found')
s=s.replace(old,new,1)
s=s.replace('v91.16 Multiusuário','v91.17 Multiusuário')
s=s.replace('Versão v91.16','Versão v91.17')
s=s.replace('>v91.16</small>','>v91.17</small>')
p.write_text(s,encoding='utf-8')
print('patched v91.17 interface guard')
