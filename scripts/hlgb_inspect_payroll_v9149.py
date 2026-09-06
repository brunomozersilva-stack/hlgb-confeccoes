from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
patterns=['function togglePayrollPaid','window.togglePayrollPaid','paidAt','paidValue','function renderPayroll','localStorage.setItem','HLGB_CLOUD_CONFLICT_KEY','hlgb_cloud_conflict_backup_v1','payroll-pix']
for pat in patterns:
    print('\n###',pat)
    start=0; hits=0
    while True:
        i=s.find(pat,start)
        if i<0: break
        hits+=1
        a=max(0,i-1200); b=min(len(s),i+3600)
        print(f'--- hit {hits} at {i} ---')
        print(s[a:b])
        start=i+len(pat)
        if hits>=6: break
    if not hits: print('NOT FOUND')
