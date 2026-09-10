import ast,re,subprocess
from pathlib import Path
src=Path('scripts/hlgb_v9199_operational_repairs.py').read_text(encoding='utf-8')
t=ast.parse(src); addon=None
for n in ast.walk(t):
    if isinstance(n,ast.Assign) and any(isinstance(x,ast.Name) and x.id=='addon' for x in n.targets):
        addon=ast.literal_eval(n.value);break
if not addon: raise SystemExit('addon não encontrado')
m=re.search(r'<script id="hlgb-v9199-script">(.*?)</script>',addon,re.S)
if not m: raise SystemExit('script não encontrado')
js=m.group(1); Path('/tmp/v9199.js').write_text(js,encoding='utf-8')
r=subprocess.run(['node','--check','/tmp/v9199.js'],capture_output=True,text=True)
print('linhas',len(js.splitlines()));print(r.stderr)
lines=js.splitlines()
for i in range(max(0,len(lines)-130),len(lines)): print(f'{i+1}: {lines[i]}')
raise SystemExit(r.returncode)
