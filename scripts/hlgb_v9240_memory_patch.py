# DESATIVADO na v92.40.
# A proteção estrutural atual é aplicada por scripts/hlgb_v9240_memory_guard_patch.py
# dentro do workflow de publicação. Este arquivo antigo sobrescrevia renderAll no
# fim do HTML e reativava syncOrdersToCuts a cada evento da nuvem, anulando a
# otimização e podendo provocar crescimento de memória no Chrome.
print('hotfix antigo de memória desativado; usando memory_guard estrutural')
