from pathlib import Path

src=Path('scripts/hlgb_v9197_order_edit_faction_missing.py').read_text(encoding='utf-8')
old="s=s.replace('</body>',addon+'\\n</body>',1)"
new="pos=s.rfind('</body>')\nif pos<0: raise SystemExit('Fechamento </body> não encontrado')\ns=s[:pos]+addon+'\\n'+s[pos:]"
if old not in src:
    raise SystemExit('Trecho de inserção original não encontrado')
src=src.replace(old,new,1)
exec(compile(src,'hlgb_v9197_order_edit_faction_missing_fixed_exec.py','exec'))
