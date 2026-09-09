from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
patterns=[
    'function doLogin',
    'async function doLogin',
    'hlgbEnsureRecordsOnlineAfterLogin',
    'ensureCloudUserAccessOnline',
    'hlgbRecordReady',
    'grant_type=password',
    'signInWithPassword',
    'cloudLogin',
    'hlgb_records',
    '/rpc/',
    'cloudRestoreStoredAuth',
]
out=[]
for pat in patterns:
    out.append('\n'+'='*88+'\nPATTERN: '+pat+'\n'+'='*88+'\n')
    start=0
    hits=0
    while True:
        i=s.find(pat,start)
        if i<0: break
        hits+=1
        a=max(0,i-3500); b=min(len(s),i+6500)
        out.append(f'\n--- HIT {hits} @ {i} ---\n')
        out.append(s[a:b])
        start=i+len(pat)
        if hits>=5: break
    if not hits: out.append('NOT FOUND\n')
Path('debug').mkdir(exist_ok=True)
Path('debug/login-9182-snippets.txt').write_text(''.join(out),encoding='utf-8')
print('diagnostico escrito')
