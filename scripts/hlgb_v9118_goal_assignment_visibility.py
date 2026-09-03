from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

repls={
    '<button onclick="page(\'metas\',this)">Metas</button>':'<button onclick="page(\'metas\',this)">🎯 Atribuição de metas</button>',
    '<h1>Metas de produção</h1>':'<h1>🎯 Atribuição de metas de produção</h1>',
    '<div class="sub">Metas, custos operacionais e lucro projetado por local de produção. A meta/capacidade semanal também aparece como sugestão na nova Atribuição de Corte.</div>':'<div class="sub">Defina a meta por confecção, facção ou pessoa. Informe quantas pessoas trabalham no local, a meta por pessoa e a periodicidade; o sistema calcula a meta total e acompanha o percentual realizado. Essa meta também aparece como referência na Atribuição de Corte.</div>',
    '<button type="button" class="primary" onclick="newGoal()">+ Nova meta</button>':'<button type="button" class="primary" onclick="newGoal()">🎯 Atribuir nova meta</button>',
}
for old,new in repls.items():
    if old not in s:
        raise SystemExit(f'target not found: {old[:80]}')
    s=s.replace(old,new,1)

marker='<div class="panel">\n  <div class="toolbar" style="align-items:flex-end;flex-wrap:wrap">\n    <button type="button" class="primary" onclick="newGoal()">🎯 Atribuir nova meta</button>'
if marker not in s:
    raise SystemExit('goal panel marker not found')
intro='''<div class="panel" style="border:2px solid rgba(111,63,89,.18);background:#fff8fb">
  <h2 style="margin-bottom:8px">Como atribuir uma meta</h2>
  <div class="sub">Clique em <strong>Atribuir nova meta</strong> e escolha se a meta é para uma <strong>Confecção</strong>, <strong>Facção</strong> ou <strong>Pessoa</strong>. Depois informe a quantidade de pessoas, a meta por pessoa e se ela é semanal, mensal ou anual.</div>
</div>
'''
s=s.replace(marker,intro+marker,1)

s=s.replace('v91.17 Multiusuário','v91.18 Multiusuário')
s=s.replace('Versão v91.17','Versão v91.18')
s=s.replace('>v91.17</small>','>v91.18</small>')

p.write_text(s,encoding='utf-8')
print('patched v91.18 goal assignment visibility')
