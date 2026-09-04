from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'HLGB v91.35 PROJECTION + CAPACITY + FACTION DELIVERY + PIX COPY' in s:
    print('v91.35 already applied')
    raise SystemExit(0)
assert 'Sistema de Gestão v91.34 Multiusuário' in s, 'Expected v91.34 base'
for marker in [
    'HLGB v91.34 HUB CALENDAR + CUT READY QUEUE',
    'HLGB v91.33 EXPLICIT DELETE HARDENING',
    'HLGB v91.32 EMPLOYEE MASTER SAFETY',
    'HLGB v91.31 RECONCILIACAO OPERACIONAL',
    'HLGB v91.28 AUTHORITATIVE RECORD MERGE',
    'HLGB v91.26 DATA INTEGRITY GUARD'
]:
    assert marker in s, f'Missing safety marker: {marker}'

s=s.replace('Sistema de Gestão v91.34 Multiusuário','Sistema de Gestão v91.35 Multiusuário',1)
s=s.replace('Versão v91.34</b>','Versão v91.35</b>',1)
s=s.replace('>v91.34</small>','>v91.35</small>',1)

old_nav='''<div class="nav-group">\n  <button type="button" class="nav-group-title" onclick="toggleNavGroup(this)">💰 <span>Financeiro</span><b>⌄</b></button>\n  <div class="nav-submenu">\n    <button onclick="page('financeiro',this)">Financeiro geral</button>\n    <button onclick="page('hubFinanceiro',this)">Hub Financeiro</button>\n    <button onclick="page('folhaPagamento',this)">Folha de pagamento</button>\n    <button onclick="page('pagamentosFaccoes',this)">Pagamentos facções</button>\n  </div>\n</div>'''
new_nav='''<button type="button" class="nav-home" onclick="page('hubFinanceiro',this)">💰 <span>Hub Financeiro</span></button>\n\n<div class="nav-group">\n  <button type="button" class="nav-group-title" onclick="toggleNavGroup(this)">💰 <span>Financeiro</span><b>⌄</b></button>\n  <div class="nav-submenu">\n    <button onclick="page('financeiro',this)">Financeiro geral</button>\n    <button onclick="page('folhaPagamento',this)">Folha de pagamento</button>\n    <button onclick="page('pagamentosFaccoes',this)">Pagamentos facções</button>\n  </div>\n</div>'''
assert old_nav in s, 'Finance menu anchor not found'
s=s.replace(old_nav,new_nav,1)

old_opts='let opts=[...new Set(scheduledBase.map(({order:o})=>projectionLocationForOrder(o)||"Sem local"))].sort((a,b)=>a.localeCompare(b,"pt-BR"));'
new_opts='let opts=[...new Set(scheduledBase.map(({order:o,item})=>projectionProductionSplit(o.id,item.key)||projectionLocationForOrder(o)||"Sem local"))].sort((a,b)=>a.localeCompare(b,"pt-BR"));'
assert old_opts in s, 'Projection location options anchor not found'
s=s.replace(old_opts,new_opts,1)
old_filter='let loc=projectionLocationForOrder(o)||"Sem local";'
new_filter='let loc=projectionProductionSplit(o.id,item.key)||projectionLocationForOrder(o)||"Sem local";'
assert old_filter in s, 'Projection location filter anchor not found'
s=s.replace(old_filter,new_filter,1)
old_cell='''money(projectionRemainingValue(item)),\n     esc(projectionLocationForOrder(o)||"Sem local"),'''
new_cell='''money(projectionRemainingValue(item)),\n     esc(projectionProductionSplit(o.id,item.key)||projectionLocationForOrder(o)||"Sem local"),'''
assert old_cell in s, 'Projection exit location cell anchor not found'
s=s.replace(old_cell,new_cell,1)

addon=Path('scripts/hlgb_v9135_addon.html').read_text(encoding='utf-8')
pos=s.rfind('</body>')
assert pos>=0, 'final </body> not found'
s=s[:pos]+'\n'+addon+'\n'+s[pos:]
p.write_text(s,encoding='utf-8')
print('Applied HLGB v91.35 projection, capacity, faction delivery and PIX copy')
