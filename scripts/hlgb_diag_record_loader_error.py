from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
needle='falha ao carregar pacote de registros'
i=s.lower().find(needle)
print('index',i)
if i>=0:
 a=max(0,s.rfind('async function',0,i)); b=s.find('\nasync function',i+1)
 if b<0:b=min(len(s),i+25000)
 print(s[a:b])
for n in ['hlgbRecordCanRead','hlgbRecordLoad','hlgb_records?','HLGB_RECORD_MODULES']:
 i=s.find(n); print('\n===',n,i,'==='); print(s[max(0,i-3000):i+12000] if i>=0 else '')
