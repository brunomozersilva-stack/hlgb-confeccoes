from pathlib import Path

# A proteção de memória é aplicada antes deste launcher pelo workflow através de
# hlgb_v9240_memory_guard_patch.py. Não executar o hotfix antigo aqui: ele
# sobrescrevia a renderização econômica e reativava trabalho pesado a cada
# atualização da nuvem.

# O parâmetro fresh é gerado no navegador a cada abertura.
# Tanto o link oficial quanto a raiz/favoritos antigos apontam para a versão atual.
html='''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HLGB Confecções</title><meta http-equiv="cache-control" content="no-cache,no-store,must-revalidate"><meta http-equiv="pragma" content="no-cache"><meta http-equiv="expires" content="0"></head><body><script>location.replace('./app9240.html?v=92.40&fresh='+Date.now());</script></body></html>'''
for target in ('abrir.html', 'index.html'):
    Path(target).write_text(html, encoding='utf-8')
print('entradas abrir.html e index.html direcionadas à v92.40 com cache-bust dinâmico')
