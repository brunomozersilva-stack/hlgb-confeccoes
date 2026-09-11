from pathlib import Path

p=Path('scripts/hlgb_v9221_cutter_excel_controls.py')
s=p.read_text(encoding='utf-8')
old="s,n=re.subn(pat,new,s,count=1,flags=re.S)"
new="s,n=re.subn(pat,lambda m:new,s,count=1,flags=re.S)"
if old not in s:
    raise SystemExit('Linha de substituição esperada não encontrada')
s=s.replace(old,new,1)
exec(compile(s,str(p),'exec'),{'__name__':'__main__'})
