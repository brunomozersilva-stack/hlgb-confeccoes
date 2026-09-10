from pathlib import Path
src=Path('scripts/hlgb_v9199_operational_repairs.py').read_text(encoding='utf-8')
old="s=s.replace('</body>',addon+'\\n</body>',1)"
new="pos=s.rfind('</body>')\nif pos<0: raise SystemExit('Fechamento real </body> não encontrado')\ns=s[:pos]+addon+'\\n'+s[pos:]"
if old not in src:
    raise SystemExit('Linha antiga de injeção não encontrada')
src=src.replace(old,new,1)
exec(compile(src,'hlgb_v9199_operational_repairs_fixed_exec.py','exec'),{'__name__':'__main__'})
