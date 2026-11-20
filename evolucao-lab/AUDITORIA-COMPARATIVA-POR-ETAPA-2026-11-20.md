# HLGB Evolução — auditoria comparativa obrigatória por etapa
Data: 20/11/2026. Estado: **PENDENTE de equivalência funcional e aceite humano**.
Escopo desta primeira rodada: **fila por setor, Corte, Facções, Acertos e interfaces com Separação**.
Fontes: código atual do HLGB comercial `main`, laboratório isolado `feature/evolucao-laboratorio-isolado-v1-20261114`, contratos ACE-001–017 e documentação de mercado.
Esta auditoria é documental/estática e não equivale a uma homologação com lançamentos reais ou teste em dois computadores.

## Regra que se aplica a TODAS as etapas
1. Inventariar telas, campos, botões, impressões, relatórios, filtros, permissões, histórico, baixa e recuperação na **main comercial**, incluindo scripts externos e `app9240.html`; registrar caminho e evidência. Nenhuma ausência na Evolução autoriza eliminar recurso.
2. Cruzar cada função com o código novo. Marcar **preservada (com prova)**, **parcial** ou **ausente/não verificada**. Nunca tratar "há tela" ou "há teste unitário" como preservação comprovada.
3. Pesquisar sistemas atuais e padrões industriais; propor melhoria com benefício mensurável, sem prometer exclusividade no mercado.
4. Implementar isoladamente com compatibilidade de identidade, grade, dados e histórico; adicionar teste de regressão de todos os comportamentos anteriores.
5. Bloquear aceite até exercício com registro anonimizado, releitura remota, Safari/Chrome, segunda sessão, histórico, auditor e plano de reversão.
6. Critério de conclusão: **todas as funções preservadas + pelo menos uma melhoria medida + nenhum problema crítico/alto associado**.

## Etapa 1 — Fila por setor e ponta a ponta (P0)
| Função observada ou exigida no original | Evidência original | Evidência Evolução | Situação em 20/11 | Próxima prova / melhoria |
|---|---|---|---|---|
| Busca pedido/cliente/produto e programação **por modelo** | `release-cutter-planner.js`, `modelRows`, `renderOrderSearch`, `renderMatches` da main | `modulos/fluxo-multimodelo-ui-v1.js`: fila por saldo; `operacao-integrada-ui.js`: pesquisa global | **Parcial**; fila por saldo não substitui busca/programação antiga | Conferir pesquisa, responsável, data, prioridade, modelo, pedido e situação exata; vincular com agenda |
| Cortar por modelo, cor e tamanho sem misturar modelos | `release-cutter-planner.js:modelRows` e contratos ACE-001/002 | `pedidos-multimodelo-v1.js`, `corte-multimodelo-v1.js`; fluxo isolado | **Parcial**; integração e equivalência não homologadas | Ensaiar dois modelos, cores, tamanhos dinâmicos e dois cortes independentes |
| Rota de levar/buscar e destino escolhido pela pessoa | `release-operations-pack.js:openRouteEditor`; prova remota `routeRemoteProof9534` | `rotas-utilidades-v1.js` laboratório e fila de facção | **Parcial**; sem leitura remota entre computadores | Destino correto, ida/volta, identidade da rota, edição, impressão e prova remota |
| Volumes e etiquetas A4 10/18/21, múltiplos modelos | `release-operations-pack.js:renderLabels` | `etiquetas-a4-v1.js` e Utilidades | **Parcial / não homologado** | Volumes 1 de N, diferentes modelos, prévia, impressão e totais físicos |
| Embaladeira individual com quantidade pronta e etiqueta | `release-operations-pack.js:renderPackaging` | `embalagem-etiquetas-v1.js` e atribuições de teste | **Parcial / não homologado** | Vincular pessoa, cliente, modelo, tamanho, quantidade, pronta e etiqueta; não substituir por facção |
| Regularização de histórico com entrada PDF/foto/TXT/CSV, prévia e confirmação explícita | `release-operations-pack.js:renderHistorical` | `regularizacao-historica-preview-v1.js` apenas prévia textual | **Lacuna de entrada/fluxo**, não homologada | Importar arquivos com proteção, comparar linha a linha, simular e reverter |
| Transferência entre facções preservando quem deve receber | Contrato ACE-003 e inventário legado LEG-017; código específico de acertos ainda precisa rastreio completo | `fluxo-multimodelo-v1.js`: transferência, retorno com origem e preço congelados | **Parcial** | Transferência, edição de tarifa após alocação, retorno parcial, identidade da facção, histórico e acerto agrupado |
| Pagamento/acerto avulso e consolidação por pessoa | Contrato ACE-005 e inventário legado LEG-017 | `operacao-integrada-core.js`: acertos legados de laboratório; fluxo multimodelo só confere e NÃO gera título | **Parcial / integração faltante** | Avulsos sem preço de venda, duas operações da mesma pessoa consolidadas sem duplicar pagamento |
| Baixa de Separação por variação e não repetir baixa | Contrato ACE-004, inventário LEG-018 | `fluxo-multimodelo-v1.js`: separação e expedição por cor/tamanho | **Parcial**; ainda sem prova remota | Saldo em cada etapa, idempotência, confirmação de dois navegadores |
| Fila mostra as pendências e abre ID correto | ACE-015; requisitos de trabalho por setor no sistema comercial | `fluxo-multimodelo-ui-v1.js`: lista por etapa, sem limite de 120, botão `data-mf-focus` | **Melhoria de interface implementada no laboratório**; não é aprovação | Conferir acesso real por papel, data, material, bloqueio e resultados de cadastro; teste >120 não prova escala |
| Controle de quem pode executar e por que está bloqueado | ACE-015/016 (exigência) | Fila atual calcula saldo e mostra apenas ações possíveis; perfis reais não integrados | **Lacuna P0** | Não oferecer tarefa bloqueada como liberada; explicar motivo e evidência |
| Fonte de verdade, WAL, sincronização, histórico, segunda sessão | ACE-009/017 | Laboratório da página isolada usa IndexedDB local fictício | **Lacuna P0 para substituição** | Prova de escrita/releitura servidor, estado offline/pendente/nuvem/conflito, rollback |

### Checagem de não regressão já feita
- A nova fila por etapa não omite as pendências após 120 itens; ensaio direto com 135 acertos fictícios confirmou 135 atalhos. Não comprova operação com milhares de itens, permissões ou sincronização.
- `operacao-integrada-autonoma.html` recebeu a mesma implementação de fila. É protótipo com dados fictícios, **não** o HLGB comercial.
- Nenhum item da tabela está aprovado como substituto. "Não verificado" significa preservar até prova em contrário.

## Referências de mercado e possibilidades de melhoria
1. **ERPNext, Subcontracting** — ordens terceirizadas, saldos parciais remanescentes; inspirar transferência/retorno com identidade de lote e preço histórico. https://docs.frappe.io/erpnext/subcontracting
2. **ERPNext, Job Card** — ordens de operação, estações e progresso por tarefa; inspirar cartões por modelo/etapa, com quem, quando, quantidade e confirmação de conclusão. https://docs.frappe.io/erpnext/job-card
3. **Odoo Manufacturing** — programação, controle de chão de fábrica, leitura por código de barras, custos em processo e relatórios; inspirar fila operacional mobile e leitura/baixa de lote com histórico. https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing.html
4. **ISA-95** — integração entre planejamento e execução, com contexto operacional rastreável; inspirar separação rigorosa entre planejamento, ordem e evento executado. https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard
5. **SYSPRO 2026, WIP Subcontract Operations** — despacho/recebimento de terceiro e rastreabilidade por lote, inspeção no retorno. https://help.syspro.com/syspro-8-2026-r1/resources/pdfs/2026-release/topics/wip-subcontract-operations.pdf

**Proposta diferenciadora (hipótese, NÃO declarada inédita):** "fila explicável por peça": além do saldo disponível, cada tarefa exibe *por que* pode ou não avançar (falta material, etapa anterior pendente, divergência, conflito WAL, facção/valor não confirmado), origem do bloqueio, ação de desbloqueio e prova de confirmação. Acrescentar prevenção de envio para facção errada, previsão de prazo baseada em capacidade/histórico real, simulação de consequências antes de confirmar operação, e atalho ao registro exato. Medir cliques para localizar pendência, erros de baixa, tempo de conferência e retrabalho.

**Outra hipótese:** rastreabilidade por QR do lote + etiqueta de volumes + confirmação da facção no retorno, com trilha de quem, quando e quantidade, incluindo validação offline/idempotente. Só implementar após decidir o modelo de identidade compatível e o desenho de autorização.

## Pendências que impedem dizer "não perdemos nenhuma função"
- Rastreio completo do `app9240.html` e scripts comerciais por tela/ação: **incompleto**.
- Inventário antigo de 76 funções e 17 contratos: **referência mínima**, não enumeração exaustiva.
- Mapeamento campo a campo de Facções/Acertos/Hubs e seus relatórios: **ainda incompleto**.
- Testes com snapshot autorizado, anonimizado, duas sessões e migração reversível: **não executados**.
- Ações novas não podem ser integradas à `main` sem aceite, backup e rollback.

## Próxima sequência de auditorias
1. Pedidos e Produtos: todas as formas de pedido, referências, grade, edição, histórico, preços.
2. Corte/Cortadores: programação, BOM, pesos posteriores, lixo, aproveitamento, três assinaturas, impressão e filtros.
3. Facções/Acertos: serviços, tarifa, avulsos, agrupamento, travetada, compensação, comprovantes e pago.
4. Separação/Embalagem/Rotas/Etiquetas: baixa parcial, volumes, atribuição e impressão.
5. Hub/Folha/Compras/Estoque: gravações, somas, reconciliação e segunda sessão.
6. Auditor/Bot/Relatórios/Segurança: evidência, recuperação, acesso, desempenho, indicadores e migração.

Para cada etapa, acrescentar linha de correspondência **original → Evolução → pesquisa externa → melhoria proposta → prova/aceite**, sem apagar nenhuma linha pendente.
