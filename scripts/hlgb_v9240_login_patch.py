from pathlib import Path
p=Path('app9240.html')
s=p.read_text(encoding='utf-8')
fn='async function hlgbRecordLoadBundle({preserveLocal=false,since=null}={}){'
start=s.find(fn)
if start<0: raise SystemExit('hlgbRecordLoadBundle não encontrado')
body=s.find('  const body={p_since:since||null};',start)
if body<0: raise SystemExit('início do carregador não encontrado')
replace_start=s.find('\n',body)+1
replace_end=s.find('  if(Array.isArray(bundle)',replace_start)
if replace_end<0: raise SystemExit('fim do bloco de bundle não encontrado')
hotfix="  let bundle;\n  bundle=await hlgbRecordLoadDirect(since);\n"
s=s[:replace_start]+hotfix+s[replace_end:]
p.write_text(s,encoding='utf-8')
print('hotfix multiusuário aplicado')
