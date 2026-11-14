# Regra obrigatória: nenhuma função do HLGB pode desaparecer silenciosamente

Esta regra vale para **qualquer proposta de modularização ou integração futura**.

## Garantias que ainda PRECISAM ser comprovadas (não estão implementadas)

1. Identificar todas as funcionalidades atuais com sua tela, botão, formulário, filtro, cálculo, relatório e fluxo.
2. Documentar a situação atual, inclusive funcionalidades que hoje apresentam falhas, antes de substituí-las.
3. Construir uma matriz de equivalência **antes/depois**, com cenário, entradas, saídas e evidências.
4. Exigir que cada recurso da versão nova tenha o mesmo comportamento necessário ou uma alternativa expressamente aceita pela usuária.
5. Tratar funcionalidades abandonadas deliberadamente como decisão documentada **com autorização explícita**, jamais como perda silenciosa.
6. Preservar registros já existentes, histórico, arquivos anexados, operações financeiras e filas pendentes.
7. Tratar compatibilidade de banco e WAL como condição de entrada para qualquer migração.
8. Testar em desktop e mobile (WebKit/Safari e Chromium/Chrome) com navegação real por funcionários.
9. Testar cenários de concorrência em duas sessões antes de mexer em dados compartilhados.
10. Possuir procedimento comprovado de retorno à versão compatível. Para mudanças de dados, plano específico de recuperação e migração.
11. Fazer integração e publicação somente após aprovação humana explícita. **Nenhum teste automático equivale a essa autorização.**

## Ferramentas já criadas no laboratório

- `paridade-funcional.json`: inventário inicial de **76 funções**, com `parity=nao_verificada` e `approvedForRemoval=false`.
- `arquivos-legados-baseline.json`: hashes de **229 arquivos legados**, referentes a um commit-base específico.
- `preservacao.html`: filtro visual por módulo e prioridade, sem persistência ou aprovação real.
- `tests/preservacao-contract.cjs`, `tests/baseline-legado.cjs` e `tests/preservacao-mobile.cjs`: checagens de inventário, integridade e usabilidade do protótipo.

**Atenção:** o inventário cobre uma primeira amostra dos módulos. Ele NÃO pretende afirmar que só existem 76 funcionalidades no HLGB, nem que todas estão funcionando. Antes de uma migração, o levantamento deve ser exaustivo por módulo, inclusive das funcionalidades dentro de `app9240.html` e de componentes herdados.

## Relatório obrigatório após cada entrega

- Mudança feita, arquivos afetados e branch.
- Segurança: integridade de dados, gravações, permissões e autorização.
- Testes: passou, falhou, pendente, limitações.
- Funcionalidades antigas: preservadas por evidência, não verificadas ou afetadas.
- Desktop e mobile: resultados e pendências.
- Quadro de todas as frentes do Plano Mestre ainda sem homologação.
