from pathlib import Path

path = Path('index.html')
s = path.read_text(encoding='utf-8')

if 'function hlgbSortedSizes(values)' not in s:
    anchor = 'function orderMatrixRowsHTML(colors,sizes,existing=[]){'
    helper = r'''function hlgbSortedSizes(values){
  const fallback=["P","M","G","GG"];
  const source=(Array.isArray(values)&&values.length?values:fallback)
    .map(v=>String(v??"").trim()).filter(Boolean);
  const unique=[...new Set(source)];
  const letterOrder={PP:0,P:1,M:2,G:3,GG:4,XG:5,XGG:6,EG:7,EGG:8};
  const numeric=v=>/^\d+(?:[.,]\d+)?$/.test(v);
  return unique.sort((a,b)=>{
    const aa=String(a).toUpperCase(),bb=String(b).toUpperCase();
    const ai=Object.prototype.hasOwnProperty.call(letterOrder,aa)?letterOrder[aa]:null;
    const bi=Object.prototype.hasOwnProperty.call(letterOrder,bb)?letterOrder[bb]:null;
    if(ai!==null&&bi!==null)return ai-bi;
    if(ai!==null)return -1;
    if(bi!==null)return 1;
    const an=numeric(aa),bn=numeric(bb);
    if(an&&bn)return parseFloat(aa.replace(',','.'))-parseFloat(bb.replace(',','.'));
    if(an)return 1;
    if(bn)return -1;
    return aa.localeCompare(bb,'pt-BR',{numeric:true,sensitivity:'base'});
  });
}
'''
    if anchor not in s:
        raise SystemExit('anchor orderMatrixRowsHTML not found')
    s = s.replace(anchor, helper + anchor, 1)

patterns = [
    '(db.sizes||[]).length?db.sizes:["P","M","G","GG"]',
    "(db.sizes||[]).length?db.sizes:['P','M','G','GG']",
]
replaced = 0
for old in patterns:
    n = s.count(old)
    replaced += n
    s = s.replace(old, 'hlgbSortedSizes(db.sizes)')

# Version bump only after the size-order patch is present.
s = s.replace('v91.13', 'v91.14')
s = s.replace('Versão v91.13', 'Versão v91.14')

if 'function hlgbSortedSizes(values)' not in s:
    raise SystemExit('size helper missing after patch')
if 'hlgbSortedSizes(db.sizes)' not in s:
    raise SystemExit('no grade size source was patched')
if 'v91.14' not in s:
    raise SystemExit('version bump failed')

path.write_text(s, encoding='utf-8')
print(f'v91.14 applied; normalized size expressions: {replaced}')
