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

## Aditivos por modelo e cor — incremento posterior (20/11/2026)
**Fontes legadas cotejadas:** `release-cutter-planner.js:modelRows`, `release-cut-model-grade-adjust.js:buildHorizontalEditor`, `release-cutter-sheet-materials-v9523.js:gradeMatrix`. Na main, uma mesma ordem tem modelos com quantidades/cortes independentes e grades por cor/tamanho; a Evolução não pode colapsar esses vínculos.

**Benchmark atualizado:**
- Odoo 19 — *Order Grid Entry* de variantes nos pedidos, como referência para aditivos com seleção explícita de modelos/cores: https://www.odoo.com/documentation/19.0/applications/sales/sales/sales_quotations/orders_and_variants.html
- ERPNext — *Amending Sales Order after Submit* e *Sales Order*: alteração condicionada ao estado dos documentos dependentes; base para bloquear exclusão de modelo/cor com corte, envio ou separação vinculados: https://docs.frappe.io/erpnext/amending-sales-order-after-submit e https://docs.frappe.io/erpnext/sales-order

**Implementação laboratorial:** novo comando `order.multi.amend` registra aditivo com motivo obrigatório, snapshot anterior/posterior e prova no log. É possível incluir outro modelo e incluir/retirar cores; a retirada de modelo é bloqueada quando há qualquer folha ou movimentação vinculada, inclusive folha cancelada (histórico). A retirada de cor é bloqueada se constar em Corte ou envio. Nenhum ID antigo é reutilizado, mesmo após remoção; preço histórico de item preservado. Não altera preço de venda, dados de produção nem facções reais.

**Verificação pontual executada no motor em memória:** inclusão de modelo gerou `ITM-003` após `ITM-001` e `ITM-002`; retirada de item vinculado a corte e redução abaixo de 40 peças reservadas foram recusadas; remoção de item sem vínculos e inclusão posterior gerou `ITM-004`, sem reaproveitar `ITM-002`; `inspect` permaneceu sem ocorrências. Acrescentado `tests/aditivo-pedidos-multimodelo-contract.cjs` ao CI. **Execução integral de CI e homologação em navegadores/servidor não foram confirmadas.**

**Paridade restante / cuidado:** edição de tamanho global do pedido, retirada parcial de cor vinculada, renomeação de modelo com histórico, preço negociado por cliente, importação de dados legados e comprovação de sync entre computadores continuam **PENDENTES**. A inclusão no laboratório não significa que o sistema original foi substituído nem autoriza merge na main.

## Preços por cliente e modelo — incremento de 20/11/2026
**Comparação com original:** foi confirmado no código comercial `release-cutter-planner.js` o vínculo pedido → modelo → variação, e no editor `release-cut-model-grade-adjust.js` a manutenção da grade por modelo. O rastreio **exaustivo** de preços por cliente, tabela comercial e prioridade de regras no `app9240.html` ainda está pendente. Não presumir que o protótipo substitui a política comercial atual.

**Pesquisa externa verificada:**
- Odoo 19, *Pricelists*: lista de preços pode ser atribuída a cliente e regras podem variar por produto e condição. https://www.odoo.com/documentation/19.0/applications/sales/sales/products_prices/prices/pricing.html
- ERPNext, *Item Price* e *Price Lists*: tabela de venda permite preço específico por cliente e vínculo à lista. https://docs.frappe.io/erpnext/item-price e https://docs.frappe.io/erpnext/price-lists
- ERPNext, *Pricing Rule*: condições por cliente, grupo e quantidade mínima. https://docs.frappe.io/erpnext/pricing-rule

**Implementação laboratorial:** comando `price.customer.set` guarda preço fictício em centavos por par cliente/modelo, motivo, revisão, comando e histórico verificável; a interface em Pedidos oferece cadastro da negociação. `pedidos-multimodelo-v1.js:resolvePrice` aplica a regra somente aos novos itens. Sem preço negociado, mantém o preço de catálogo. Um item já salvo nunca é reprecificado automaticamente: aditivos preservam o preço histórico e novos itens recebem a regra vigente.

**Ensaio do motor em memória:** após preço negociado de 3000 centavos, pedido prévio manteve 3000; após renegociação de 3900, o item novo no aditivo recebeu 3900. Total e integridade consistentes; adulteração da justificativa histórica foi sinalizada. Foram criados `tests/precos-cliente-pedidos-contract.cjs` e gatilho no CI. **Não há aceite de navegador, sincronização entre computadores, faturamento ou migração.**

**Lacunas P0 que permanecem:** mapear preços/contratos reais do HLGB comercial; regras de atacado, vendedor, desconto, exceção, preço por quantidade, validade, precedência, tributos, moeda, arredondamento, autorização por papel, margem, confirmação de cliente e conciliação entre pedido, nota e financeiro. Não integrar a regra fictícia à produção antes desses aceites.

## Pedidos ↔ Corte — quadro de impacto por célula (incremento de 20/11/2026)
**Código comercial conferido na `main`:**
- `release-cutter-planner.js:modelRows/orderSearchRows/matches` — pedido com vários modelos, programação e localização por modelo/cliente.
- `release-cutter-sheet-materials-v9523.js:gradeMatrix/renderSheet` — grade por cor/tamanho, impressão e consumo de materiais.
- `release-cut-model-grade-adjust.js:buildHorizontalEditor` — editor horizontal do Corte.

**Pesquisa comparativa:**
- Odoo 19, *Work order dependencies*: operações planejadas respeitam dependências e mostram quantidades, data e responsável. https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/advanced_configuration/work_order_dependencies.html
- ERPNext, *Production Plan* e *Work Order*: produção planejada a partir de demanda, com necessidades de materiais e ordens relacionadas. https://docs.frappe.io/erpnext/production-plan e https://docs.frappe.io/erpnext/work-order
- ERPNext 16, *Stock Reservation for Work Order*: separar reserva e movimentação material, útil como analogia de reserva da quantidade de corte; não é cópia integral da funcionalidade. https://docs.frappe.io/erpnext/stock-reservation-for-work-order

**Melhoria implantada SOMENTE no laboratório:** `pedidos-multimodelo-v1.js:cutImpact` calcula por `orderId + itemId + cor + tamanho` os totais pedidos, programados, concluídos, histórico cancelado, enviados, retornados, separados, expedidos, saldo comprometido e livre para redução; valida os invariantes `programado+concluído ≤ pedido`, `enviado ≤ cortado`, `retornado ≤ enviado`, `separado ≤ retornado`, `expedido ≤ separado`. A análise é **somente leitura**, e lança erro quando há incompatibilidade. `operacao-integrada-ui.js:multiOrderCutImpactPanel` mostra a conferência dentro de Pedidos, sem movimentar estoque ou financeiro. Cancelamentos permanecem rastreáveis e não reservam novamente as peças.

**Verificação pontual executada em memória:** cenário de 60 peças de tamanho P com 20 programadas, 30 cortadas, 10 em histórico cancelado, 25 enviadas, 15 retornadas, 10 separadas e 5 expedidas gerou 50 comprometidas e 10 livres; uma programação adulterada elevando o reservado além do pedido foi recusada; o documento não sofreu mutação durante a consulta. Criado teste `tests/impacto-pedidos-corte-contract.cjs`, incluído no workflow. Pacotes de 34 scripts sincronizados e 4 scripts inline com sintaxe válida.

**Lacunas que impedem aceite:** esta é uma prévia dos saldos **atuais**, não comparação dinâmica dos valores digitados no formulário antes do clique Salvar; ainda falta simulação visual de alteração antes/depois com confirmação, total de materiais/BOM, fila real por responsável e data, histórico remoto e teste Safari/Chrome. Os testes de CI e navegação real ainda exigem confirmação. A existência do painel não valida migração nem permite alterar `main`.
