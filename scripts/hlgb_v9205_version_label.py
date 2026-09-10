from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
# A v92.05 apenas corrige a identificação visível após a sequência 92.00/01/02,
# pois o sistema já possuía uma v92.04 anterior. Não altera regras funcionais.
s=s.replace('v92.02','v92.05')
p.write_text(s,encoding='utf-8')
print('Identificação consolidada em v92.05')
