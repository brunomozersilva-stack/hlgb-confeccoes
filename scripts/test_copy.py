from pathlib import Path
s=Path('app9238.html').read_text(encoding='utf-8')
Path('app9239.html').write_text(s,encoding='utf-8')