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

def show_occurrences(term,label,around=2400,limit=25):
    print('\n===== '+label+' / '+term+' =====')
    start=0; n=0
    while n<limit:
        i=s.find(term,start)
        if i<0: break
        a=max(0,i-around); b=min(len(s),i+len(term)+around)
        print(f'\n--- occurrence {n+1} @ {i} ---\n'+s[a:b])
        start=i+len(term); n+=1
    if n==0: print('NOT FOUND',term)

show_between('<!-- HLGB_V9198_START -->','<!-- HLGB_V9198_END -->','V9198 ADDON',50000)
show_between('function orderMaterialBreakdownByProduct(o){','function consolidatedPurchaseNeed','MATERIAL BREAKDOWN',30000)
show_between('async function hlgbEnsureRecordsOnlineAfterLogin','async function hlgbRecordRpcSave','RECORD LOAD',35000)
show_between('function renderFactionDelivery935','function ','FACTION DELIVERY 935',25000)
show_between('function renderCuts(){','function ','RENDER CUTS FIRST',25000)
show_between('function renderCutPlan','function ','CUT PLAN',25000)
for term,label in [
    ('projectionInvoices','PROJECTION INVOICES'),
    ('renderProjection','RENDER PROJECTION'),
    ('Acerto','ACERTO'),
    ('acerto','acerto lower'),
    ('paymentHistory','PAYMENT HISTORY'),
    ('Finalizar nota','FINALIZAR NOTA'),
    ('finalizar nota','finalizar nota lower'),
    ('Nota pronta','NOTA PRONTA'),
    ('nota pronta','nota pronta lower'),
    ('renderFinance','RENDER FINANCE'),
    ('factionMasters','FACTION MASTERS'),
    ('mfpix','FAC PIX FIELD'),
]: show_occurrences(term,label)
