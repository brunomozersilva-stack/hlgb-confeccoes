from pathlib import Path
from datetime import datetime, timezone

stamp=datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
html=f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HLGB Confecções</title><meta http-equiv="cache-control" content="no-cache,no-store,must-revalidate"><meta http-equiv="pragma" content="no-cache"><meta http-equiv="expires" content="0"></head><body><script>location.replace('./app9240.html?v=92.40&fresh={stamp}');</script></body></html>'''
Path('abrir.html').write_text(html,encoding='utf-8')
print('launcher v92.40',stamp)
