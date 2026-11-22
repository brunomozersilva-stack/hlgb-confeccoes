# HLGB Evolução — Pedidos multimodelo, paridade e integração segura
Data: 22/11/2026 · Escopo: branch de laboratório fictício, sem alterar main ou dados comerciais.

## Decisão funcional
Manter a praticidade do pedido comercial e a rastreabilidade mais profunda do laboratório. A nova tela de Pedidos mostra quantidades de cada modelo separadas por cor e tamanho, com os valores de cada etapa e uma fila passiva de tarefas por setor. Não transformar simulação em produção ou faturamento real por simples mudança de tela.

## Fontes confrontadas no HLGB comercial (main)
- `release-cutter-planner.js` (2026.11.18): gera `modelRows()`, trabalha separação por `productId` e calcula quantidades por modelo. Usa número exibido do pedido e identifica prioridade/cortadores.
- `release-cut-model-grade-adjust.js` (v94.23): editor horizontal agrupa por produto, cores e tamanhos reais, sem reduzir tudo a PP–GG.
- `release-cutter-sheet-materials-v9523.js` (v95.23): folha de materiais e impressão lê a grade do corte e a ficha técnica; é consulta, sem baixa automática.
- `tests/audit-cutter-planner-regression.cjs`: cenário legado com duas linhas de modelo (100 camisolas e 50 calcinhas) no mesmo pedido.
- Comparação: o comercial usa `orders[].grade[]` com `productId/color/size/qty`. A Evolução fictícia usa `multiOrders[].items[]` com `itemId`, `productId`, `colors[].grade` e `totals`. **Não declarar esses esquemas equivalentes sem adaptador e teste de migração.**

## Implementado nesta etapa em homologação
1. Detalhe de pedido multimodelo agora reutiliza o validador `HLGBLabMultiOrdersV1.cutImpact`. Mostra, por modelo/variante: pedidas, reservadas em Corte, cortadas concluídas, enviadas à facção, retornadas, separadas e expedidas. Grade exibida no detalhe limitada às primeiras 80 linhas com quantidade ou movimentação; todas as variantes continuam no documento e nos módulos específicos.
2. Tabela rápida de Pedidos usa os mesmos saldos do motor para pedidos multimodelo, deixa explícito `Vários modelos · ensaio isolado` e distingue **enviadas à facção** de **expedidas**; antes a coluna `Enviadas` recebia a quantidade expedida. Saldos inválidos exibem `Conferir` e a consulta detalhada apresenta o erro, sem substituir valores por zero falso.
3. Fila de trabalho do pedido, por **modelo e setor**: planejar saldo livre, concluir folha aberta, enviar corte livre à facção, aguardar retorno, separar retornos e expedir separadas. Uma peça pode gerar pendências em setores diferentes; não inferir um status único nem executar automaticamente.
4. Histórico dos documentos vinculados: `PCM` (programação), `MFL` (lote enviado), `MFR` (retorno/acerto fictício), separações e expedições. Valor do retorno é indicativo de custo de mão de obra, **não é título a pagar nem acerto quitado**.
5. Cache da lista prática por referência do documento e revisão. Mudar filtros/página não recalcula as grades já validadas; novo documento/revisão invalida o cache.
6. Regressão de importação em lote: o teste abre as ferramentas antigas recolhidas antes de preencher, sem retirar nenhuma operação antiga nem mudar regras de salvamento.

## Segurança e invariantes
- **Nenhuma escrita na consulta de histórico, filas ou saldos.** Não criar pagamento ao detalhar ou filtrar.
- Corte planejado não é corte realizado. Peças só estão disponíveis para envio quando o corte foi concluído.
- Não lançar acerto ou título comercial a partir de `multi.flow.return`; o retorno continua fictício até integração e autorização explícitas.
- Nunca somar compensações ao mesmo acerto original como se fossem uma segunda baixa.
- Quando um vínculo é impossível de conferir, exibir erro e não "reconstruir" registros silenciosamente.
- Verificação manual e automática da paridade integral com o programa no ar permanece **pendente**.

## Testes adicionados/ampliados
- `rastreio-multimodelo-contract.cjs`: quatro cenários sem rede, incluindo saldos por variante, reserva sem baixa, erro com dados adulterados e ausência de comandos no painel.
- `operacao-integrada-mobile.cjs`: cenário 130 peças (120 no primeiro item, 10 no segundo); depois do fluxo fictício: 80 cortadas, 80 enviadas, 50 retornadas, 50 separadas, 20 expedidas; conferir detalhamento `ITM/PCM/MFL/MFR`, setor pendente e nenhuma criação financeira.
- `lote-amplo-mobile.cjs`: importação antiga recolhida mas preservada e testada depois de abrir o painel.
- A esteira `evolucao-operacao-integrada.yml` executa tanto os contratos de rastreabilidade do pedido simples quanto os multimodelo, e mantém os testes anteriores.

## Referências de mercado para a próxima etapa
- Odoo 19.0, documentação oficial: https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/subcontracting/subcontracting_resupply.html — local físico do subcontratado e movimentos separados de estoque de componentes.
- ERPNext, documentação oficial: https://docs.frappe.io/erpnext/subcontracting — serviço, material enviado, material consumido, recebimento parcial e reserva de insumo.
- Aplicação na HLGB: separar responsabilidade por **tecido/material em poder da facção**, **peça cortada enviada**, **peça devolvida**, **serviço devido** e **pagamento**. Não criar saldo de estoque em terceiro a partir de envio antigo sem conferência de origem, BOM, unidade de medida e custo.

## Portão de integração comercial — ainda bloqueado
Antes de converter pedidos multimodelo em pedidos operacionais reais:
1. Adaptador `orders.grade[] -> multiOrders.items[].colors.grade` com ID estável por pedido e modelo, normalização de cor e tamanho, grade PP–G4/customizada e referência legada; preservar encomendas antigas e quantidade executada.
2. Simular antes/depois **por célula** e identificar conflitos com cortes, envios, devoluções, saldos, preços por cliente e títulos já existentes, com justificativa e comando idempotente.
3. Gravar somente com uma transação e prova por releitura de outro cliente/servidor, em **banco de homologação isolado**, com rollback documentado e cópia autorizada, nunca no banco comercial antes de aprovação.
4. Executar testes Chrome e Safari, mobile, concorrência entre abas, reabertura, impressão A4, PDFs, filtros, serviços avulsos, compensações, acertos por facção/cliente e 76 funções do comercial.
5. Aceite por tarefa real dos funcionários e conferência de fechamento; sem isso não fazer merge em main nem publicar a substituição.

**Próximo incremento sugerido**: criar um adaptador de prévia de reconciliação, somente leitura, entre as grades legadas e as novas, protegendo identidade e vínculos; não converter nem dar baixa automaticamente.
