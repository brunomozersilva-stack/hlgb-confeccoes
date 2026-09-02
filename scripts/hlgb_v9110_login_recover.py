from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('v91.09 Multiusuário','v91.10 Multiusuário')
s=s.replace('Versão v91.09','Versão v91.10')
s=s.replace('>v91.09</small>','>v91.10</small>')
s=s.replace('/* ===== v91.09 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */','/* ===== v91.10 — MULTIUSUÁRIO POR REGISTRO (TODOS OS MÓDULOS) ===== */')
s=s.replace('/* ===== fim v91.09 ===== */','/* ===== fim v91.10 ===== */')
s=s.replace('HLGB v91.09 bootstrap','HLGB v91.10 bootstrap')
s=s.replace('HLGB v91.09 sync','HLGB v91.10 sync')
s=s.replace('HLGB v91.09 reconciliação produtos','HLGB v91.10 reconciliação produtos')
s=s.replace('HLGB v91.09 reconciliação local','HLGB v91.10 reconciliação local')
old='''     }else throw accessErr;\n   }\n   cloudBootstrapping=false;\n'''
new='''     }else throw accessErr;\n   }\n   // v91.10: o login manual também precisa reconciliar o que já existia neste navegador\n   // antes de a nuvem substituir db.products. Sem isso, a recuperação só rodava em sessão restaurada.\n   await hlgbRecoverLocalOnlyProducts();\n   cloudBootstrapping=false;\n'''
if old not in s:
    raise SystemExit('manual login anchor not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('v91.10 applied')
