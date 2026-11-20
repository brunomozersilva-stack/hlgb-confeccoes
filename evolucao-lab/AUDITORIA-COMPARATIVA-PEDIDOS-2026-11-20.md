# HLGB Evolução — Pedidos, catálogo e edição: preservação + benchmark
Data: 20/11/2026. **Estado: PENDENTE de aceite**, sem publicação e sem banco comercial.
Fontes originais verificadas em `main`: `release-cutter-planner.js`, `release-cut-model-grade-adjust.js`, `release-cutter-sheet-materials-v9523.js` e `tests/audit-cutter-planner-regression.cjs`. Fontes novas verificadas na branch isolada: `modulos/pedidos-multimodelo-v1.js`, `modulos/corte-multimodelo-v1.js`, `operacao-integrada-core.js` e contratos ACE-001/002/004. A verificação ainda **não é exaustiva** do `app9240.html` nem dos formulários de Pedidos; inventário de 76 funções não é prova de completude.

## Correspondência original → Evolução → prova exigida
| Preservação obrigatória | Evidência na main | Situação na Evolução | Lacuna/prova |
|---|---|---|---|
| Um pedido inclui vários modelos com identidades distintas | `release-cutter-planner.js:modelRows` subdivide pedido em linhas por `productId`; teste legado demonstra 100 Camisola Romantic + 50 Calcinha Liz | `pedidos-multimodelo-v1.js:prepare/create` cria itens com `ITM-001`, `ITM-002` no laboratório; separados das ordens antigas | Teste de paridade criado com 150 peças, mas ainda sem migração de `orders.grade[]` nem confirmação remota |
| Grade cor×tamanho individual por modelo | `release-cut-model-grade-adjust.js:buildHorizontalEditor`; `release-cutter-sheet-materials-v9523.js:gradeMatrix` | `prepare` valida matriz por modelo/cor/tamanho; fluxo antigo de pedido único continua à parte | Testar edição horizontal direta dentro de Pedidos, disponibilidade de cores/tamanhos cadastrados e total em cada linha |
| PP, P, M, G, GG, XG, G1–G4 e tamanhos próprios | `gradeMatrix` ordena tamanhos legados e aceita outros da grade | `sizesOf` aceita até 16 tamanhos informados por pedido, mas `operacao-integrada-core.js:sizes` ainda fixa 4 para pedidos simples | Unificar seleção com catálogo original sem quebrar pedidos antigos; rejeição segura de duplicidade, compatibilidade de nomenclaturas |
| Programação e corte independentes por modelo | `release-cutter-planner.js:modelRows/matches`, busca por número, cliente, produto e prioridade | Plano de corte multimodelo no laboratório, com IDs separados | Conferir responsável, data, prioridade, edição, retorno à busca e saldos, por registro |
| Edição após salvar sem apagar histórico e sem perder identidade | Editor horizontal da `main`, contrato ACE-001 | `pedidos-multimodelo-v1.js` fornece `create` e `inspect`; **não oferece operação de edição de pedido multimodelo** | **P0**: editar item/grade de forma versionada, preservar `itemId` após corte, não reduzir abaixo do executado, impedir alteração silenciosa no financeiro e manter histórico antes/depois |
| Preço por cliente, preço de venda, faturamento e títulos vinculados | Contratos ACE-001/005, inventário LEG-017/018; rastreio detalhado do cadastro original ainda incompleto | Preço do item congela por snapshot; pedido multimodelo não gera financeiro nem estoque de produção | **P0**: política de preço por cliente, exceção autorizada, regras de faturamento e correção; não confundir preço de venda com mão de obra da facção |
| Busca, duplicidade, importação e alteração concorrente | `release-cutter-planner.js:matches/orderSearchRows`; demais telas a inspecionar | Pesquisa global parcial, validação de cor/tamanho duplicado, revisão global | Mapear todos os filtros, referências, numeração humana, importações e conflitos entre Safari/Chrome |
| Histórico completo de envio/separação por variante | Cortes individuais por modelo na main; trilhas de produção e separação a rastrear | Módulos `fluxo-multimodelo-v1.js` lidam com variações, mas não conversam com todos os legados | Teste completo 120→80→50 por modelo/cor/tamanho, com reversão e sem dupla baixa |

### Ganhos já implementados no laboratório (não homologados)
- Pré-validação de 1–20 modelos e 1–30 cores por modelo, até 16 tamanhos, com validação de grade, soma e preço por item.
- Identidade de item separada da identidade do pedido e preço histórico por item, com verificações para impedir alteração silenciosa.
- Contrato `tests/paridade-pedidos-main-contract.cjs` compara o caso original de 2 modelos/150 peças aos totais, tamanhos, preço histórico e integridade da Evolução. **Teste incluído no workflow; aprovação do CI ainda precisa ser confirmada.**

### Pesquisa externa — propostas aplicáveis
- **Odoo 19.0 — Product variants on quotations and sales orders**: modo `Order Grid Entry` para escolha de variantes na própria venda; modelo de grade horizontal móvel, com totais instantâneos por cor/tamanho e alertas para linhas sem estoque. Fonte: https://www.odoo.com/documentation/19.0/applications/sales/sales/sales_quotations/orders_and_variants.html
- **Odoo 19.0 — Pricelists e Product variants**: preço específico por variante, listas de preços diferenciadas; avaliar condições por cliente com transparência da origem do preço. Fontes: https://www.odoo.com/documentation/19.0/applications/sales/sales/products_prices/prices/pricing.html e https://www.odoo.com/documentation/19.0/applications/sales/sales/products_prices/products/variants.html
- **ERPNext — Amending Sales Order after Submit**: edição permitida por regras, ou cancelamento/aditivo controlado quando o documento já tem dependências; aplicar histórico append-only, bloqueio de redução abaixo do atendido e comparação visual antes/depois. Fonte: https://docs.frappe.io/erpnext/amending-sales-order-after-submit
- **GS1 — Identificação de variantes de vestuário**: identidade por variante para cadeia comercial; diferenciar SKU interno/variação do identificador padrão, sem obrigar código GTIN para cada etapa interna. Fonte: https://www.gs1us.org/upcs-barcodes-prefixes/barcodes-for-clothing

### Melhorias próprias propostas, sem alegação de exclusividade
1. **Grade inteligente com previsão de consequência**: antes de salvar, indicar quais lotes/cortes/estoque/acertos podem ser afetados e quais alterações são seguras, exigindo confirmação para mudanças materiais.
2. **Comparação antes/depois auditável**: sempre mostrar diferenças por modelo/cor/tamanho, quantidade, valor, autor, revisão e ID de comando. Proibir atualização silenciosa ou apagamento de movimentações históricas.
3. **Pedido com semáforo de confirmação**: distinguir edição apenas local, pendente de sincronização, confirmada no servidor e conflito; o operador não vê “Salvo” sem prova de leitura de outra sessão.
4. **Pesquisa contextual**: localizar número, cliente, modelo, cor, SKU ou atraso; a lista mostra a próxima ação permitida e *por que* o pedido está bloqueado.
5. **Importação reconciliada**: leitura de pedidos de marketplaces/planilhas após mapeamento, prévia com detecção de duplicidade por referência e soma por variação; não escrever antes da confirmação humana.

### Barreiras antes de declarar equivalência
- Auditoria linha a linha das telas de Pedidos em `app9240.html` e módulos comerciais relacionados.
- Implementar edição segura do pedido multimodelo, preservando vínculo de item após planejamento/corte.
- Completar preços por cliente, filtros, referências, importação e histórico.
- Provar em navegador, duas sessões, servidor e migração reversível de uma cópia autorizada e anonimizada.
- Nenhum merge na `main`, publicação comercial ou alteração de dados reais.

**Regra:** `PENDENTE` até todos os comportamentos da main estarem preservados, haver melhoria medida e aceite operacional registrado.

## Implementação incremental de 20/11 — revisão auditável de quantidade (sem aceite)
- Motor `modulos/pedidos-multimodelo-v1.js:revise` criado: atualização **somente das quantidades** de células de modelos/cores/tamanhos já cadastrados, preservando `orderId`, `itemId` e preço histórico.
- Bloqueia redução abaixo da soma de grades em `multiCutPlans` não cancelados (abertos e concluídos). Recusa exclusão/troca de item, cor, tamanho ou cliente nessa operação.
- Salva justificativa, `commandId`, revisão e snapshots anteriores/posteriores com verificação de integridade e vínculo ao log global.
- Tela de Pedidos contém editor por grade com quantidade mínima reservada por célula e confirmação explícita.
- `tests/revisao-pedidos-multimodelo-contract.cjs` protege alteração permitida, rejeição abaixo do Corte, histórico, identidade de modelo e preço. Incluído no workflow. **Execução integral de CI não confirmada**.
- Arquivo integrado refeito dos 34 arquivos de origem por substituição literal segura, conferidos sintaxe dos quatro scripts, ausência de dependências JS externas e preservação de strings monetárias.
- Verificação de motor em memória sem navegador: alteração de 45 para 46 peças preservou integridade; adulteração posterior foi identificada. Essa verificação não substitui testes de gravação, reabertura ou servidor.

### Pesquisa confirmada nesta etapa
- [Odoo 19 — Order Grid Entry](https://www.odoo.com/documentation/19.0/applications/sales/sales/sales_quotations/orders_and_variants.html): registrar variantes em grade no pedido.
- [ERPNext — Amending Sales Order after Submit](https://docs.frappe.io/erpnext/amending-sales-order-after-submit): verificar documentos dependentes antes de corrigir pedidos confirmados.
- [ERPNext — Sales Order](https://docs.frappe.io/erpnext/sales-order): edição de itens respeita restrições dos vínculos e quantidade atendida.

**Próximas lacunas P0**: acrescentar/remover modelos e cores por aditivo versionado; edição de dados comerciais sem ferir saldos; unificação com as ordens antigas e preços por cliente; prova de gravação servidor, conflito entre sessões, importação/migração reversível e aceite da operação.
