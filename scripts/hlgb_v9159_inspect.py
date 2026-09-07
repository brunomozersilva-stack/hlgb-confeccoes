from pathlib import Path
import re
s=Path('index.html').read_text(encoding='utf-8')
needles=['function renderSeparation()','function abateMissingPiece(id)','function sepState939(o)','window.renderSeparation=function','window.renderSeparationList=function']
out=[]
for needle in needles:
    i=s.find(needle)
    out.append(f'\n===== {needle} @ {i} =====\n')
    if i>=0:
        out.append(s[i:i+18000])
Path('scripts/v9159_inspect.txt').write_text(''.join(out),encoding='utf-8')
print('inspection written')
