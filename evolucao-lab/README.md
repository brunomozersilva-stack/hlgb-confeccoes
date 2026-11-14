# HLGB Evolução — Laboratório independente (Etapa 1)

Esta pasta é um **protótipo isolado**: não é uma tela incorporada ao HLGB em produção.

## Garantias

- Os arquivos da pasta **não são carregados** por `index.html`, `app-stable3.html` nem `app9240.html`.
- Não há código Supabase, autenticação da aplicação, chamadas HTTP, IndexedDB, WAL, cookies, localStorage nem service workers.
- Interações do protótipo são **simulações em memória**, sem gravar, editar ou excluir lançamentos.
- Nenhuma alteração no `main`, publicação GitHub Pages ou mudança de banco é autorizada nesta etapa.
- Mudanças futuras devem ser validadas por testes técnicos e pelos funcionários, com suporte a iPhone Safari e Android Chrome.
- **Aprovação explícita** será necessária para integrar qualquer alteração na operação atual.

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
