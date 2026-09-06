from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
patterns=[
'const KEY=','let KEY=','var KEY=','HLGB_RECORD_PENDING_KEY','HLGB_CORE_PENDING_KEY',
'localStorage.getItem(KEY)','localStorage.setItem(KEY','sessionStorage.getItem(KEY)',
'hlgb_record_pending','hlgb_core_pending_v1','cloudSaveConflictSnapshot','cloudDirtyMeta',
'function togglePayrollPaid','window.togglePayrollPaid','paidAt','paidValue','function renderPayroll'
]
for pat in patterns:
    print('\n###',pat)
    start=0; hits=0
    while True:
        i=s.find(pat,start)
        if i<0: break
        hits+=1
        a=max(0,i-900); b=min(len(s),i+2600)
        print(f'--- hit {hits} at {i} ---')
        print(s[a:b])
        start=i+len(pat)
        if hits>=8: break
    if not hits: print('NOT FOUND')
