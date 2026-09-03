from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

if 'v91.24 Multiusuário' in s:
    print('v91.24 already applied')
    raise SystemExit(0)

# Add helper before record pending storage so stale local absence is never interpreted
# as a deletion for projection notes / linked finance entries.
anchor='function hlgbRecordPendingStore(){'
helper='''function hlgb924ProtectImplicitDelete(module,old){
  if(module==="projectionInvoices")return true;
  if(module==="finance"&&old?.data?.projectionInvoiceId!=null)return true;
  return false;
}
'''
if anchor not in s:
    raise SystemExit('pending store anchor not found')
s=s.replace(anchor,helper+anchor,1)

old='for(const [id,old] of snap){if(!old.deleted_at&&!local.has(id)){ops.push({id,data:hlgbRecordClone(old.data),deleted:true});any=true}}'
new='for(const [id,old] of snap){if(!hlgb924ProtectImplicitDelete(module,old)&&!old.deleted_at&&!local.has(id)){ops.push({id,data:hlgbRecordClone(old.data),deleted:true});any=true}}'
if old not in s:
    raise SystemExit('pending implicit delete target not found')
s=s.replace(old,new,1)

old='for(const op of ops){if(op.deleted)local.delete(String(op.id));else local.set(String(op.id),hlgbRecordClone(op.data))}'
new='for(const op of ops){if(op.deleted){if(!hlgb924ProtectImplicitDelete(module,{data:op.data}))local.delete(String(op.id))}else local.set(String(op.id),hlgbRecordClone(op.data))}'
if old not in s:
    raise SystemExit('pending replay target not found')
s=s.replace(old,new,1)

old='for(const [id,old] of snap){if(!old.deleted_at&&!local.has(id))jobs.push({id,data:old.data,deleted:true})}'
new='for(const [id,old] of snap){if(!hlgb924ProtectImplicitDelete(module,old)&&!old.deleted_at&&!local.has(id))jobs.push({id,data:old.data,deleted:true})}'
if old not in s:
    raise SystemExit('sync implicit delete target not found')
s=s.replace(old,new,1)

# Make Projection integrity repair run after a fresh bundle load, so a restored note
# immediately rebuilds delivered/remaining state from the invoice ledger.
old='localSaveOnly();setTimeout(()=>hlgbNormalizedSyncNow(false),40);'
new='localSaveOnly();try{if(typeof hlgb923EnsureProjectionIntegrity==="function")hlgb923EnsureProjectionIntegrity()}catch(e){console.warn("HLGB v91.24 projection repair after load",e)}setTimeout(()=>hlgbNormalizedSyncNow(false),40);'
if old not in s:
    raise SystemExit('post-load repair target not found')
s=s.replace(old,new,1)

s=s.replace('v91.23 Multiusuário','v91.24 Multiusuário')
s=s.replace('Versão v91.23','Versão v91.24')
s=s.replace('>v91.23</small>','>v91.24</small>')

p.write_text(s,encoding='utf-8')
print('patched HLGB v91.24 projection delete guard')
