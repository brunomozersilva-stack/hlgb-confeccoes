from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
patterns=[
 'cloudSignIn=', 'function cloudSignIn', 'cloudSignIn(',
 'function ensureCloudUserAccessOnline', 'ensureCloudUserAccessOnline=',
 'function hlgbEnsureRecordsOnlineAfterLogin', 'hlgbEnsureRecordsOnlineAfterLogin=',
 'function hlgbLoadRecord', 'function hlgbFetchRecord',
 'hlgb_records?select=', 'rpc/', 'hlgbRecordReady=',
]
out=[]
for pat in patterns:
    pos=[]; start=0
    while True:
        i=s.find(pat,start)
        if i<0: break
        pos.append(i); start=i+len(pat)
    out.append(f'\n===== {pat} | hits={len(pos)} =====\n')
    for n,i in enumerate(pos[:8],1):
        a=max(0,i-1800); b=min(len(s),i+5500)
        out.append(f'\n--- {n} @ {i} ---\n{s[a:b]}\n')
Path('debug').mkdir(exist_ok=True)
Path('debug/login-9182-snippets.txt').write_text(''.join(out),encoding='utf-8')
print('diagnostico direcionado escrito')
