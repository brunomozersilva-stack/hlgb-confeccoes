from pathlib import Path
import re
s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
patterns=[r'setInterval\s*\(',r'MutationObserver',r'requestAnimationFrame',r'renderAll\s*\(',r'overflow\s*[:=]',r'scrollbar',r'scrollHeight',r'clientWidth',r'offsetWidth',r'innerWidth',r'body\.style',r'document\.body\.style',r'classList\.(add|remove|toggle)',r'setTimeout\s*\(']
rx=re.compile('|'.join(patterns),re.I)
out=[]
for i,line in enumerate(lines):
    if rx.search(line):
        a=max(0,i-2); b=min(len(lines),i+3)
        out.append(f'===== line {i+1} =====')
        out.extend(f'{j+1}: {lines[j]}' for j in range(a,b))
        out.append('')
Path('debug').mkdir(exist_ok=True)
Path('debug/v9184-jitter.txt').write_text('\n'.join(out),encoding='utf-8')

# Recortes direcionados para entender se o polling redesenha a tela inteira.
targets=['function setCloudStatus','function hlgbPullNormalizedCoreChanges','async function hlgbPullNormalizedCoreChanges','function cloudCheckRemoteVersion','async function cloudCheckRemoteVersion','function renderAll','function hlgbRenderIncomingRecord','function hlgbStartRealtime','cloudStatus','topbar']
detail=[]
seen=set()
for target in targets:
    for i,line in enumerate(lines):
        if target in line:
            key=(target,i)
            if key in seen: continue
            seen.add(key)
            a=max(0,i-12); b=min(len(lines),i+55)
            detail.append(f'===== TARGET {target!r} line {i+1} =====')
            detail.extend(f'{j+1}: {lines[j]}' for j in range(a,b))
            detail.append('')
Path('debug/v9184-jitter-detail.txt').write_text('\n'.join(detail),encoding='utf-8')
print('generic lines',len(out),'detail lines',len(detail))
