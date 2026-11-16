# HLGB Evolução — teste de persistência real, SOMENTE banco descartável

Este laboratório já **usa um PostgreSQL real** em um contêiner temporário do GitHub Actions, com os navegadores Chromium e WebKit/Safari. É **diferente** da página estática de duas sessões: os comandos desta etapa são efetivamente gravados no banco temporário. A etapa **não instala, não publica e não corrige** a sincronização do HLGB de produção.

## Isolamento obrigatório

- Banco exato: `hlgb_sync_persist_lab`. O SQL contém guarda que aborta em qualquer outro banco. O servidor verifica `PGDATABASE` e `PGHOST=127.0.0.1` e abre apenas na interface local. Não usa endpoints, chaves ou credenciais da empresa.
- Schema `sync_lab`, com três tabelas fictícias (`records`, `commands`, `events`), RLS habilitado/forçado e permissões públicas revogadas. O serviço usa o usuário privilegiado **apenas no contêiner de CI**, portanto **não comprova a política de autorização real do sistema**.
- Sessões A e B acessam por contextos de navegador independentes, cookies `HttpOnly`, PINs de exemplo visíveis na própria página. **Não é autenticação empresarial**.
- Nenhuma gravação de pagamento, encomenda, facção ou folha reais. Nenhum arquivo de produção é alterado.
- Apenas portas no `127.0.0.1`; CSRF limitado por cabeçalhos `Origin` e `x-hlgb-lab-request` e `SameSite=Strict`.

## Comportamentos testados

1. **Transação Postgres:** atualizar valor e revisão + gravar comando e evento no mesmo `COMMIT`. Falha/concorrência não deixa estado parcialmente salvo.
2. **Idempotência por ID:** um reenvio com o mesmo conteúdo devolve o primeiro resultado; mesmo ID com payload alterado é rejeitado.
3. **Duas sessões reais de navegador:** sessão A grava; sessão B tenta atualizar a revisão antiga e recebe conflito. O rascunho B permanece até a revisão manual.
4. **ACK perdido após commit:** a interface não mostra “salvo” imediatamente. O comando fica no IndexedDB e só é liberado após `GET /api/commands/<id>` comprovar o evento persistido.
5. **Rede desconectada:** pedido imutável é gravado no WAL IndexedDB **antes** do envio; falha mantém ID local após recarregar. O reenvio é manual, após releitura `not_found`.
6. **Servidor reiniciado:** teste encerra Node, inicia um novo processo lógico na mesma porta de localhost com o mesmo PostgreSQL e verifica a revisão gravada e o ID recuperado pelo browser.
7. **Corrida com duas conexões:** duas alterações com revisão 1 não podem confirmar simultaneamente; exatamente uma é aplicada e outra conflita.
8. **Sem autorização real:** usar um PIN de exemplo aqui não concede acesso ao HLGB. Não executar em ambientes compartilhados.

## Onde conferir

GitHub Actions: workflow `HLGB Evolucao - Sync Persistente em PostgreSQL Descartavel`, arquivo `.github/workflows/evolucao-sync-persistente.yml`.

São executados dois conjuntos Chromium/WebKit, cada um com um contêiner independente do PostgreSQL. Capturas e um JSON **inteiramente fictício** são anexados aos resultados.

## Uso manual opcional — apenas em ambiente descartável

Exige Node.js 22, PostgreSQL 16, `pg` e Playwright. **Não execute esses passos no servidor da confecção.** No computador isolado:

1. Suba um contêiner PostgreSQL 16 com nome de banco `hlgb_sync_persist_lab` e senha exclusiva de teste, com a porta acessível somente por `127.0.0.1`.
2. Configure `PGHOST=127.0.0.1`, `PGPORT`, `PGUSER`, `PGPASSWORD` e `PGDATABASE=hlgb_sync_persist_lab`.
3. Aplique `01-schema-local.sql` com `psql -v ON_ERROR_STOP=1 -f ...`. A guarda SQL aborta se o nome do banco não corresponder.
4. Execute `node evolucao-lab/sync-persistente/server.cjs` e abra **apenas** a URL `http://127.0.0.1:<porta>` que aparecer no terminal. Utilize os PINs fictícios `demo-session-a` e `demo-session-b` em dois perfis de navegador separados.
5. Descarte **completamente o contêiner e o perfil do navegador** ao final. Esse banco não guarda dados úteis.

## O que ainda falta para o HLGB real

Isto prova apenas os **contratos de salvamento do protótipo** em banco de teste; não prova paridade funcional das 76 funções.

Faltam mapeamento das tabelas legadas, preservação de IDs, migrações verificadas, permissões reais por usuário, trilhas de auditoria, tratamento de WAL existente nos aparelhos, provas entre Safari e Chrome no ambiente empresarial, PDFs privados, backups e testes de restauração, monitoramento, além de autorização explícita antes da implantação.

**Não executar o SQL no Supabase da produção. Não mesclar em `main` sem aprovação.**
