from pathlib import Path
import re

s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
out=[]
out.append(f'bytes={len(s)} lines={len(lines)}')
out.append('=== DOMContentLoaded / startup calls ===')
for i,line in enumerate(lines,1):
    if ('DOMContentLoaded' in line or 'setInterval(' in line or 'setTimeout(' in line or 'requestAnimationFrame(' in line) and i>1:
        # nearby version/comment context
        start=max(0,i-4); end=min(len(lines),i+3)
        ctx='\n'.join(f'{j+1}: {lines[j][:300]}' for j in range(start,end))
        out.append('\n'+ctx)

out.append('\n=== boot/recover functions and invocations ===')
names=[]
for m in re.finditer(r'function\s+([A-Za-z_$][\w$]*(?:boot|Boot|recover|Recover|start|Start)[\w$]*)\s*\(',s):
    names.append(m.group(1))
for name in sorted(set(names)):
    defs=len(re.findall(r'function\s+'+re.escape(name)+r'\s*\(',s))
    calls=len(re.findall(r'(?<!function\s)\b'+re.escape(name)+r'\s*\(',s))
    out.append(f'{name}: defs={defs} calls~={calls}')

out.append('\n=== top-level IIFE starts ===')
for i,line in enumerate(lines,1):
    if re.search(r'^\s*\(\s*(?:async\s*)?function\s*\(',line) or re.search(r'^\s*\(\s*\(.*=>',line):
        out.append(f'{i}: {line[:300]}')

Path('debug/startup-v9187.txt').write_text('\n'.join(out),encoding='utf-8')
print('wrote debug/startup-v9187.txt')
