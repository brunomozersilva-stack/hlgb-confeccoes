# HLGB Evolução — pente-fino de preservação funcional
**Data:** 18/11/2026 · **Estado:** BLOQUEADO PARA SUBSTITUIR O HLGB ATUAL
**Fonte legada:** `main@6542a62c27fa08f9c6b3f8223808fa5ccbe68a18`
**Fonte nova:** `feature/evolucao-laboratorio-isolado-v1-20261114@eb4c2e8cc91ad8c04776853fafc2386d66e36bb9`
**Método:** inspeção do código dos módulos, interfaces e testes existentes. Não é teste com dados de produção nem prova exaustiva de paridade. A base `app9240.html` (1,8 MB) ainda requer rastreamento exaustivo de telas e ações; o inventário antigo é apenas preliminar.

## Parecer principal
**NÃO APTO PARA MIGRAR OU SUBSTITUIR.** O laboratório contém regras úteis e testes automatizados, mas removeu/simplificou características centrais dos fluxos atuais. A ausência de uma função na prévia não autoriza sua exclusão. Nenhum merge para `main`, migração de dados, importação ou publicação do backend de demonstração sem plano e autorização expressa.

## Gaps comprovados por inspeção do código
| ID | Prioridade | Fluxo | HLGB atual (evidência) | Nova versão (evidência) | Conclusão |
|---|---|---|---|---|---|
| LEG-001 | P0 | Pedido com várias peças/modelos | `release-cutter-planner.js:modelRows/modelIds`; `tests/audit-cutter-planner-regression.cjs`: pedido com Camisola Romantic + Calcinha Liz | `evolucao-lab/operacao-integrada-core.js:createOrder` cria **um** `productId` por pedido | **Lacuna confirmada** |
| LEG-002 | P0 | Grade por cor × tamanho no cadastro de Pedidos | `release-cutter-sheet-materials-v9523.js:gradeMatrix`; grade legada formada por `{productId,color,size,qty}` e tamanhos do catálogo | `operacao-integrada-ui.js:case 'pedidos'` pede somente P/M/G/GG; `order.color.grade.set` está na aba **Facções** | **Função escondida/deslocada; fluxo inferior ao atual** |
| LEG-003 | P0 | Tamanhos variáveis e múltiplas cores/modelos | `gradeMatrix` considera PP, P, M, G, GG, XG, G1–G4 e outros efetivamente cadastrados | `operacao-integrada-core.js` fixa `sizes=['P','M','G','GG']` | **Lacuna confirmada** |
| LEG-004 | P0 | Edição da grade real por modelo/cor/tamanho | `release-cut-model-grade-adjust.js:buildHorizontalEditor` gera matriz horizontal editável, conserva o pedido original e ajusta só o modelo escolhido; `tests/audit-cut-grade-matrix-v9421.cjs` | `case 'corte'` oferece só quantidades agregadas por tamanho e folhas por `orderId` de modelo único | **Lacuna confirmada** |
| LEG-005 | P0 | Cortes por modelo dentro do pedido | `release-cut-model-split.js` e `release-cutter-planner.js` dividem e programam os modelos separadamente | `cut.plan` aceita pedido de um `productId`; há split de **folha**, mas não reproduz divisão de **modelos** | **Lacuna confirmada** |
| LEG-006 | P0 | Folha impressa completa do cortador | `release-cutter-sheet-materials-v9523.js:renderSheet`: 5 seções: grade por cor/tamanho, matérias-primas, pesagem, aproveitamento/peças extras, resumo; assinaturas dos dois cortadores **e do infestador** | `operacao-integrada-ui.js:renderCutSheet`: tabela vertical tamanho/quantidade, um material, dois registros digitados; não replica as 5 seções | **Lacuna confirmada** |
| LEG-007 | P1 | Programação por modelo com responsável e data | `release-cutter-planner.js:modelRows/selectModel`: pesquisa pedido/cliente/produto, programação de data e cortador somente do modelo | Nova folha tem dois nomes digitados, porém não reproduce agenda independente, busca por pedido e histórico por modelo | **Lacuna confirmada** |
| LEG-008 | P0 | Peso histórico **após finalizar o corte** | `release-cut-weight-v9579.js`: medições posteriores append-only por `cutId`, sem reabrir etapa/grade, com prova remota e WAL | `cut.plan.complete` registra peso ao concluir; não demonstrou o histórico posterior append-only nem o vínculo com cortes legados | **Lacuna confirmada** |
| LEG-009 | P1 | Ficha medida por corte e economia | `release-cut-material-usage.js`: rendimento peças/kg, custo/kg, média real por produto, peças extras e histórico | Há BOM multimatéria em protótipo separado `modulos/corte-bom-v1.js`, mas o fluxo padrão do Corte segue um material principal e gramas; não é paridade completa | **Parcial, não homologado** |
| LEG-010 | P0 | Menu Utilidades | `release-operations-pack.js:ensureNav/renderUtilities`: Visão Geral, Rotas, Etiquetas A4, Etiquetas de Embalagem, Regularização histórica | `operacao-integrada-ui.js` lista 19 abas **sem Utilidades** | **Menu ausente** |
| LEG-011 | P0 | Rotas de LEVAR/BUSCAR | `release-operations-pack.js:openRouteEditor/routeRemoteProof9534/printHtml`: paradas, LEVAR/BUSCAR, salvamento e conferência remota, impressão | Nenhum comando `route.*` no `operacao-integrada-core.js`; nova interface não tem tela equivalente | **Lacuna confirmada** |
| LEG-012 | P1 | Etiquetas A4 com várias peças/modelos e volumes | `release-operations-pack.js:renderLabels`: 10/18/21 por folha, volumes 1 de N, vários modelos na impressão | Não há módulo equivalente de Utilidades/etiquetas integrado na nova Operação | **Lacuna confirmada** |
| LEG-013 | P1 | Modelos de etiquetas de embalagem | `release-operations-pack.js:renderLabelTemplates`: PDF, cliente, produto, SKU, CNPJ, URL e prévia | `packaging.assign` da nova versão não reproduz editor de modelos e impressão | **Lacuna confirmada** |
| LEG-014 | P1 | Atribuição individual à embaladeira | `release-operations-pack.js:renderPackaging/editPackaging9249`: nome da embaladeira, cliente, modelo, tamanho, quantidade, pronta, etiquetas, status | Nova `modulos/operacoes-v2.js:packagingAssign` modela envio à facção/lote e acerto, não é substituto comprovado da atribuição à funcionária | **Lacuna confirmada** |
| LEG-015 | P0 | Regularização histórica | `release-operations-pack.js:renderHistorical`, prévia e conferência de dados antigos | Nova Operação não oferece fluxo equivalente na UI | **Lacuna confirmada** |
| LEG-016 | P1 | Corte BOM por cor e matéria | Novo código `modulos/corte-bom-v1.js` considera cor × tamanho e múltiplos materiais | Existe apenas em fluxo separado; falta unificar com pedido multi-modelo e folha imprimível sem perder os dois caminhos | **Parcial, não homologado** |
| LEG-017 | P0 | Facções e acertos sem perda de registros | Atual: módulos de pagamentos, transferências e rateio por serviço, com histórico/WAL | Laboratório possui comandos de transferências e acertos, porém ainda sem compatibilidade comprovada de IDs, preços, todos os formulários e dados reais | **Paridade não verificada** |
| LEG-018 | P0 | Hub, folha, estoque, compras, clientes, relatórios | Vários módulos específicos no legado, inclusive passagem individual e correções do Hub | Na versão nova existem protótipos, mas não foi concluído mapeamento botão a botão, campos e históricos | **Paridade não verificada** |
| LEG-019 | P0 | Auditor, Bot, sincronização, recuperação de dados | Código legado com WAL IndexedDB, auditor e correções específicas | Laboratório usa testes e banco descartável, não migração/retorno real, nem prova de que preserva todas as funções | **Paridade não verificada** |

## Inventário e testes: o que realmente demonstram?
- `paridade-funcional.json`: 76 funções **preliminares**. Não é inventário total do programa; cada item marcado `nao_verificada`.
- `paridade-revisao-v2.json`: 76 equivalências **parciais por inspeção**, **zero aprovadas**, 43 cenários, 266 itens do plano mestre. `gaps:0` ali significa ausência de gaps formalizados naquela revisão, **não** ausência real de funcionalidades faltantes. Este documento atualiza o status e registra lacunas confirmadas.
- Os testes de navegador e PostgreSQL provam **cenários do laboratório fictício**, não equivalência de todos os formulários do sistema antigo nem segurança de migração.
- O núcleo novo trabalha hoje com pedido de um modelo e quatro tamanhos. Assim, qualquer teste feito nesse núcleo é insuficiente para homologar pedidos multimo­delo, cores, tamanhos extras e cortes por modelo.

## Requisitos antes de afirmar que o programa novo é melhor

### P0 — Pedidos e grade, antes de qualquer migração
1. Modelo de pedido com itens de modelos distintos; cada item traz variações de **cor × tamanho**, em grade horizontal editável e tamanhos dinâmicos, iguais ao cadastro e aos tamanhos permitidos no legado. Não perder a referência de pedido, item, cor, tamanho, preço por cliente e histórico.
2. Dentro de **Pedidos**, edição em uma única tela: adicionar/remover modelo, adicionar/remover cor, preencher a matriz, totais por cor, tamanho, modelo e pedido, validação antes de gravar. Não enviar a pessoa para a aba Facções para montar o pedido.
3. Mapear antigos registros `orders.grade[{productId,color,size,qty}]` e relações com cortes, pedidos, acertos e pagamentos para o novo esquema **sem reescrever/descartar registro antigo**. Testar exemplos com 2 modelos e 3 cores, tamanhos variados e revisões concorrentes.

### P0 — Corte/cortadores
4. Programação por **pedido → modelo → cor/tamanho** com data, prioridade e cortador selecionável; permitir programar cada modelo em dias diferentes.
5. Folha A4 impressa equivalente ou superior à v95.23: grade horizontal, matérias-primas por tipo (tule, renda, malha etc.), previsto/real/lixo/diferença, peças extras, total e 3 espaços de assinatura. Não confundir assinatura digitada no formulário de teste com assinatura física.
6. Editar grade do corte sem alterar o pedido original, com controle de saldos/versões. Preservar histórico por modelo/cor/tamanho, múltiplas folhas, alteração e cancelamento.
7. Peso de corte **após finalização** com histórico append-only e comprovação de gravação sem reabrir o corte. BOM multimatéria com unidades e perdas por material; reconciliação de estoque sem baixa duplicada.

### P0/P1 — Utilidades e fluxo completo
8. Devolver menu **Utilidades** com Visão geral, Rotas, Etiquetas A4, Etiquetas de embalagem, Regularização histórica; e tela operacional de Embalagem por pessoa.
9. Rotas: LEVAR/BUSCAR, paradas, busca por produto/pedido, salvar + releitura no servidor + impressão, sem dependência de preço de Notas. Etiquetas: quantidades, volume X de Y, 10/18/21 por folha, múltiplos modelos, modelos PDF por cliente.
10. Relatórios e Auditor devem atravessar as referências **pedido → item → corte → facção → retorno → embalagem → separação → expedição → acerto → financeiro**, com evidências de dados confirmados, não apenas contagens de telas.

## Regra de liberação
Não autorizar migração até que **cada função identificada**, inclusive fora das 76 preliminares, tenha: fonte legada, comportamento esperado, equivalente novo, teste de navegador e mobile, teste de persistência concorrente quando couber, migração/rollback e aceite humano. `approvedForProduction` permanece **false** até lá.

## Escopo do que falta inspecionar
Este relatório fecha a inspeção estática inicial dos pontos mais urgentes e identifica 14 lacunas confirmadas, 2 funcionalidades parciais e 3 frentes ainda não verificadas; **não equivale a inspeção exaustiva de 1.288 entradas do repositório legado**, todas as ações de `app9240.html`, todas as 19 áreas, nem demonstração em produção. O inventário por tela/campo/botão deve continuar e pode revelar novas lacunas. Por segurança, não remover funções, não importar dados reais, não publicar esta branch e não tratar nenhuma das funções incompletas como homologadas.
