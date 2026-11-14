# HLGB Evolução — Laboratório independente (Etapa 1)

Esta pasta é um **protótipo isolado**: não é uma tela incorporada ao HLGB em produção.

## Garantias

- Os arquivos da pasta **não são carregados** por `index.html`, `app-stable3.html` nem `app9240.html`.
- Não há código Supabase, autenticação da aplicação, chamadas HTTP, IndexedDB, WAL, cookies, localStorage nem service workers.
- Interações do protótipo são **simulações em memória**, sem gravar, editar ou excluir lançamentos.
- Nenhuma alteração no `main`, publicação GitHub Pages ou mudança de banco é autorizada nesta etapa.
- Mudanças futuras devem ser validadas por testes técnicos e pelos funcionários, com suporte a iPhone Safari e Android Chrome.
- **Aprovação explícita** será necessária para integrar qualquer alteração na operação atual.

## O que existe nesta primeira entrega

1. `roadmap.json`: registro inicial de **266 itens** do plano mestre, divididos em 13 frentes; inventário inicial de **19 áreas/módulos** a validar.
2. `prototipo.html`: interface standalone para desktop e mobile, incluindo:
   - resumo das frentes e situação de homologação;
   - busca e filtro de módulos;
   - simulação de ativação/desativação (somente em memória; núcleo sensível protegido);
   - laboratório mobile por tipo de funcionário;
   - formulário de solicitação de melhoria **sem enviar e sem salvar**;
   - modelos fictícios de incidentes e critérios para Auditor/Bot 2.0.
3. `tests/standalone-contract.cjs`: testes estáticos de isolamento, segurança, integridade da lista e responsividade.

## Observações e limitações

- A existência de um arquivo no repositório não comprova que a função correspondente esteja homologada, com integração correta ou operacional em duas sessões.
- As áreas estão em **inventário preliminar**; o mapa de responsáveis por gravação, telas e dependências ainda exige revisão detalhada.
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
