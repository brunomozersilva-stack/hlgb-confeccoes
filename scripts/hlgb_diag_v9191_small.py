from pathlib import Path
import re
s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
Path('debug').mkdir(exist_ok=True)

def extract_function(name):
    rx=re.compile(r'(?:async\s+)?function\s+'+re.escape(name)+r'\s*\(')
    m=rx.search(s)
    if not m:return ''
    start=m.start(); brace=s.find('{',m.end())
    if brace<0:return ''
    depth=0; quote=None; esc=False; i=brace
    while i<len(s):
        ch=s[i]
        if quote:
            if esc: esc=False
            elif ch=='\\': esc=True
            elif ch==quote: quote=None
        else:
            if ch in ('"',"'",'`'): quote=ch
            elif ch=='{': depth+=1
            elif ch=='}':
                depth-=1
                if depth==0:return s[start:i+1]
        i+=1
    return s[start:]

def extract_assignment(name):
    for pat in [r'window\.'+re.escape(name)+r'\s*=\s*(?:async\s*)?function\s*\(',r'window\.'+re.escape(name)+r'\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*{']:
        m=re.search(pat,s)
        if m:
            brace=s.find('{',m.end()-1); start=m.start(); depth=0; quote=None; esc=False; i=brace
            while i<len(s):
                ch=s[i]
                if quote:
                    if esc: esc=False
                    elif ch=='\\': esc=True
                    elif ch==quote: quote=None
                else:
                    if ch in ('"',"'",'`'): quote=ch
                    elif ch=='{': depth+=1
                    elif ch=='}':
                        depth-=1
                        if depth==0:return s[start:i+1]
                i+=1
    return ''

names=['hlgbRecordPendingRead','hlgbRecordPendingStore','hlgbNormalizedSyncNow','hlgbQueueNormalizedSync','hlgbRecordSaveWithRetry','cloudRestoreStoredAuth','cloudStoreAuth','cloudRefreshSession','doLogin','logout','persistDb','setCloudStatus']
for n in names:
    txt=extract_function(n) or extract_assignment(n)
    Path('debug',f'v9192-fn-{n}.txt').write_text(txt,encoding='utf-8')
    print(n,len(txt))

terms=[
 ('v9192-context-autoauth.txt','if(cloudRestoreStoredAuth())'),
 ('v9192-context-pending-ui.txt','aguardando nuvem'),
 ('v9192-context-pending-key.txt','HLGB_RECORD_PENDING'),
 ('v9192-context-saving.txt','Salvando automático'),
 ('v9192-context-login-screen.txt','loginScreen.style.display')
]
for fname,term in terms:
    positions=[m.start() for m in re.finditer(re.escape(term),s,re.I)]
    out=[]
    for pos in positions[:8]:
        a=max(0,pos-5000);b=min(len(s),pos+9000);out.append(s[a:b])
    Path('debug',fname).write_text('\n\n===== NEXT =====\n\n'.join(out),encoding='utf-8')
    print(fname,len(positions),sum(map(len,out)))
