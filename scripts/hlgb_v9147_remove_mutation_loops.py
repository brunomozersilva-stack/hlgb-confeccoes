from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

before=s

# v91.39: o observer reescrevia o texto do proprio botao observado.
pat939=r"function watchPricing939\(\)\{bindPricing939\(\);let root=document\.getElementById\('produtos'\)\|\|document\.body;if\(!root\|\|root\.__pricingWatch939\)return;root\.__pricingWatch939=true;new MutationObserver\(bindPricing939\)\.observe\(root,\{childList:true,subtree:true\}\)\}"
s,n939=re.subn(pat939,"function watchPricing939(){bindPricing939()}",s,count=1)

# v91.44: segundo observer com o mesmo risco de loop por childList/textContent.
pat944=r"let prodPage=document\.getElementById\('produtos'\);if\(prodPage&&!prodPage\.__pricing944Watch\)\{prodPage\.__pricing944Watch=true;new MutationObserver\(bindPricing944\)\.observe\(prodPage,\{childList:true,subtree:true\}\)\}"
s,n944=re.subn(pat944,"let prodPage=document.getElementById('produtos');if(prodPage)prodPage.__pricing944Watch='disabled-v9147'",s,count=1)

if n939!=1:
    raise SystemExit(f'v91.39 observer pattern not found exactly once: {n939}')
if n944!=1:
    raise SystemExit(f'v91.44 observer pattern not found exactly once: {n944}')

# Marcador e versao visivel.
if 'HLGB v91.47 INPUT FREEZE FIX' not in s:
    s=s.replace('</body>','<!-- HLGB v91.47 INPUT FREEZE FIX: pricing MutationObservers removed -->\n</body>',1)

s=s.replace('v91.46 Multiusuário','v91.47 Multiusuário')
s=s.replace('Versão v91.46','Versão v91.47')
s=s.replace('>v91.46</small>','>v91.47</small>')

if s==before:
    raise SystemExit('No changes applied')

p.write_text(s,encoding='utf-8')
print('v91.47 mutation loop fix applied', {'v9139':n939,'v9144':n944})
