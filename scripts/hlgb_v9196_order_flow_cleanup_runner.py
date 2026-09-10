from pathlib import Path
src=Path('scripts/hlgb_v9196_order_flow_cleanup.py').read_text(encoding='utf-8')
old="s=s.replace('</body>',block+'\\n</body>',1)"
new="i=s.rfind('</body>')\nif i<0: raise SystemExit('body final não encontrado')\ns=s[:i]+block+'\\n'+s[i:]"
if old not in src:
    raise SystemExit('linha antiga de inserção não encontrada')
src=src.replace(old,new,1)
exec(compile(src,'hlgb_v9196_order_flow_cleanup.py','exec'),{'__name__':'__main__'})
