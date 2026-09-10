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

names=['renderCapacityPlanning','assignmentsFor','allProjectionRows','projectionItemsForOrder','capacityDateRange','renderProduction','renderFactions','renderCutters','renderDailyCuts','finishCut','renderCuts']
for n in names:
    txt=extract_function(n) or extract_assignment(n)
    Path('debug',f'v9191-fn-{n}.txt').write_text(txt,encoding='utf-8')
    print(n,len(txt))

# contexts by phrase, narrow and useful
for fname,term in [('v9191-context-destino.txt','Modelos ainda sem destino'),('v9191-context-queue.txt','Fila por local'),('v9191-context-grade.txt','actualCutGrade'),('v9191-context-capacity.txt','capacityAssignments')]:
    pos=s.lower().find(term.lower())
    if pos<0:txt=''
    else:
        a=max(0,pos-8000);b=min(len(s),pos+18000);txt=s[a:b]
    Path('debug',fname).write_text(txt,encoding='utf-8')
    print(fname,len(txt))
