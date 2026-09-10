from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')

def part(start, end=None, n=30000):
    i=s.find(start); print('\n===',start,'@',i,'===')
    if i<0:return
    if end:
        j=s.find(end,i+len(start)); j=(j+len(end)) if j>=0 else min(len(s),i+n)
    else:j=min(len(s),i+n)
    print(s[i:j][:n])
for a,b in [
 ('async function hlgbLoadNormalizedCore','async function hlgbEnsureRecordsOnlineAfterLogin'),
 ('function newHubFinanceEntry','function editHubFinanceEntry'),
 ('function renderHubFinance','function '),
 ('function newFactionMaster','function editFactionMaster'),
 ('function editFactionMaster','function '),
 ('function syncOrdersToCuts','function pedidosQuePrecisamDeCorte'),
 ('function obterCorteDoPedido','function '),
 ('function materialNeedForPieces','function '),
 ('function registerFactionDelivery935','function '),
]: part(a,b)
