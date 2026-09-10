from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
def part(start,end=None,n=28000):
 i=s.find(start);print('\n###',start,i)
 if i<0:return
 j=s.find(end,i+len(start)) if end else -1
 if j<0:j=min(len(s),i+n)
 print(s[i:j][:n])
for a,b in [
 ('function save(){','function '),
 ('function newOrder(){','function '),
 ('function renderCuts(){','function '),
 ('function renderFactionDelivery935(){','function '),
 ('function hlgb916HubSummary','function '),
 ('function orderMaterialBreakdownByProduct(o){','function consolidatedPurchaseNeed'),
 ('<!-- HLGB_V9198_START -->','<!-- HLGB_V9198_END -->')
]:part(a,b,50000)
