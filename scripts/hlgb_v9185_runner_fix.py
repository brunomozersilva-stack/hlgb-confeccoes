from pathlib import Path
import subprocess, sys

patch=Path('scripts/hlgb_v9185_hub_cut_status.py')
s=patch.read_text(encoding='utf-8')

bad="""  let e=(db.hubFinanceEntries||[]).find(x=>String(x.id)===String(id));if(!e)return,done=isDone9185(e),next={...e,status:done?'Previsto':'Realizado',updatedAt:new Date().toISOString()};"""
good="""  let e=(db.hubFinanceEntries||[]).find(x=>String(x.id)===String(id));
  if(!e)return;
  let done=isDone9185(e),next={...e,status:done?'Previsto':'Realizado',updatedAt:new Date().toISOString()};"""
if bad not in s and good not in s:
    raise SystemExit('ERRO: trecho do toggle rapido nao encontrado')
s=s.replace(bad,good,1)

# hlgbRecordReady e cloudAccessToken sao variaveis globais lexicais no aplicativo,
# nao propriedades garantidas de window. Mantem o mesmo padrao do codigo existente.
s=s.replace("if(!window.hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function'){","if(!hlgbRecordReady&&typeof hlgbEnsureRecordsOnlineAfterLogin==='function'){")
s=s.replace("if(typeof hlgbRecordSaveWithRetry!=='function'||!window.cloudAccessToken)throw new Error('Sincronização por registro indisponível.');","if(typeof hlgbRecordSaveWithRetry!=='function'||!cloudAccessToken)throw new Error('Sincronização por registro indisponível.');")

patch.write_text(s,encoding='utf-8')
subprocess.check_call([sys.executable,str(patch)])
print('PASS runner v91.85')
