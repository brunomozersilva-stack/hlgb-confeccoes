from pathlib import Path
s=Path('app9238.html').read_text(encoding='utf-8').replace('v92.38','v92.39')
a="try{await Promise.resolve(save());closeModal();renderProjection()}catch(e){if(btn)btn.disabled=false;alert('Não foi possível salvar os clientes.')}"
b="try{try{await Promise.resolve(save())}catch(_e){}let r=await hlgbRecordSaveWithRetry('orders',String(o.id),o,false);if(!r||r.applied!==true)throw new Error('Nuvem não confirmou');closeModal();try{renderProjection()}catch(_r){}}catch(e){if(btn)btn.disabled=false;alert('Não foi possível confirmar na nuvem. '+String(e?.message||e))}"
if a not in s: raise SystemExit('trecho não encontrado')
s=s.replace(a,b,1)
Path('app9239.html').write_text(s,encoding='utf-8')