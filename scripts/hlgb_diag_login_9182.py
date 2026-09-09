from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
patterns=['id="loginScreen"','id="loginUser"','id="loginPass"','doLogin()','async function cloudSignIn','function cloudSignIn','async function ensureCloudUserAccessOnline','async function hlgbEnsureRecordsOnlineAfterLogin']
out=[]
for pat in patterns:
    pos=[]; st=0
    while True:
        i=s.find(pat,st)
        if i<0: break
        pos.append(i); st=i+len(pat)
    out.append(f'\n===== {pat} hits={len(pos)} =====\n')
    for n,i in enumerate(pos[:4],1):
        a=max(0,i-1200); b=min(len(s),i+5000)
        out.append(f'\n--- {n}@{i} ---\n{s[a:b]}\n')
Path('debug').mkdir(exist_ok=True)
Path('debug/login-9182-snippets.txt').write_text(''.join(out),encoding='utf-8')
