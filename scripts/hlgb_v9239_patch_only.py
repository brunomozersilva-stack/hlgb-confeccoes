from pathlib import Path
code=Path('scripts/hlgb_v9239_cut_hidden_client_save.py').read_text(encoding='utf-8')
exec(compile(code,'scripts/hlgb_v9239_cut_hidden_client_save.py','exec'),{'__name__':'__main__'})
