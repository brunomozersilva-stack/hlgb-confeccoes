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

## Incremento adicional implementado — prévia da paridade da grade

Criado `migracao/comparador-grade-legada.cjs`, função pura `compare(legacy,prepared)`, protegida por 7 contratos automatizados em `tests/comparador-grade-legada-contract.cjs` e incluída no CI da operação integrada.

- Leitura de `orders[].grade[]` legada e `multiOrders[].items[].colors[].grade` preparada, com diagnóstico por `productId` / cor / tamanho e delta da quantidade.
- Detecta tamanho inválido, linha duplicada (inclusive quantidade zero), produto duplicado em dois itens, grade incompleta, discrepância de quantidade por modelo, preço histórico, subtotais e total geral.
- Verifica identidade do cliente quando existe nos dois lados. Ausência ou divergência exigem revisão.
- Exemplo de paridade: 100 Camisola + 50 Calcinha = 150 peças, 4 células distintas. Trocar uma cor por outra cria divergência, sem equivalência automática por nome parecido.
- A resposta **nunca** autoriza importação: `readyForCommercialMigration=false`, `canWrite=false`, `canCreateFinancialTitle=false`, `canCreateStockMovement=false`.
- Este comparador ainda não está ligado ao banco original nem recebe documentos comerciais reais. Não efetua migração silenciosa, não altera `main` nem gera acertos.

**Próximo incremento**: a partir do comparador, desenvolver a prévia visual da migração com inspeção de cortes, envios, pagamentos e regras de preço, somente com **cópia autorizada de dados fictícios/anonimizados** e sem comandos de escrita. Depois validar contra o banco de homologação, com rollback e revisão independente.


## Incremento 22/11 — proteção de referências importadas e pré-migração de vínculos

### Correção da lista prática de Pedidos
- O teste integrado em Chromium e WebKit havia alcançado e aprovado 20 áreas, fluxo multimodelo e duas abas, mas falhou na consulta do lote importado: os documentos BATCH1/BATCH2 foram criados e estavam em \`orderImports\`, porém o painel rápido omitia sua referência.
- Corrigido \`operacao-integrada-ui.js\` para relacionar, por \`orderId\`, referência de importação, ID de lote e comando; mostrar origem na lista e no detalhe e permitir buscar por referência sem precisar abrir ferramentas avançadas.
- O teste \`lote-amplo-mobile.cjs\` agora exige a presença de BATCH1/BATCH2, filtra BATCH2, abre detalhe, confere origem, verifica revisão inalterada e continua testando folha, cotações e imagens.

### Novo pré-voo de vínculos — exclusivamente consulta
- \`migracao/preflight-vinculos-operacionais.cjs\` exige um extrato de **dependências normalizadas** de teste. Não sabe ler o banco comercial, não faz importação, não deduz o conteúdo de documentos ausentes e nunca autoriza migração, baixa nem pagamento automático.
- Reutiliza \`comparador-grade-legada.cjs\` e exige IDs de origem. Confere por modelo: total do pedido, reservas e conclusão de folhas, peças enviadas/retornadas, peças em acerto e títulos relacionados.
- Verifica cadeia física \`cutId -> envio -> sourceAllocationId -> retorno -> returnId -> acerto -> título\`. Se uma associação não está identificada, não inventa outra nem reconstrói histórico.
- Detecta transferências de facção sem prova, retorno parcial maior que envio, acertos que ultrapassam retornos, modelo de origem incorreto, títulos em duplicidade e já pagos.
- Distingue **recebíveis de clientes** de **contas a pagar de facção**; títulos a receber são conferidos separadamente, e parcelamentos exigem revisão. Nunca somar valor de venda a custo de costura.
- Dados fornecidos como arrays são apenas *presença declarada*, não confirmação de completude. Resposta fixa \`sourceCoverage='extrato_fornecido_sem_prova_de_completude'\`, \`readyForCommercialMigration=false\`, \`canExecute=false\`, \`canPay=false\` e \`canChangeStock=false\`.

### Validação e próximas decisões
- \`tests/preflight-vinculos-operacionais-contract.cjs\`: 11 testes cobrindo documento fictício 150 peças/2 modelos, ausência de extrato, títulos duplicados, pagamentos, parcelamento, cadeia incompleta, transferência entre facções, divergências de modelos e de quantidades.
- Os 11 testes novos foram executados localmente em ambiente JavaScript isolado com resultados aprovados; a execução oficial no Node/GitHub segue como fonte de confirmação da esteira.
- Os testes foram ligados a \`.github/workflows/evolucao-operacao-integrada.yml\` e aos gates anteriores de Pedidos e paridade.
- **Pendente:** criar adaptador de extração somente de homologação com identidade de cada documento e transferências, validar as 76 funções comerciais, provar integridade do mesmo banco em outros computadores e obter aceite da equipe. Nenhuma dessas etapas foi declarada concluída.

### Regra de implementação
Não criar um segundo fluxo comercial de Pedidos nem trocar o modelo de dados em \`main\`. O objetivo é aproveitar a entrada de pedidos que a equipe já usa, dando rastreabilidade por modelo/cor/tamanho e proteção do histórico. Até aprovação da reconciliação, as simulações multimodelo não movimentam estoque, acerto ou financeiro comercial.

