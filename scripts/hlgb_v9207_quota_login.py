from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
old='''function localSaveOnly(){\n Storage.prototype.setItem.call(localStorage,KEY,JSON.stringify(db));\n}'''
new='''function localSaveOnly(){\n const payload=JSON.stringify(db);\n try{\n  Storage.prototype.setItem.call(localStorage,KEY,payload);\n  window.__hlgbLocalCacheQuotaBlocked=false;\n  return true;\n }catch(e){\n  const msg=String(e?.message||e||'');\n  const quota=(e?.name==='QuotaExceededError'||e?.name==='NS_ERROR_DOM_QUOTA_REACHED'||/quota|storage.*full|exceed/i.test(msg));\n  if(!quota)throw e;\n  // v92.07: falta de espaço local nunca pode derrubar o login multiusuário.\n  // Remove somente cópias auxiliares/recriáveis; nunca apaga banco de trabalho, sessão ou filas pendentes.\n  const disposable=[\n   'hlgb_cloud_conflict_backup_v1','hlgb_projection_safety_backup','hlgb_v9148_precloud_snapshot',\n   'hlgb_v9149_forensic_snapshot','hlgb_durable_wal_archive_v1','hlgb_v9148_integrity_report',\n   'hlgb_v9149_recovery_report','hlgb_v9149_recovery_journal'\n  ];\n  for(const k of disposable){try{Storage.prototype.removeItem.call(localStorage,k)}catch(_){}}\n  try{\n   Storage.prototype.setItem.call(localStorage,KEY,payload);\n   window.__hlgbLocalCacheQuotaBlocked=false;\n   console.warn('[HLGB v92.07] Espaço local liberado; cache salvo novamente.');\n   return true;\n  }catch(e2){\n   const msg2=String(e2?.message||e2||'');\n   const quota2=(e2?.name==='QuotaExceededError'||e2?.name==='NS_ERROR_DOM_QUOTA_REACHED'||/quota|storage.*full|exceed/i.test(msg2));\n   if(!quota2)throw e2;\n   // A nuvem continua sendo a fonte principal. Não interrompe a carga/login por falha de cache local.\n   window.__hlgbLocalCacheQuotaBlocked=true;\n   console.warn('[HLGB v92.07] Cache local cheio; seguindo em modo nuvem sem bloquear o usuário.');\n   return false;\n  }\n }\n}'''
count=s.count(old)
if count<1:
    raise SystemExit('Função localSaveOnly esperada não encontrada')
s=s.replace(old,new)
# Atualiza identificação visível sem remover complementos anteriores.
s=s.replace('v92.06','v92.07')
p.write_text(s,encoding='utf-8')
print('v92.07 aplicada; substituições localSaveOnly:',count)
