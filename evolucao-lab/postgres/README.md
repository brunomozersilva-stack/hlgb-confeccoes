# HLGB Evolução — PostgreSQL transacional em banco descartável

**Somente CI de laboratório.** Estes arquivos não são migrations oficiais do Supabase nem alterações destinadas ao projeto HLGB em produção.

## Proteções de isolamento

1. A execução do SQL é bloqueada quando o banco **não** se chama `hlgb_evolucao_lab`. O workflow cria esse banco temporário como um contêiner descartável `postgres:16`, com credenciais fictícias e sem qualquer segredo da empresa.
2. Todos os objetos ficam no schema privado `evolucao_lab`. Não é o schema `public` nem corresponde às tabelas reais `factionPayments`, `hubFinance` ou equivalentes.
3. Todos os objetos foram desenhados para **RLS habilitado e forçado**, sem políticas liberadas e sem `GRANT` para `PUBLIC`, `anon` ou `authenticated`. Uma função `SECURITY INVOKER` em schema privado executa como seu usuário. **Os testes são executados como proprietário do banco apenas no CI; eles não provam a autorização real de usuários HLGB.**
4. Não há ambiente, host, token, URL ou chave do Supabase de produção no workflow. Não se utiliza o conector do banco real.
5. A única diferença da arquitetura anterior é que agora as transações são executadas por um **PostgreSQL de verdade, mas totalmente separado e descartável**.

## Arquivos

- `01-schema-local.sql`: schema privado, tabelas de grupos, linhas, ajustes, compensações, histórico, metadados de comprovantes, Hub, comandos idempotentes e eventos; funções `compensate` e `pay`.
- `02-fixtures-local.sql`: acertos, facções, valores e comprovantes inteiramente fictícios.
- `../tests/postgres-integration.cjs`: cenários reais de transação, rollback, idempotência, concorrência de duas conexões, segurança de acesso e releitura do resultado.
- `../../.github/workflows/evolucao-postgres-isolado.yml`: inicializa banco descartável, aplica o SQL e executa os testes. Não possui deploy, integração com a empresa nem permissão de escrita no repositório.

## O que os testes devem comprovar

| Cenário | Condição de aprovação |
|---|---|
| Compensação da mesma facção | Revisão de origem e destino, saldo de crédito e histórico confirmados no mesmo commit |
| Repetir o mesmo comando | Não gera duplicidade; mesmo ID com corpo diferente é rejeitado |
| Revisão antiga | Rejeitada sem sobrescrever outro funcionário |
| Falha na inclusão de comprovante | Todas as alterações no pagamento, linhas e Hub sofrem rollback |
| Falha após commit e sem ACK | Identificador recupera resultado persistido em `commands` e no Hub |
| Duas sessões pagam ao mesmo tempo | Apenas uma conclui; a segunda não duplica |
| Duas sessões tentam usar o mesmo crédito | Apenas uma pode gastar o saldo disponível |
| Sem acesso às tabelas pelo papel de prova | Schema inacessível e RLS ativo |

## Limites técnicos e decisões pendentes

- **Não é uma cópia do esquema do Supabase HLGB.** O desenho usa entidades fictícias e a função de pagamento simples, insuficiente para adoção real.
- O contêiner de PostgreSQL simula concorrência, mas **não** testes Safari ↔ Chrome com WAL, sessões autenticadas reais, permissões RLS vinculadas ao Supabase Auth, Storage ou anexos de verdade.
- O registro de comprovante armazena **somente metadados**: nenhuma mídia é transmitida.
- As funções de laboratório recebem `actor` explícito para facilitar testes. Isso **não serve para produção**: no sistema real, a identidade e a permissão devem ser validadas a partir de uma sessão confiável, nunca de parâmetro fornecido pelo navegador.
- Os pagamentos reais precisam de uma revisão mais ampla dos contratos, regras legadas, cancelamentos, ajustes, transações, rotina de reconciliação, idempotência e plano de recuperação da WAL antes da integração.
- Uma operação que já foi confirmada e não recebeu ACK não deve sofrer reenvio cego. Somente a confirmação por idempotência e releitura permitirá continuação segura.

**Nenhum dos 266 itens do Plano Mestre foi homologado para produção.**

## Fontes de referência técnica

- PostgreSQL: locking e isolamento de linha — https://www.postgresql.org/docs/current/explicit-locking.html
- Supabase: segurança de Data API, grants e RLS — https://supabase.com/docs/guides/database/postgres/row-level-security

## Próxima etapa após resultados satisfatórios

- Definir a autenticação/autorização por papel e empresa no contrato, sem usar IDs confiados ao cliente.
- Elaborar suíte de permissões `anon/authenticated` em ambiente exclusivo de teste.
- Mapear comprovantes, recálculo de acertos e conflitos com WAL sem tocar nos registros operacionais.
- Testes multiusuário integrados em ambiente de homologação independente, mobile e desktop, com aprovação explícita antes de qualquer publicação.
