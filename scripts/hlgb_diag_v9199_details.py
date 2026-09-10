from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')

def show_between(a,b,label,maxchars=35000):
    print('\n===== '+label+' =====')
    i=s.find(a)
    if i<0: print('NOT FOUND',a); return
    j=s.find(b,i+len(a)) if b else -1
    if j<0: j=min(len(s),i+maxchars)
    else: j+=len(b)
    t=s[i:j]
    if len(t)>maxchars:t=t[:maxchars]+'\n...TRUNCATED...'
    print(t)

show_between('<!-- HLGB_V9198_START -->','<!-- HLGB_V9198_END -->','V9198 ADDON',50000)
show_between('function orderMaterialBreakdownByProduct(o){','function consolidatedPurchaseNeed','MATERIAL BREAKDOWN',30000)
show_between('async function hlgbEnsureRecordsOnlineAfterLogin','async function hlgbRecordRpcSave','RECORD LOAD',35000)
show_between('function renderFactionDelivery935','function ','FACTION DELIVERY 935',25000)
show_between('function renderCuts(){','function ','RENDER CUTS FIRST',25000)
show_between('function renderCutPlan','function ','CUT PLAN',25000)
