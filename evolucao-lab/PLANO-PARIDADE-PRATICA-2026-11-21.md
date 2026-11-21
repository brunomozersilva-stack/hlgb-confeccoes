# HLGB Evolução — combinar a praticidade do comercial com a profundidade nova
Data: 21/11/2026. Escopo: somente laboratório fictício; não alterar `main`.

## Diagnóstico

O HLGB comercial **continua sendo a referência operacional**. A presença de 20 áreas navegáveis no laboratório **não significa paridade de suas 76 funções**.
O contrato `auditoria-paridade-critica-v3.json` registra 19 verificações críticas: 14 gaps confirmados, 2 itens parciais e 3 ainda não verificados. Esse contrato não é liberado automaticamente por um redesign.

A interface de Pedidos anterior no laboratório oferecia simultaneamente lançamento antigo, grade por cor,
multimodelo, importação, ajustes, revisões e preços negociados em painéis longos. Isso exige muitos
deslocamentos e deixa obscuro qual fluxo cria um pedido **operacional** e qual é apenas **preparação**.

Nos scripts do programa original (`scripts/hlgb_v9229_orders_compact_finalize.py`,
`release-orders-cloud-visibility-v9537.js` e `release-order-delivery-trace-v9539.js`)
foram identificados: visão aberta/finalizada, lista compacta, paginação, filtros de número/cliente/
situação/prioridade/data, finalização, conferência de nuvem e acompanhamento por modelo.
**Esses scripts são evidência parcial, não teste de paridade comportamental integral.**

## Regras para a fusão

1. **Principal = operação simples:** uma entrada evidente, grade horizontal por cor/tamanho, busca
   rápida, quantidade, andamento e acesso a ações recorrentes.
2. **Avançado = profundidade existente:** multimodelo, importação, grade editável, preço por
   cliente, revisões, aditivos, restrições de Corte, auditoria e impressões ficam acessíveis.
   Recolher visualmente não pode apagar o formulário, desabilitar comando ou mudar validação.
3. **Sem dois dados concorrentes:** telas devem consultar o mesmo documento e mesmos comandos;
   não inventar números, prazos ou situação. Status derivados de Corte/Facção/Expedição devem
   ser identificados como calculados, não equivalentes a status de produção.
4. **Sem dupla gravação:** repetir grade apenas copia campos como rascunho, sem criar Pedido,
   título, estoque ou evento. Salvar continua exigindo o comando existente e sua confirmação.
5. **Sem falsa aprovação:** multimodelo ainda não integra sozinho todo o ciclo contábil,
   operacional e de estoque; o ambiente offline não sincroniza entre computadores.
6. **Critério de aceite:** operador consegue reproduzir tarefa do comercial com menos
   passos e igual resultado, Safari/Chrome/mobile, persistência e rollback; a equipe aprova.

## Entregue nesta primeira fase — Pedidos

- Mesa prática no início, com pesquisa por pedido, cliente, produto, cor e grade;
- Filtros por andamento e prioridade, prazo PCP quando cadastrado, últimas referências
  primeiro, paginação de 20 em 20, total e peças;
- Lançamento por cor/tamanho como caminho principal;
- Acesso rápido a multimodelo e demais ferramentas recolhidas, com comandos preservados;
- Repetir grade em **rascunho** sem gerar segundo pedido financeiro;
- Provas de UI e preservação dos formulários anteriores.

## Pendências de maior impacto — não homologadas

| Ordem | Área | Preservar do HLGB comercial | Melhorar na Evolução | Prova exigida |
| --- | --- | --- | --- | --- |
| 1 | Pedidos | grade multimodelo, tamanho variável, cor horizontal, editar e filtro operacional | lançamento integrado sem duplicar modos nem finanças | mesmo pedido, cores, tamanhos, preço e histórico em duas sessões |
| 2 | Corte | folha e agenda por modelo, equipe, assinaturas, peso útil/lixo | cálculo de capacidade, BOM, impressão A4 e rastreio | quantidade, estoque, cinco seções e impressão Safari |
| 3 | Facções | envio e retorno parcial, troca de destino, traveta, preço | saldo por destino e acompanhamento por produto | ninguém perde pagamento ao trocar facção |
| 4 | Acertos | detalhamento e acerto por pessoa, pago/não pago, ajuste | histórico, consolidado/individual, compensação e PDF | sem segunda baixa e com trilha por cliente/facção |
| 5 | Folha | passagem individual editável e ordenação, histórico | sincronização, somatório correto e provas | duas sessões leem exatamente o mesmo valor |
| 6 | Compras/Estoque | receitas, devoluções, baixa, conferência | planejamento material e custos coerentes | entrada única, rastreável, sem estoque negativo |
| 7 | Hub | vencimento, parcelas, pagamentos, anexos, filtros | WAL confiável, saldo e conciliação | erro de rede não duplica título |
| 8 | Auditor/Bot e outras 20 áreas | todas as ações, filtros, impressão e utilidades | diagnóstico sem alterar dados | lista de 76 tarefas e aceite individual |

**Não fazer merge, migração de dados ou substituição do HLGB comercial com base apenas no teste das 20 abas.**
