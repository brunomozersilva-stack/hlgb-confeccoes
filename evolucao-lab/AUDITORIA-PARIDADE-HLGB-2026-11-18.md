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

## Visão módulo por módulo — 19 áreas do novo + Utilidades do legado
Esta classificação **não é nota de qualidade** e não diz que os módulos funcionam em produção. *Parcial* significa apenas que há alguma implementação fictícia; **nenhum módulo foi homologado como substituto**.

| Área | Situação encontrada | Próxima verificação obrigatória |
|---|---|---|
| Núcleo/sincronização | Prototipada com WAL/revisões de laboratório | Migrar modelo legado sem perder IndexedDB pendente, testar conflito e restauração com snapshot anonimizado |
| Autenticação | Somente perfis/PINs fictícios, dados isolados | MFA, papéis reais, revogação e RLS por módulo/empresa |
| Pedidos | **Lacunas P0**: um modelo/pedido e quatro tamanhos; cor/tamanho deslocada a Facções | Recriar pedido multi-modelo e matriz cor/tamanho no próprio cadastro; totals, edição, histórico |
| Produtos/ficha técnica | SKU, material principal e receita BOM são protótipos | Mapear fichas existentes, unidades, categoria, fórmulas, materiais múltiplos e custos |
| Corte/cortadores | **Lacunas P0**: folha vertical reduzida, programação por pedido de um modelo | Recuperar impressão A4 completa, grade horizontal, programação independente por modelo, peso histórico |
| Produção | Comandos de baixa e retorno fictícios | Conferir campos de cada tela antiga, baixa parcial, status por modelo/cor/tamanho e auditoria de salvamento |
| Separação/expedição | Operações agregadas por pedido | Garantir baixa por modelo/variação e volumes, conferência, rastreio e divergências |
| Facções | Distribuição múltipla, retornos e transferências simuladas | Conferir preços, alterações após alocação, devolução, rota, acerto pago e histórico por facção |
| Acertos | Módulos de compensação e pagamento fictícios | Reproduzir individualização, acerto avulso, agrupamento por pessoa, travetada, pago/observação e reconciliação |
| Hub Financeiro | Títulos, filtros e algumas confirmações fictícias | Comprovar salvar, editar, buscar, pagamentos, anexos, fechamento por período e conciliação do legado |
| Folha/Provisões | Passagem por pessoa presente em protótipo | Reproduzir edição, ordem, somatórios e integração financeira sem usar encargos fictícios como folha real |
| Compras/Fornecedores | Cotações, requisição, devolução e dupla conferência simuladas | Verificar nota de entrada, materiais, saldos, prazos, baixas e devoluções completas |
| Estoque | Controle inicial em gramas | Compatibilizar unidades, variantes/cor, rolos/lotes, movimentação e inventário histórico |
| Relatórios | Relatórios gerenciais parciais | Listar **todos** os filtros, períodos, dimensões, exportações e reconciliação de números |
| Auditor | Auditor v3 de exercício | Comparar autoridade WAL, diagnóstico residual, auto reparo auditável e alerta útil sem perda |
| Bot/Assistente | Bot v3/assistente em demonstração | Comparar funções atuais e limites de execução, contexto real, aprendizado e explicação de decisões |
| Central/Monitor | Métricas e alertas demonstrativos | Verificar monitor horário, alertas por severidade, histórico e evidência de sincronização |
| Impressora 3D | Cadastro fictício | Conferir estoque real, upload/fotos, custos e edição preservada; delimitar acesso ao ERP |
| Cadastros | Clientes, materiais, facções e produtos básicos | Compatibilizar IDs, campos, filtros, preços por cliente e responsabilidades |
| **Utilidades (legado)** | **AUSENTE da Operação Integrada** | Rotas, Etiquetas A4, templates de embalagem, regularização e integração de embaladeiras |

**Observação:** não basta que cada linha tenha um botão. Cada comportamento existente deve ter cenário antes/depois, prova funcional, valor esperado, histórico preservado e autorização humana.

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

## Evolução depois da auditoria — pedido por cor/tamanho
**Implementação inicial na branch isolada:** novo formulário `order.add.with.colors` dentro de Pedidos, com matriz horizontal editável (cores × P/M/G/GG), linhas de cores adicionáveis/removíveis, conferência de totais e criação atômica de pedido e título financeiro. O modo anterior `order.add` continua acessível e a edição de `order.color.grade.set` foi incorporada à tela Pedidos, sem apagar a rotina já disponível em Facções. A regra de cores foi reutilizada da facção existente, sem criar outra versão independente.
**Atenção:** isso reduz a lacuna visual do cadastro de cor/tamanho **somente em pedidos de um modelo e quatro tamanhos fixos**. **LEG-001, LEG-002 e LEG-003 continuam NÃO aprovados** até incluir pedidos com modelos múltiplos, tamanhos variáveis, edição e migração do legado. Nenhuma equivalência integral foi declarada.


## Segunda verificação obrigatória: não confundir presença com paridade
Antes da liberação, **cada uma das 19 áreas mais Utilidades** será revista novamente contra a última versão da `main`, incluindo funções incluídas após o primeiro inventário. A revisão deve comparar:
1. **Entradas:** todos os campos, opções e tamanhos, cores/modelos, regras de obrigatoriedade, valores padrão, cadastros auxiliares e atalhos
2. **Saídas:** impressão A4, PDF, etiquetas, relatórios, pesquisa/filtros, cálculos, telas mobile e fluxos de clique
3. **Regras:** corte e facções parciais, devolução, baixa/edição de acerto, restrições financeiras corretas, idempotência, tempos de confirmação e histórico
4. **Integridade:** IDs legados, referências cruzadas, backup, WAL, duas sessões, reconciliação por registro, versionamento e rollback executado com dados fictícios/anônimos
5. **Aprovação:** caso a caso por quem usa diariamente; sem homologação, nenhuma substituição silenciosa.

### Desenvolvimento verificável nesta revisão (sem declarar paridade aprovada)
- **Dentro de Pedidos:** novo formulário `order.add.with.colors`, matriz cor × P/M/G/GG e totalização automática; criação de pedido, grade por cor e único título numa transação; bloqueio de cores duplicadas, linhas inválidas e excesso. Modo `order.add` antigo e edição `order.color.grade.set` permanecem
- **Compatibilidade histórica (somente leitura):** `modulos/order-grade-legacy-v2.js` preserva todas as linhas originais `{productId,color,size,qty}`, inclusive várias peças num pedido, tamanhos PP/XG/G1 etc, linhas repetidas e metadados não reconhecidos. `restore` reproduz o documento idêntico; divergências invalidam a prévia. Nenhum dado comercial foi lido ou convertido.
- **Limite explícito:** a tela de criação operacional segue sendo de um modelo por pedido e quatro tamanhos; este adaptador **não** torna o sistema multi-modelo e não salva importações reais. `LEG-001`, `LEG-002`, `LEG-003` seguem P0 abertas até implementação, teste de migração e aceite.

### Próximo pacote obrigatório
1. **Modelo de pedido multi-item** reutilizando o adaptador somente leitura, identificadores de item estáveis, cores/tamanhos dinâmicos e totais por modelo com revisão de histórico; sem modificar os IDs legados
2. **Folha do cortador por modelo e cor**, cinco seções e três assinaturas, programar dia/cortador independente, correção segura de grade, pesagem posterior sem reabrir ou sobrescrever
3. **Utilidades completas**, com Rotas LEVAR/BUSCAR, Etiquetas A4, etiquetas de embalagem, regularização e gerenciamento de embaladeiras; validar que roteamento nunca depende de preço comercial
4. **Paridade transversal** em Acertos, Hub, Folha, sincronização/backup, relatórios, auditoria e segurança real

### Pedido multimodelo fictício — construção sem risco de misturar saldos
`order.multi.create` usa `multiOrders` com múltiplos itens e cores, tamanhos configuráveis e totalização no mesmo commit. A coleção não é convertida para `orders` (modelo único) e não gera título financeiro, movimentação de estoque ou envios. Portanto, é preparação de paridade **não aprovada**; mantém LEG-001/002/003 abertas até integrar corte, facções, separação, notas e histórico por item.


## Terceira evolução isolada — programação de Corte multimodelo (18/11/2026)

**Implementado na branch de laboratório; não aprovado para o HLGB comercial.**

- Comandos fictícios `multi.cut.plan`, `multi.cut.revise`, `multi.cut.complete` e `multi.cut.cancel`.
- Identificação explícita por **pedido multimodelo + item (modelo) + cor + tamanho**, com saldo de cada célula protegido de reservas duplicadas e quantidades superiores à encomenda.
- Programação em datas diferentes para modelos do mesmo pedido, prioridade, dois cortadores e infestador; edição com motivo e histórico preservado; cancelamento sem apagar eventos; conclusão de ensaio com dois conferentes.
- Persistência transacional no documento fictício, com revisões e confirmação por releitura da própria Operação Integrada; exportação CSV inclui cada linha de corte.
- Testes específicos adicionados: `tests/corte-multimodelo-contract.cjs`; fluxo incorporado à tela de **Corte** sem substituir o cadastro/corte de um único modelo.

**Limites e bloqueio:** uma conclusão fictícia não debita materiais, não gera ficha BOM, não libera facção, não cria acerto ou título financeiro; os `multiCutPlans` não são `cutPlans` legados e não são migrados automaticamente. O impresso A4 completo, pesos posteriores append-only, assinaturas físicas, operações de produção/embalagem e migração reversível continuam pendentes. Os IDs LEG-001/003/004/005/006/007/008/017/019 **permanecem sem aceite de paridade**. Testes automáticos não substituem a conferência visual da equipe.

**Regra inviolável:** NÃO fazer merge em `main`, NÃO importar dados reais e NÃO declarar paridade global até o inventário e as provas da segunda revisão. O marco de aprovação para produção permanece `false`.


## Quarta evolução isolada — folha A4 de Corte multimodelo e pesagem posterior (18/11/2026)

**Estado:** implementação no laboratório; validação de navegadores/CI e aceite operacional ainda pendentes. `approvedForProduction = false`.

1. Novo módulo `modulos/folha-corte-multimodelo-v1.js` gera somente HTML para impressão A4 da folha `PCM`, incluindo **pedido, modelo, SKU, cliente, data, equipe** e **cinco seções**: (1) grade horizontal por cor/tamanho com totais, (2) matérias-primas com previsão ilustrativa da ficha, (3) pesagem e aproveitamento, (4) peças extras para preenchimento manual, (5) conferências, observações e **três campos de assinatura física**.
2. O renderizador localiza pedido e modelo pelo `orderId + itemId + productId`, não junta modelos do mesmo pedido. Quantidades da folha são comparadas com as linhas do plano. Tamanhos como PP, G2 e XG são exibidos sem limitar o modelo às quatro colunas do legado do laboratório.
3. O cálculo de materiais é **somente previsão** com ficha básica e regras ativas por cor/tamanho. Não faz baixa no estoque; consumos que não possuem regra específica não devem ser apresentados como medição real. O registro de peso agregado, quando existir, é identificado como valor histórico e **não equivale à pesagem por material conferida**.
4. Comando `multi.cut.weight.record`: somente após concluir uma programação; total/útil/lixo em gramas inteiros, conferente e justificativa obrigatórios; impede total zero, excesso de lixo/útil, duplicação idêntica. Preserva eventos anteriores e o status/grade do corte; o Auditor exige vínculo entre cada evento e seu comando global com revisão crescente.
5. Na tela de Corte: botão **Folha A4 deste modelo**, formulário de pesagem posterior e exportação dos eventos para CSV. Scripts do navegador e testes de contratos receberam os novos módulos; Chrome e Safari são alvos do CI, ainda não considerados aprovados sem resultado verde.

**Lacunas pendentes (não declarar paridade):**
- A4 é **ensaio visual**, sem prova de que imprime uma única página para grades extremas; etiquetas/QR, paginação e assinaturas físicas devem ser validadas presencialmente.
- Pesagem atual é agregada; a baixa real por tipo de material, atribuição de estoque por lote, conferência de sobras, registro formal de peças extras e posterior regularização **não estão integrados**.
- Corte multimodelo ainda não alimenta Facções, Produção, Separação, Acertos ou Financeiro. Utilidades/Rotas/Etiquetas/Embalagem e migração reversível permanecem pendentes.
- Nada publicado em `main`, nenhum registro do HLGB comercial migrado, nenhum teste de produção realizado.

**Próxima frente:** comparar a folha A4 e todos os cálculos com amostras anonimizadas da folha v95.23; depois recuperar **Utilidades** e preparar integrações por item, com a mesma proteção contra dupla baixa e perda de histórico.


## Quinta evolução isolada — Utilidades: Rotas e Etiquetas A4 (18/11/2026)

**Estado:** `IMPLEMENTADO NO LABORATÓRIO / ACEITE PENDENTE`; nenhuma migração, nenhum merge, nenhuma prova de funcionamento em produção.

### LEG-010 / LEG-011 — Utilidades / Rotas LEVAR/BUSCAR

- Navegação inclui agora **Utilidades como 20ª área**, sem retirar as 19 áreas anteriores.
- Novo motor `modulos/rotas-utilidades-v1.js`, com `route.plan`, `route.revise` e `route.cancel` sob o comando transacional/revisão do laboratório, datas, responsáveis, vários locais explícitos (facções cadastradas ou local fictício da confecção), listas separadas de LEVAR e BUSCAR, ordem e histórico sem apagar paradas.
- Selecionar a primeira facção automaticamente é proibido. Adição/remoção visual de paradas e impressão de um resumo A4 com checklist por parada no mesmo lote.
- Auditor verifica referência dos comandos, ordem das revisões e **encadeamento de fingerprints** de estados de rota, detectando mutação silenciosa posterior.
- Testes: `rotas-utilidades-contract.cjs` e fluxo Playwright no passeio de `operacao-integrada-mobile.cjs`.
- **Não concluído:** automação de itens por pedido/produção, cadastro de locais reais da confecção, gravação na nuvem e comprovação Safari → Chrome em computadores distintos, resolução de conflito, comparação visual da folha contra o legado. O laboratório não simula confirmação remota.

### LEG-012 — Etiquetas A4 10/18/21 + volumes e vários modelos

- Novo gerador puro `modulos/etiquetas-a4-v1.js`. Editor em Utilidades aceita vários modelos do lote, nome/local, modelo, tamanho, peças, quantidade de cópias e **volumes**, com data.
- Três layouts A4: **10 (2×5), 18 (3×6) e 21 (3×7)**; volume 5 produz cinco etiquetas de **1 de 5** a **5 de 5**. Sem volume, usa a quantidade de cópias informada. Todos os modelos são agrupados em uma única sequência de páginas, preservando espaços vazios da última folha para alinhamento.
- Testes específicos: `etiquetas-a4-contract.cjs` e prova Playwright no passeio geral de dois tamanhos de viewport, Chrome e WebKit.
- **Não concluído:** impressão física e alinhamento em impressoras reais, vinculação a etiquetas personalizadas por cliente, PDFs enviados, geração baseada em movimentação real, aprovação da equipe e rastreio empresarial.

### Porta de aprovação por tarefa

A regra formal foi gravada em `CONTRATOS-ACEITE-OPERACIONAL-2026-11-18.md`: cada tarefa deve ser **PRESERVADA, MELHORADA ou PENDENTE**, com prova do comportamento antigo, saldo/valor por registro, fonte, releitura remota, operação em Safari e Chrome, comparação com sistema em uso e responsável pelo aceite. Foram cadastrados **17 contratos prioritários**. **Todos permanecem PENDENTES de aceite operacional**, inclusive os aqui implementados em simulação.

**Demais Utilidades ainda ausentes:** modelos de etiquetas de embalagem, cadastro individual de embaladeiras e regularização histórica. A frente Pedido → Corte → Facção → Separação → Acerto multimodelo segue sem integração de ponta a ponta.

**GATE FINAL = BLOQUEADO.** Nenhum teste local ou CI, por si só, autoriza substituição do sistema atual.


## Sexta evolução isolada — Etiqueta personalizada e fila individual de Embaladeira (18/11/2026)

**Estado: IMPLEMENTAÇÃO LABORATORIAL / ACEITE OPERACIONAL PENDENTE.** A versão de produção permanece **BLOQUEADA**.

### LEG-013 — Modelo de etiqueta por cliente/produto

- Novo motor `modulos/embalagem-etiquetas-v1.js` com versão de modelo, cliente, produto opcional (padrão por cliente), SKU, CNPJ, URL HTTPS, referência de arquivo e campos variáveis.
- Um cliente pode possuir padrão geral e etiqueta específica de cada modelo. A resolução dá preferência à etiqueta específica; não atribui etiqueta de outro cliente.
- Criação, edição com motivo e arquivamento sem excluir; não é permitido transferir a identidade de cliente/produto de uma etiqueta entre versões.
- Novas tarefas de embaladeira guardam **snapshot da versão da etiqueta**. Mudanças posteriores de SKU, CNPJ ou arquivo referenciado não substituem silenciosamente a etiqueta anteriormente atribuída. A inspeção de integridade verifica versões e cadeia de comandos inclusive para etiquetas arquivadas.
- Tela de Utilidades exibe cadastros, versões, histórico e conferência **textual** do cliente/modelo/SKU/arquivo.
- **Pendente:** envio e armazenamento efetivo de PDF/imagem de etiqueta, preview visual do arquivo, QR Code, impressão com equipamento real, permissões e versão confirmada remotamente. Registrar apenas o **nome** de um PDF não equivale ao upload; o texto deixa isso explícito.

### LEG-014 — Atribuição individual à embaladeira

- A tela de Separação preserva o `packagingPanel` existente de **lote / acerto**, e acrescenta a fila individual complementar e fictícia.
- Cadastro de embaladeira (funcionária simulada), cliente, modelo, cor, tamanho, quantidade enviada, quantidade de etiquetas, data e observações.
- Conferência de peças **parcial e total** com histórico (por exemplo 20/50; 30 pendentes), correção explícita para menos com justificativa e ajuste de quantidade/responsável sem apagar a versão anterior.
- Proteções: não duplicar tarefa idêntica, não concluir acima de quantidade atribuída, não cancelar se houver peças prontas, não editar cliente/produto/cor/tamanho após conclusão parcial; o Auditor identifica quantidade ou etiqueta modificadas sem o respectivo comando.
- Indicadores por embaladeira mostram enviadas, prontas e pendentes; alerta para tarefa sem etiqueta.
- **Não há vínculo de baixa real** com Pedido → Corte → Facção → Separação, nem acerto automático, nota, estoque, pagamento ou reconhecimento remoto. Esta fila é um **exercício à parte** do módulo operacional antigo e não deve aumentar artificialmente os saldos disponíveis em Separação.

### Prova e bloqueio

- Novo contrato `tests/embalagem-etiquetas-contract.cjs` foi integrado ao workflow de Operação Integrada (20 áreas).
- O teste de navegador `tests/operacao-integrada-mobile.cjs` inclui cadastro e conferência da etiqueta, atribuição 50 peças, baixa fictícia de 20 e revisão para 60, em Chrome e Safari/WebKit (ainda depende de CI verde).
- Simulação integrada do motor validou histórico e bloqueio de adulteração de etiqueta arquivada: 0 erros antes da modificação simulada; erro detectado depois.
- `ACE-012` e `LEG-013/LEG-014` **permanecem PENDENTES** de equivalência com o legado e aprovação da equipe.

**Próxima prioridade:** regularização histórica com prévia não destrutiva e origem rastreável; depois integração operacional por modelo/cor/tamanho, teste em duas sessões e importação reversível dos dados legados. Nenhum merge na `main`; nenhuma alteração na base comercial.


## Sétima evolução isolada — Regularização histórica somente em prévia (18/11/2026)

**Estado: IMPLEMENTAÇÃO PARCIAL / LEG-015 e ACE-013 PENDENTES. Não há importação.**

- Novo componente puro `modulos/regularizacao-historica-preview-v1.js` oferece diagnóstico local de CSV fictício com colunas `cliente;modelo;quantidade;data;referencia;status`.
- A área **Utilidades** agora permite colar registros fictícios, baixar um modelo CSV, gerar prévia e exportar um relatório JSON, sem criar nenhuma linha no pedido, estoque, facção, nota, folha ou financeiro. O resultado marca `canCommit:false`, `importedCount:0`.
- Conciliação de cliente/modelo é **somente por ID ou nome exato e único**; referências repetidas na entrada e já presentes em pedidos/importações do laboratório são bloqueadas. Data impossível, quantidade inválida e linha incompleta são destacadas.
- Testes: `tests/regularizacao-historica-contract.cjs` e fluxo sem alteração de revisão no passeio Chrome/WebKit `tests/operacao-integrada-mobile.cjs`.
- **Ainda faltam:** leitura fiel de PDF/foto/TXT do legado, resolução assistida de alias e produtos de revenda, conciliação da produção e das facções por lote, identificação de movimentos financeiros já quitados, WAL pendente de outras máquinas, plano reversível de importação, permissões e dupla conferência remota. Nenhum desses itens está sendo substituído pela prévia simplificada.
- `LEG-015` permanece sem aprovação. A regra dos 17 contratos de aceite por tarefa segue `0/17`, sem prova com usuários nem autorização para produção.

**Próxima etapa sugerida de engenharia:** normalizar identidade e saldo por `pedido + modelo + cor + tamanho` entre Pedido, Corte, Facção, Separação e Acerto, com prova idempotente em duas sessões e comparação com dados anonimizados do HLGB atual. Não publicar em `main` nem migrar dados comerciais antes dessas provas.


## Oitava evolução isolada — percurso multimodelo por variação (18/11/2026)

**Estado: IMPLEMENTADO NO LABORATÓRIO, AINDA NÃO HOMOLOGADO PARA PRODUÇÃO.**

### Nova ligação entre áreas

- Módulo independente `modulos/fluxo-multimodelo-v1.js` vinculado por `orderId + itemId + color + size + cutId`. Aceita somente `multiCutPlans` concluídos e **não** toca `orders`, `cutPlans`, `stockLedger`, `settlements`, `finance` ou pagamentos existentes.
- Operações: `multi.flow.allocate` (por cor/tamanho), `multi.flow.transfer` (saldo ainda pendente), `multi.flow.rate` (mão de obra futura), `multi.flow.return` (retorno parcial com preço/facção congelados), `multi.flow.review` (conferência do acerto fictício), `multi.flow.separate` e `multi.flow.ship` (baixas parciais, separadas por célula).
- Motor de saldos fornece `ordered, cut, cutReserved, allocated, returned, separated, shipped, toCut, toAllocate, inFaction, cutToSeparate, availableToSeparate, toShip`, para cada variação, com conservação `pedido >= corte >= alocado >= retorno >= separado >= expedido`.
- A transferência preserva cada retorno e respectiva mão de obra/facção histórica, enquanto muda a facção das peças **ainda não devolvidas**. **Limitação:** transfere todo o saldo pendente do lote; a divisão de apenas parte desse saldo entre duas facções não está homologada.
- Acertos multimodelo são **demonstrativos** e agrupados por facção para conferência. Não registram pagamentos, não criam títulos no Hub, não permitem marcar como pago, e não substituem acertos comerciais.
- Módulo visual separado `modulos/fluxo-multimodelo-ui-v1.js`, acoplado sem excluir formulários antigos às telas de **Pedidos**, **Facções**, **Separação** e **Acertos**. Facção deve ser selecionada explicitamente.
- Core verifica IDs, comandos, revisão, origem do lote concluído, preço congelado de cada retorno e invariantes por variação. Repetição de comando e movimentos acima do saldo são recusados antes de gravar.

### Simulação executada e aceitação pendente

- Cenário com dois modelos: primeiro com **120 peças**, segundo com 10; corte concluído de 80 do primeiro, enviado à primeira facção; retorno parcial 30; troca das 50 restantes para segunda facção com nova mão de obra; retorno de 20 da segunda; separação de 50 (30 P + 20 M), expedição de 20; o primeiro modelo encerra com **40 a cortar, 30 cortadas a separar**, e o segundo preserva seus 10 pedidos sem baixa.
- Retorno origem: 30 × R$ 5,50 = R$ 165,00; retorno destino: 20 × R$ 6,00 = R$ 120,00 — valores **fictícios** separados por facção e congelados em seus registros. `finance.length === 0`, `stockLedger.length === 0`; integridade local aprovada com simulação usando o core e módulos reais multimodelo.
- Contratos adicionados: `tests/fluxo-multimodelo-contract.cjs` (saldo, alterações, fraude, bloqueios, não duplicação) e fluxo Chrome/WebKit em `tests/operacao-integrada-mobile.cjs` (jornada guiada 120→80→50→20). **CI do GitHub e verificação real da interface ainda precisam ficar verdes.**
- **Pendente para aceitar LEG/ACE-001 a ACE-005:** vinculação real ao estoque e produção, saldo dos pedidos anteriores, preço de mão de obra com traveta e demais acordos, pagamentos e compensações no Hub, controle de divergências entre sessões Safari/Chrome, baixa efetiva parcial, reimpressão e comparação com o funcionamento atual de todos os botões, aceite por pessoa da equipe e migração reversível.

O **gate de produção permanece bloqueado**. Nenhum merge na `main`, nenhum uso de dados comerciais, nenhuma migração.


### Complemento da oitava evolução — fila de trabalho ligada ao registro

- Em **Núcleo**, a fila operacional fictícia lê os saldos por `pedido+modelo+cor+tamanho` e separa: a cortar; corte concluído pronto para facção; retorno disponível para Separação; separado disponível para Expedição; acerto fictício aguardando conferência.
- Cada item indica o documento exato e abre o módulo correspondente. O botão `data-mf-focus` direciona à identidade `pedido|item` ou ao acerto `MFR-...`, abre a área recolhida e destaca visualmente o alvo. O controle não depende de pesquisas aproximadas.
- A inspeção de origem também passou a verificar os motivos e snapshots de transferências de facção, alterações de mão de obra e conferência dos acertos; adulteração simulada de um motivo de transferência foi detectada.
- Testes adicionados à suite `fluxo-multimodelo-contract.cjs` e ao passeio Playwright `operacao-integrada-mobile.cjs`, incluindo o clique na fila que deve focar o acerto `MFR-0002`.
- **Limites:** não há confirmação de gravação entre computadores, filtro por data de entrega, prazo/vencimento, fila por perfil autorizada nem vinculação ao registro comercial. A fila representa somente o documento fictício local. `ACE-015/016` continuam **PENDENTES** de aceite.

O lançamento do sistema novo permanece **BLOQUEADO**; não houve integração com a base empresarial nem merge na `main`.


## Nona evolução isolada — duas sessões, conflito e recuperação com origem auditável (18/11/2026)

**Estado: TESTES IMPLEMENTADOS, EXECUÇÃO COMPLETA DO CI AINDA PENDENTE. ACE-009/017 PENDENTES.**

- O novo percurso multimodelo foi submetido a mais um **roteiro automatizado de duas sessões independentes**, no mesmo PostgreSQL **descartável**: `tests/banco-integrado-multimodelo-browser.cjs`, executado pelo workflow `evolucao-banco-integrado.yml` em Chromium e WebKit. Confere conflito entre revisão antiga e nova, `120` peças confirmadas na sessão A versus tentativa de `110` na sessão B, WAL persistido, revisão remota, ACK perdido, replay idempotente e queda/reconexão.
- Novo `tests/operacao-duas-abas-local-mobile.cjs` comprova **duas abas com IndexedDB compartilhado** versus outro perfil/navegador com armazenamento independente, sem fingir que houve sincronização remota.
- As permissões de `banco-integrado/permissoes-lab.cjs` liberam comandos `multi.cut.*` e `multi.flow.*` **somente ao administrador fictício**, para teste de transação de servidor. Operadores B/C seguem **sem** esses comandos nem acesso financeiro; nenhuma política comercial ou RLS foi alterada.
- `banco-integrado/cliente.js` elevou a versão IndexedDB do WAL para 2, criando `wal-review` **sem eliminar a store `wal` existente**. Tentativa cancelada com confirmação do servidor é arquivada **na mesma transação local** que limpa a pendência, preservando comando, payload, revisão esperada, revisão em conflito e motivo de falha.
- O painel remoto dispõe de **Exportar intenção ainda pendente** e **Exportar histórico local de conflitos**. Exportar **não reenvia**, **não cancela** e **não confirma** o lançamento; o histórico arquivado continua no navegador e pode ser exportado para conferência.
- `tests/banco-integrado-multimodelo-browser.cjs` inclui conferência da exportação, arquivamento da versão concorrente e teste de upgrade do WAL v1→v2 com pendência antiga preservada. O CI gravará um JSON sintético de evidência **somente após sucesso real**.
- O roteiro operacional de 12 provas foi formalizado em `ROTEIRO-DUAS-SESSOES-ACE-009.md`. Ele diferencia duas abas locais, dois contextos com PostgreSQL, dois computadores reais Safari/Chrome e teste com cópia anonimizada do HLGB legado.

**Não está pronto para produção:** o arquivo das tentativas canceladas é local ao navegador de laboratório e **não é um repositório seguro de conflitos no servidor**; não há RLS empresarial, retenção e controle de acesso reais para as duas versões. Também não houve teste físico entre Safari no Mac e Chrome em outro computador com os dados atuais, aprovação da equipe ou importação reversível do legado. Resultados CI enfileirados não significam sucesso.

**Status permanece:** **0/17 contratos prioritários aprovados operacionalmente**, `approvedForProduction:false`, nenhum merge na `main` e nenhum acesso à base comercial.
