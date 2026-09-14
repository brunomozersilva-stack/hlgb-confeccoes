from pathlib import Path

# O parâmetro fresh é gerado no navegador a cada abertura.
# Assim, mesmo que o Chrome mantenha abrir.html em cache, o app9240.html
# sempre é solicitado com uma URL nova e não reaproveita uma versão antiga.
html='''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HLGB Confecções</title><meta http-equiv="cache-control" content="no-cache,no-store,must-revalidate"><meta http-equiv="pragma" content="no-cache"><meta http-equiv="expires" content="0"></head><body><script>location.replace('./app9240.html?v=92.40&fresh='+Date.now());</script></body></html>'''
Path('abrir.html').write_text(html,encoding='utf-8')
print('launcher v92.40 com cache-bust dinâmico')
