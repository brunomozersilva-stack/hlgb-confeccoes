from pathlib import Path
import re, subprocess, tempfile

p=Path('index.html')
s=p.read_text(encoding='utf-8')

old='''async function hlgbPullNormalizedCoreChanges(force=false){
  if(!hlgbRecordReady||hlgbRecordPulling||!cloudAccessToken||document.hidden)return false;
  // Realtime continua sendo o caminho principal, mas mantemos UMA leitura em lote como segurança.
  // A chamada legada ocorre com frequência, porém este limitador permite no máximo 1 pacote/8 s,
  // em vez das dezenas de consultas por módulo que existiam nas versões antigas.
  const now=Date.now();
  if(!force&&now-hlgbRecordLastPullAt<8000)return false;
  hlgbRecordLastPullAt=now;hlgbRecordPulling=true;
  try{
    let since=null;
    if(hlgbRecordGlobalLastSeen){
      const t=Date.parse(hlgbRecordGlobalLastSeen);
      if(Number.isFinite(t))since=new Date(Math.max(0,t-1000)).toISOString();
    }
    const bundle=await hlgbRecordLoadBundle({preserveLocal:true,since});
    const rows=Array.isArray(bundle?.rows)?bundle.rows:[];
    const changed=rows.length>0;
    if(changed){
      localSaveOnly();
      const modules=[...new Set(rows.map(r=>String(r?.module||"")).filter(Boolean))];
      // Produtos e Folha atualizam a tela mesmo com filtros focados.
      let handled=false;
      if(modules.includes("products"))handled=hlgbRenderIncomingRecord("products")||handled;
      if(modules.includes("payroll"))handled=hlgbRenderIncomingRecord("payroll")||handled;
      if(!handled&&!cloudUserIsEditing()){
        const prev=cloudApplying;cloudApplying=true;try{renderAll();cloudRemoteUpdatePending=false}finally{cloudApplying=prev}
      }else if(!handled) cloudRemoteUpdatePending=true;
    }
    return changed;
  }catch(e){
    // Uma falha transitória de leitura jamais desativa o modo por registros.
    console.warn("HLGB v91 pull bundle",e);return false;
  }finally{hlgbRecordPulling=false}
}'''

new='''async function hlgbPullNormalizedCoreChanges(force=false){
  if(!hlgbRecordReady||hlgbRecordPulling||!cloudAccessToken||document.hidden)return false;
  // Realtime continua sendo o caminho principal, mas mantemos UMA leitura em lote como segurança.
  // A chamada legada ocorre com frequência, porém este limitador permite no máximo 1 pacote/8 s,
  // em vez das dezenas de consultas por módulo que existiam nas versões antigas.
  const now=Date.now();
  if(!force&&now-hlgbRecordLastPullAt<8000)return false;
  hlgbRecordLastPullAt=now;hlgbRecordPulling=true;
  try{
    // Guardamos o último instante realmente conhecido ANTES da leitura. A consulta usa 1 s de
    // sobreposição para não perder registros, então ela pode devolver novamente linhas já aplicadas.
    // Essas linhas repetidas não podem provocar renderAll(), senão a tela dá a impressão de tremida.
    const lastBeforePull=String(hlgbRecordGlobalLastSeen||"");
    let since=null;
    if(lastBeforePull){
      const t=Date.parse(lastBeforePull);
      if(Number.isFinite(t))since=new Date(Math.max(0,t-1000)).toISOString();
    }
    const bundle=await hlgbRecordLoadBundle({preserveLocal:true,since});
    const rows=Array.isArray(bundle?.rows)?bundle.rows:[];
    const freshRows=lastBeforePull
      ? rows.filter(r=>String(r?.updated_at||"")>lastBeforePull)
      : rows;
    const changed=freshRows.length>0;
    if(changed){
      localSaveOnly();
      const modules=[...new Set(freshRows.map(r=>String(r?.module||"")).filter(Boolean))];
      // Produtos e Folha atualizam a tela mesmo com filtros focados.
      let handled=false;
      if(modules.includes("products"))handled=hlgbRenderIncomingRecord("products")||handled;
      if(modules.includes("payroll"))handled=hlgbRenderIncomingRecord("payroll")||handled;
      if(!handled&&!cloudUserIsEditing()){
        const prev=cloudApplying;cloudApplying=true;try{renderAll();cloudRemoteUpdatePending=false}finally{cloudApplying=prev}
      }else if(!handled) cloudRemoteUpdatePending=true;
    }
    return changed;
  }catch(e){
    // Uma falha transitória de leitura jamais desativa o modo por registros.
    console.warn("HLGB v91 pull bundle",e);return false;
  }finally{hlgbRecordPulling=false}
}'''

count=s.count(old)
if count!=1:
    raise SystemExit(f'ERRO: bloco de pull esperado 1 vez, encontrado {count}')
s=s.replace(old,new,1)

marker='<!-- HLGB_V9184_JITTER_FIX -->'
if marker not in s:
    style='''\n<!-- HLGB_V9184_JITTER_FIX -->\n<style id="hlgb-v9184-jitter-style">\n/* Evita deslocamento horizontal quando o texto do estado da nuvem muda. */\n#cloudStatus{display:inline-block;width:205px;text-align:center;white-space:nowrap;box-sizing:border-box}\n@media(max-width:680px){#cloudStatus{width:auto;min-width:0}}\n</style>\n'''
    head=s.find('</head>')
    if head<0: raise SystemExit('ERRO: </head> nao encontrado')
    s=s[:head]+style+s[head:]

header_old='<small style="font-size:10px;opacity:.8">v91.83</small>'
header_new='<small style="font-size:10px;opacity:.8">v91.84</small>'
if header_old in s:
    s=s.replace(header_old,header_new,1)
elif header_new not in s:
    raise SystemExit('ERRO: identificacao visual da versao nao encontrada')

# Valida que a correção ficou exatamente uma vez.
if s.count('const lastBeforePull=String(hlgbRecordGlobalLastSeen||"");')!=1:
    raise SystemExit('ERRO: protecao contra redraw repetido nao ficou unica')
if s.count(marker)!=1:
    raise SystemExit('ERRO: estilo anti-tremida duplicado')
if '... 329474 bytes omitted ...' in s:
    raise SystemExit('ERRO: index voltou a conter truncamento')
if 'function doLogin()' not in s:
    raise SystemExit('ERRO: login principal ausente')

# Valida sintaxe do script que contém a implementação atual da sincronização por registros.
pat=re.compile(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',re.I|re.S)
blocks=[]
for m in pat.finditer(s):
    body=m.group(1)
    if 'const lastBeforePull=String(hlgbRecordGlobalLastSeen||"");' in body:
        blocks.append(body)
if len(blocks)!=1:
    raise SystemExit(f'ERRO: esperado 1 bloco de sincronizacao corrigido, encontrado {len(blocks)}')
js=Path(tempfile.gettempdir())/'hlgb_v9184_sync.js'
js.write_text(blocks[0],encoding='utf-8')
r=subprocess.run(['node','--check',str(js)],capture_output=True,text=True)
if r.returncode!=0:
    print(r.stderr or r.stdout)
    raise SystemExit('ERRO: JavaScript de sincronizacao invalido')

p.write_text(s,encoding='utf-8')
print('PASS v91.84: polling ignora linhas repetidas e cloudStatus tem largura estavel')
