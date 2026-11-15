# HLGB Evolução — Laboratório independente (Etapa 1)

Esta pasta é um **protótipo isolado**: não é uma tela incorporada ao HLGB em produção.

## Nova etapa — Guardião de preservação e bloqueio de liberação (offline)

A página `guardiao-preservacao.html` vincula o inventário real do repositório (**76 funções de 19 módulos**), a matriz de **43 critérios detalhados** e o plano de **266 melhorias**; identifica **30 funções P0** e permite navegar pelas referências de arquivos e testes legados.

- Busca, filtros por módulo, prioridade e demonstração; links para os 8 exercícios parciais.
- Importação validada do relatório exportado pela Central de Homologação, com separação clara entre **funcionou na prévia** e **paridade funcional comprovada**.
- Exportações de pendências em CSV/JSON com 76 bloqueios obrigatórios, mesmo que 8 demonstrações tenham passado.
- Testes automatizados verificam dados embutidos versus inventários de origem e existência de todas as fontes e referências de teste; o teste de baseline confere hash de **229 arquivos antigos**.
- Browser tests em Chromium/WebKit, incluindo telas estreitas, importação malformada e bloqueio de liberações indevidas.

O Guardião **não publica**, **não aprova**, **não conecta bancos** e não autentica aprovações. A liberação segue bloqueada em 0/76 funções até que haja implementação equivalente, provas funcionais, integridade, validação mobile, testes em duas sessões e autorização explícita. A CI aprovada confirma apenas integridade e correto funcionamento da trava demonstrativa.

## Nova etapa — Planejamento semanal de matéria-prima e compras (simulação)

O arquivo independente `planejador-materiais.html` reúne quatro áreas interativas: plano semanal por modelo/tamanho; necessidade e custo por modelo; edição da ficha técnica de consumo; e configuração fictícia de materiais, preços, estoque, perda e lote mínimo. Os exemplos são Camisola Melina, Doll Crystal, Calcinha Tammy e Conjunto Paula, com insumos sintéticos em **gramas, centímetros e unidades**.

- Consolidar variantes repetidas, editar quantidades e remover modelos; validar limites e quantidades inteiras.
- Consumo por modelo a partir da grade de tamanhos. Perdas configuráveis aplicadas após somar as variantes dentro de cada modelo.
- Custo de consumo e valor de compra deliberadamente separados. A compra é o que falta após estoque e arredondamento ao lote mínimo, não todo o material consumido.
- Rateio de centavos de consumo por modelo, de forma que os subtotais conciliem exatamente com o consolidado por insumo.
- Exportar a lista fictícia de compras em CSV e o planejamento completo em JSON, incluindo indicadores de consistência.
- HTML autossuficiente, sem rede, Supabase, login, armazenamento persistente ou alterações no HLGB. Reinicia ao atualizar.
- Testes automatizados de segurança e no Chromium/WebKit em cinco larguras, incluindo alterações de ficha, preço e estoque.

**Limites:** nenhum dado ou custo real do ERP é lido. O laboratório não possui controle de fornecedores, impostos, frete, descontos, aproveitamento de sobras, conversão real entre metros/quilos/rolos, previsões com ficha técnica validada nem ordens de compra. Uma aprovação de uso real requer migração e conferência dos cadastros no banco separado de homologação.

## Nova etapa — Ficha de corte e aproveitamento de materiais (simulação)

A página independente `fluxo-producao-integrado.html` liga as variantes fictícias de Pedidos → Corte → Facções → Retorno → Separação. A etapa de Corte exige:

- **Cortador interno ou externo** e identificação de infestador com personagens fictícios.
- **Material** (tule, renda ou malha) e pesos inteiros em gramas: disponibilizado, utilizado, resíduo e sobra calculada; rejeita quantidades acima do disponibilizado.
- **Duas conferências distintas**, apenas como campos de teste (não são assinaturas eletrônicas).
- **Custo estimado** por peso consumido (utilizado + resíduo), com valores por kg inventados; resumo da sessão por modelo e material; indicador de aproveitamento sobre a massa consumida.
- Registro das informações no histórico da movimentação fictícia, com versão da grade, IDs únicos, proteção contra reexecução da mesma transição e exportação JSON.
- Testes automáticos em Chromium e WebKit, cinco larguras e dois cortes (interno + externo), usando materiais diferentes.

**Escopo limitado:** não utiliza tabela real de preços, ficha técnica de insumos, estoque, produção, contas a pagar, assinatura de funcionários ou banco. O resumo não inclui os cortes pré-carregados no exemplo, porque eles não possuem informações de peso. Todos os registros se perdem ao atualizar o navegador.

## Prévia operacional 2.0 (para avaliação de usabilidade)

A nova tela `central-operacional-2.html` foi criada após a avaliação de que os protótipos anteriores eram básicos. Ela aproxima a experiência visual e funcional de uma central de trabalho diária:

- Visão geral com indicadores calculados a partir de acertos fictícios e lista de prioridades.
- Busca única por produto, facção ou ID, filtro por situação, ordenação e navegação contextual.
- Criação e edição de acertos pendentes com preço unitário, travetada e ajuste justificado em **centavos inteiros**.
- Seleção e confirmação de vários acertos para pagamento **simulado em lote**, atualizando simultaneamente o Hub fictício e o histórico de operações em memória.
- Painel por facção, com pendências, valores e seleção para ver acertos vinculados.
- Planejamento de rota reorganizável em tela, sem envio de rotas reais.
- Hub com ligação por ID do acerto, filtro por origem, busca e exportação de CSV com dados fictícios.
- Interface responsiva com cartões de acerto no celular, navegação inferior, diálogos de edição e confirmação.
- Restaurar os dados fictícios restaura **também a busca, os filtros e a ordenação**.

**IMPORTANTE:** é uma prévia de usabilidade que não contém as 266 melhorias completas nem substitui os 43 cenários críticos existentes. Não há gravação real, autenticação, comprovantes reais, WAL ou reconciliação entre aparelhos. Todas as operações reiniciam ao recarregar. Testes de funcionários e homologação funcional seguem pendentes. A versão atual em `main` permanece intocada.

O pacote offline `HLGB-Evolucao-Previa.zip` inclui a Central 2.0 e as telas anteriores, com `index.html` como entrada.

## Garantias

- Os arquivos da pasta **não são carregados** por `index.html`, `app-stable3.html` nem `app9240.html`.
- Não há código Supabase, autenticação da aplicação, chamadas HTTP, IndexedDB, WAL, cookies, localStorage nem service workers.
- Interações do protótipo são **simulações em memória**, sem gravar, editar ou excluir lançamentos.
- Nenhuma alteração no `main`, publicação GitHub Pages ou mudança de banco é autorizada nesta etapa.
- Mudanças futuras devem ser validadas por testes técnicos e pelos funcionários, com suporte a iPhone Safari e Android Chrome.
- **Aprovação explícita** será necessária para integrar qualquer alteração na operação atual.

## Etapa atual — Controle de acesso e PDFs (laboratório PostgreSQL descartável)

- `permissoes/01-laboratorio-seguro.sql`: apenas banco temporário `hlgb_permissoes_lab`, funções privadas, papéis fictícios, isolamento por empresa, RLS e pagamentos idempotentes.
- `permissoes/02-reset-fixtures.sql`: casos sintéticos restaurados antes de cada teste, sem dados reais.
- `permissoes/permissoes-mobile.html`: prévia offline dos papéis Financeiro, Operação e Consulta, com perfis desativados e outras empresas.
- `tests/permissoes-postgres.cjs` e `tests/permissoes-mobile.cjs`: concorrência, revogação de acesso, bloqueio de empresa diferente e validação em Chrome/WebKit.
- `permissoes/README.md`: limites indispensáveis sobre identidade, JWT, `SECURITY DEFINER`, comprovantes e Storage.
- **Importante:** os registros de PDF são apenas metadados declarados; nenhuma mídia real é manipulada. O modelo de `session_user` deste laboratório não pode ser transplantado para o Supabase sem reengenharia de autenticação.

## Etapa atual — Transações fictícias em memória (sem banco)

- `simulador-transacao-memoria.js`: operação atômica de demonstração, idempotência, revisão esperada, histórico, PDF fictício e conciliação após perda de resposta.
- `transacoes-simuladas.html`: visualização mobile de resultados confirmados, conflitos e falhas, sem salvar ou usar dados reais.
- `TRANSACOES-SIMULADAS.md`: exemplos, limitações e exigências para futura implementação em um banco de teste isolado.
- Os arquivos desta etapa **não** implementam RPC real, alteração de `factionPayments`, pagamentos ou feature flags operacionais.

## Etapa atual — Simulador de cálculos de acertos e recebimentos

- `motor-calculos-demonstracao.js`: motor de cálculo puro, com validação por centavos e proteção de compensações, sem qualquer gravação.
- `acertos-simulador.html`: laboratório **offline e mobile** para dois fluxos diferentes: acertos de facções e recebimentos parciais de notas/pedidos.
- `tests/motor-calculos.cjs` e `tests/acertos-simulador-mobile.cjs`: cenários monetários, rejeições de valores inválidos, isolamentos e cinco larguras em Chromium/WebKit.
- `SIMULADOR-ACERTOS.md`: matemática, limites, exemplos e diferenças com o código antigo a decidir antes de uma eventual integração.
- A simulação não cria pagamentos, não grava comprovantes, não consulta o banco e não marca nenhuma função como homologada.

## Etapa: preservação das funções antigas (preparação de homologação)

**Objetivo:** evitar que a modernização remova recursos já entregues.

- `paridade-funcional.json` registra **76 funcionalidades preliminares** distribuídas nas 19 áreas; cada uma inclui fonte de código, teste legado quando existe, prioridade e estado `nao_verificada`.
- `arquivos-legados-baseline.json` registra o hash dos **229 arquivos fundamentais ou scripts `release-`** do commit-base, para detectar qualquer modificação não revisada.
- `preservacao.html` é uma tela **independente, mobile-friendly e offline** para buscar e separar visualmente funções para revisão. Nenhuma marcação salva, homologa ou autoriza exclusão.
- `tests/preservacao-contract.cjs` valida o inventário e o isolamento; `tests/baseline-legado.cjs` compara hashes; `tests/preservacao-mobile.cjs` cobre Chromium e WebKit em cinco larguras.

**Limite:** inventariar 76 funções e proteger hashes de código **não demonstra** que todas as funções antigas estejam operacionais ou tenham equivalência em um módulo novo. É um bloqueio inicial contra exclusão involuntária, não uma certificação de paridade.

A aprovação de substituição exige testes de funcionalidades antigas e novas lado a lado, integridade financeira e WAL, critérios de mobile, homologação humana e autorização explícita para a operação atual.

## Etapa atual — contratos e fluxos operacionais (em preparação para testes)

- `contratos-modulares.json`: proposta de 19 contratos de módulos, políticas de ativação e 7 portões de homologação, **não implementados no HLGB atual**.
- `CONTRATOS-MODULARES.md`: desenho de salvamento por comando, transação única, concorrência, critérios mobile e fronteiras do Bot/Auditor.
- `fluxos-operacionais.html`: **laboratório independente** de pesquisa de produtos, acertos e relatórios em layouts responsivos, com exemplos **inteiramente fictícios**, sem gravação.
- `tests/fluxos-contract.cjs` e `tests/fluxos-mobile.cjs`: novos contratos e cenários para verificar pesquisa, cálculos fictícios, filtros, segurança e cinco tamanhos de tela em Chromium e WebKit.
- Cada alteração na versão real continua proibida até validação completa e aprovação explícita.

**Atenção:** os contratos e exemplos não comprovam funcionamento do backend. O botão Salvar foi intencionalmente desabilitado nos acertos para não sugerir gravação sem transação comprovada.

## O que existe nesta primeira entrega

1. `roadmap.json`: registro inicial de **266 itens** do plano mestre, divididos em 13 frentes; inventário inicial de **19 áreas/módulos** a validar.
2. `mapa-dependencias.json`: **25 ligações** entre os módulos (11 encontradas em referências explícitas do código e 14 propostas a validar), incluindo **8 pontos de salvamento de maior risco** e referências a arquivos/linhas. Levantamento estático; não é auditoria funcional.
3. `prototipo.html`: interface standalone para desktop e mobile, incluindo:
   - resumo das frentes e situação de homologação;
   - busca e filtro de módulos;
   - mapa de dependências interativo no desktop e celular, evidências e riscos de gravação;
   - simulação de ativação/desativação (somente em memória; núcleo sensível protegido);
   - laboratório mobile por tipo de funcionário;
   - formulário de solicitação de melhoria **sem enviar e sem salvar**;
   - modelos fictícios de incidentes e critérios para Auditor/Bot 2.0.
4. `tests/standalone-contract.cjs`: testes estáticos de isolamento, segurança, integridade da lista e responsividade.

## Observações e limitações

- A existência de um arquivo no repositório não comprova que a função correspondente esteja homologada, com integração correta ou operacional em duas sessões.
- As áreas estão em **inventário preliminar**; o mapa de responsáveis por gravação, telas e dependências ainda exige revisão detalhada. As 14 arestas com status `proposto-a-validar` são hipóteses, não fatos comprovados.
- Os indicadores do protótipo são **demonstrativos**, não métricas de produção; incidentes exibidos são fictícios.
- O protótipo não é um gerenciador real de módulos e não opera feature flags em produção.
- O botão de solicitar melhoria não armazena solicitações, por design. O armazenamento só deverá ser implementado em ambiente de teste isolado, com permissões e autorização.

## Critérios para considerar uma melhoria pronta

1. Responsabilidade única de dados, documentação de módulo e dependências.
2. Testes unitários, integração, segurança e regressão.
3. Verificação de UX **desktop e mobile** no fluxo real da função.
4. Testes Chrome, Safari e duas sessões, sempre que houver gravação ou sincronização.
5. Validação de salvamento com ACK e releitura; proteção contra duplicidade e conflito.
6. Evidência de reversão segura e integridade de dados existentes.
7. Homologação com funcionário, revisão do Auditor e **autorização explícita de publicação**.
8. Resumo enviado após cada melhoria: concluído, testes, limitações e todas as frentes pendentes.

## Próximos trabalhos

- Completar mapa de dependências e operações de escrita **sem alterar o programa atual**.
- Elaborar o layout padrão de tabelas, pesquisa de produtos, relatórios e formulários.
- Detalhar contratos modulares e desenhar integração segura com o núcleo canônico.
- Preparar testes de mobile e usabilidade com cenários fictícios.
- Só depois estudar integração experimental com ambiente e dados isolados, sem publicar no `main`.

**Este repositório não ganhou uma aba ativa do HLGB nesta etapa. A tela existente continua inalterada.**
