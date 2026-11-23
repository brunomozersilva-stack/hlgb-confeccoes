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

## Etapa ampliada · pré-migração acessível no Auditor da mesma homologação (22/11/2026)

### Tela implementada
- O **Auditor existente** ganhou o painel \`Pré-migração · vínculos de Pedidos, Corte, Facções e Acertos\`. Não foi criada outra homologação, outro banco nem outra URL.
- Quatro cenários **100% inventados** podem ser alternados sem salvar: cadeia com vínculos coerentes, dois títulos para o mesmo acerto, alteração de grade/facção e ausência de documentos. Todos mostram **MIGRAÇÃO BLOQUEADA**, mesmo quando a grade coincide.
- A consulta distingue as quantidades de cada modelo, cada cor/tamanho divergente, os documentos declarados e as inconsistências que exigem revisão humana.
- A mesma prévia permite baixar um **CSV identificado como FICTÍCIO**, com as diferenças e bloqueios; valores são citados como demonstração, sem quitação nem estoque.
- Uma ferramenta avançada recolhida aceita um pacote JSON \`{legacy,prepared,evidence}\` **inteiramente inventado**, limitado a 50.000 caracteres. Os campos são validados pelo mesmo conferidor, permanecem somente na memória da aba, podem ser descartados e desaparecem ao recarregar. NÃO inserir clientes, valores ou trabalhadores reais.

### Reutilização de regras, sem segundo validador
- \`migracao/build-preflight-browser.cjs\` gera \`modulos/preflight-migracao-browser-v1.js\` a partir dos mesmos dois validadores Node: \`comparador-grade-legada.cjs\` e \`preflight-vinculos-operacionais.cjs\`.
- \`--check\` no CI compara o bundle inteiro ao resultado reproduzível; recusa deploy se os motores divergirem.
- O HTML modular carrega o motor antes da interface. O gerador de HTML autônomo o incorpora junto aos demais módulos.
- O manifesto \`monitorExpected\` foi atualizado, preservando o teste de inventário e a prova da lista exata de scripts. Uma falha anterior no inventário de scripts foi corrigida sem desligar a checagem.

### Ensaios adicionados
- \`tests/preflight-migracao-dashboard-contract.cjs\`: motor idêntico ao CJS, quatro cenários, bloqueio comercial, exportação CSV, JSON inventado e ausência de funções de gravação no painel.
- \`tests/preflight-migracao-dashboard-mobile.cjs\`: Auditor em 390 e 1280 px, Chromium e WebKit; troca de cenários, download CSV, JSON inválido/aceito, descarte, navegação entre áreas e revisão local inalterada.
- Foram incluídos no gate \`.github/workflows/evolucao-operacao-integrada.yml\`; testes gerais e navegadores devem receber resultado **oficial de conclusão** antes de homologar a nova tela.
- A execução anterior de 20 áreas em Chromium e WebKit já havia passado antes desta extensão, e o laboratório isolado dessa revisão também; isso não equivale a aprovação comercial.

### Bloqueios e próximos passos
- Não existe ainda uma extração **confiável, completa e autorizada** dos registros legados. Não é possível declarar migração pronta apenas com JSON de exemplo ou com o banco local fictício.
- A identidade de pedido/cliente/modelo e a correspondência de documentos de Corte, envio, retorno, compensação, título e comprovante precisam ser migradas por adaptador auditável e comprovadas em base isolada antes de qualquer escrita real.
- Preservar as 76 funções do sistema comercial, suas telas e impressões; cada módulo precisa melhorar pelo menos um problema da operação antiga sem perder função.
- A próxima prioridade técnica depois de estabilizar este gate é a **prévia de impacto de migração real em banco de homologação**, com comparações por registro e geração de relatório para o aceite humano. Qualquer ação que envolva dados comerciais precisa de autorização explícita e de um plano de rollback.

**Sem merge no main; sem comando no financeiro/estoque do programa no ar.**

## Dossiê operacional e conferência de lote entre pedidos

### Dossiê por documento original
- Criado \`migracao/dossie-vinculos-v1.cjs\`: relatório **exclusivamente de leitura** que reutiliza \`preflight-vinculos-operacionais.cjs\`. Mostra cada ID original de Corte, envio/retorno à facção, acerto e título financeiro, a qual documento de origem aponta, a qual item preparado poderia corresponder e o que ainda falta conferir.
- Para cada registro são preservados o ID original, estágio, modelo, quantidade, valor em centavos (se existe), estado, tipo de documento pai e qualidade da referência. O dossiê nunca fabrica \`targetId\`, não cria título nem altera pagamento.
- O resultado distingue \`referencia_identificada_sem_aprovacao\` de \`exige_conferencia\`. Ter um vínculo nominalmente identificado **não** comprova seu conteúdo, sua origem bancária ou sua legitimidade.
- Uma fila por área aponta divergências de grade, documentos sem relação identificável, pagamentos já efetuados e faltas de prova. Os vínculos ainda devem ser confrontados com o banco único de homologação antes de qualquer importação real.
- O painel de Auditor mostra o dossiê e a fila; para preservar desempenho, a tabela exibe no máximo 80 itens, enquanto o CSV fictício inclui todas as linhas do cenário analisado.

### Conferência transversal de lote
- Criado \`migracao/dossie-lote-v1.cjs\`: compara de **1 a 100 pedidos inventados** sem criar nenhum dado. Identifica \`orderId\` de origem/destino repetido (erro de entrada) e o mesmo ID documental reutilizado em dois pedidos diferentes (conflito a investigar).
- O exemplo recolhível do Auditor usa **dois pedidos inventados** e simula o mesmo título \`PAG-EXEMPLO-01\` aparecendo em ambos. O resultado é **MIGRAÇÃO BLOQUEADA**, nunca proposta automática de fusão de títulos ou quitação.
- Cada lote guarda origens, destinos candidatos, quantidades, contagem de documentos e um conjunto de pendências. O CSV de lote identifica \`DOCUMENTO_DUPLICADO\`, \`DOCUMENTO_DECLARADO\` e \`PENDENCIA\` com IDs conservados.
- Não confundir a checagem local de repetição de IDs com uma prova global de unicidade: falta conhecer todas as tabelas do sistema comercial e confirmar o conteúdo de cada tabela no banco de homologação.
- O motor browser é **gerado a partir dos mesmos arquivos CJS** e conferido por comparação determinística. Não manter validadores de migração duplicados nem enfraquecer testes existentes para publicar.

### Testes novos
- \`tests/dossie-vinculos-contract.cjs\`: 6 cenários (identidade preservada, pagamento duplicado, documentos sem ID, erro de modelo, falta de item de destino, determinismo sem IO).
- \`tests/dossie-lote-contract.cjs\`: 6 cenários (dois pedidos, título reutilizado, pedidos duplicados, grade divergente, limites, determinismo sem IO).
- \`tests/preflight-migracao-dashboard-contract.cjs\`: expandido para validar o dossiê, o lote e seus dois CSVs.
- \`tests/preflight-migracao-dashboard-mobile.cjs\`: expandido para clicar no resumo do lote e baixar o CSV no Chromium e no WebKit, em 390 e 1280 pixels.
- O gate da operação integrada inclui esses contratos e a verificação de \`build-preflight-browser.cjs --check\`.

### Próxima etapa de integração com dados reais — NÃO IMPLEMENTADA
1. Inspecionar esquema/versão do programa no ar e documentar a origem/ID de **todos** os movimentos (inclusive compensação, devolução, estorno e acertos já arquivados) sem consultar informações privadas desnecessárias.
2. Criar um adaptador de **exportação somente leitura para uma cópia isolada e autorizada**; validar nomes de colunas, versões, referência composta, integridade temporal e registros sem foreign key.
3. Conferir duas leituras independentes na homologação e bloquear mudanças concorrentes durante a simulação, sem qualquer escrita na base comercial.
4. Aprovar por tarefa de operador (Pedidos, Corte, Facções, Acertos, Folha, Financeiro) e reversão garantida; somente então avaliar integração efetiva.

**Nenhum merge para \`main\`, nenhuma gravação em estoque, pedidos ou financeiro comercial nesta etapa.**

## Etapa 23/11 — adaptador paginado de homologação fictícia

**Implementado somente na branch de laboratório, sem leitura de banco empresarial.**

- `migracao/adaptador-extrato-homologacao-v1.cjs`: recebe extrato paginado normalizado fornecido em memória/JSON. Exige seis coleções (`legacyOrders`, `preparedOrders`, `cuts`, `allocations`, `settlements`, `finance`), manifesto com número de páginas/registros, ID de snapshot, revisão única e checksum SHA-256 para cada página.
- A leitura **rejeita** páginas ausentes, repetidas ou alteradas, revisões misturadas, IDs duplicados, versões desconhecidas e tentativas de identificar pedidos preparados sem `sourceOrderId` explícito.
- Documentos sem `orderId` ou com pedido não encontrado são registrados em `unattached`, sem descarte. Pedidos sem correspondente são registrados em `unmapped`. O dossiê por pedido só é calculado para pares explicitamente localizados; problemas estruturais falham de modo fechado.
- `compareReads(a,b)` compara digests de dois extratos da mesma revisão e aponta deriva de dados. **Não** prova que a leitura veio de dois computadores reais nem que a base comercial foi integralmente exportada.
- `migracao/conferir-extrato-ficticio-v1.cjs`: comando offline reproduzível que gera massa inventada (dois pedidos), imprime resumo, confere arquivo local fictício ou compara dois arquivos. Não faz upload, conexão remota, importação nem escrita no ERP.
- `migracao/CONTRATO-EXTRATO-HOMOLOGACAO-v1.md`: esquema de páginas e manifesto, limites, instruções de ensaio e pré-requisitos para uma futura conexão real.
- `tests/adaptador-extrato-homologacao-contract.cjs`: 8 testes de verificação de conteúdo, páginas, revisões, pares, documentos órfãos e estabilidade de duas leituras. `tests/conferir-extrato-ficticio-contract.cjs`: 5 testes adicionais do comando, do exemplo e dos bloqueios.
- Os arquivos e testes foram adicionados à esteira `evolucao-operacao-integrada.yml`. A validação isolada em JavaScript passou os 8 cenários do adaptador; **não substituir o resultado oficial de Node/CI** por essa verificação.
- Todas as saídas permanecem `canWrite:false`, `canPay:false`, `canChangeStock:false`, `importable:false` e `realDatabaseCoverageProven:false`.

### Bloqueios intocados

Nenhum vínculo foi estabelecido com banco de produção, homologação remota, Supabase ou sistema no ar. A implementação **não é** a extração comercial propriamente dita e **não está pronta para migração real**. Ainda precisa verificar o esquema atual e todas as funções comerciais, os IDs de pagamentos/compensações/arquivos históricos, versão da base e concorrência, a origem dos dados de servidor, restauração de backup, autorização de acesso somente leitura, prova em duas sessões e aceite por operador. Não foi realizado merge em `main`.

## Etapa de estabilização 23/11 — corte por folha e preservação de excluídos

### Corrigido: mesma folha consumida em dois envios
- O conferidor `migracao/preflight-vinculos-operacionais.cjs` agora soma separadamente as quantidades enviadas **por ID de folha de corte**. Mesmo que a soma total de cortes do modelo cubra a soma dos envios, cada folha concluída deve suportar **apenas suas remessas vinculadas**.
- Se o total enviado de uma mesma folha exceder seu corte, o motor retorna `FOLHA_CORTE_EXCEDIDA_POR_ENVIOS`. O valor não é corrigido automaticamente: a origem física precisa ser verificada, principalmente quando o mesmo tecido atende diferentes facções.
- Incluído o cenário `Folha consumida por dois envios` no Auditor da homologação, com quinto exemplo inventado, além da evidência no CSV. Chromium, WebKit, mobile e contrato do painel receberam asserções específicas.
- Três contratos adicionais testam folha compartilhada excessivamente, envio distribuído corretamente entre folhas e uso indevido de corte planejado/cancelado. **14 testes isolados do pré-voo passaram na verificação local de lógica**; o resultado Node oficial depende da esteira.

### Preservação de tombstones (excluídos, sem ressuscitar)
- O adaptador `adaptador-extrato-homologacao-v1.cjs` separa registros com `deleted:true`, `isDeleted:true`, `deletedAt` ou `deleted_at` em `tombstones[]`. Eles permanecem na contagem de origem e em inventário histórico resumido, mas **não entram como pedidos, acertos, documentos nem pagamentos ativos** no dossiê.
- `historicalRecordsReactivated:0` é uma garantia explícita da **prévia fictícia**, não prova de preservação da base comercial real.
- O comando de conferência offline passa a expor `historicalTombstones` e `reactivatedTombstones` no resumo. Indicadores de exclusão com tipos incoerentes provocam erro em vez de interpretação otimista.
- Três novos contratos verificam pedido excluído, acerto e título excluídos, e tipo inválido. **11 testes isolados do adaptador passaram na verificação da lógica**; SHA-256 real e navegadores permanecem sob execução oficial de CI.

### Limitações inalteradas
- Não há conexão à base original ou homologação empresarial. É necessária autorização e mapeamento de colunas das tabelas reais, além de trilha histórica de compensações, estornos, devoluções, comprovantes, alterações e todas as 76 funções comerciais.
- Nenhum relatório aprova migração, movimento de estoque ou pagamento. **Sem merge em main.**
