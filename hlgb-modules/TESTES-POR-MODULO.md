# HLGB comercial — testes rápidos por módulo (v96.01)

Esta etapa permite descobrir **qual área é responsável por um erro** e executar suas provas de regressão, sem modificar ou consultar os dados comerciais. Os testes são executados localmente pelo GitHub Actions com dados fictícios e simulações, um processo isolado para cada teste.

## Como trabalhar
- `node hlgb-modules/run-module-tests-v9601.cjs --list`: áreas que possuem pacotes rápidos.
- `node hlgb-modules/run-module-tests-v9601.cjs --impact release-cutter-planner.js`: apresenta **Corte/Cortadores + Sincronização/WAL**, porque salvar o Corte também depende da persistência.
- `node hlgb-modules/run-module-tests-v9601.cjs corte-cortadores`: executa apenas os testes próprios da área.
- `node hlgb-modules/run-module-tests-v9601.cjs --all`: executa todos os pacotes com cobertura rápida.
- `node hlgb-modules/run-module-tests-v9601.cjs --impact app9240.html`: **alto risco**, exige regressão completa.

## Pacotes já preparados
| Módulo | Quantidade de testes |
|---|---:|
| Corte/Cortadores | 9 |
| Pedidos/Projeção | 4 |
| Facções/Acertos | 6 |
| Financeiro/Hub/Notas | 5 |
| Folha/Pessoal | 4 |
| Utilidades/Etiquetas | 3 |
| Sincronização/WAL | 5 |
| Auditor/Monitor | 4 |

**Total: 40 testes distribuídos por oito áreas.** Os demais seis domínios do mapa original permanecem sob a regressão geral, até termos testes específicos próprios.

### Compromissos de preservação
1. Um teste rápido **não libera sozinho** uma publicação. Deve passar também a regressão geral, validação de abertura Safari/Chrome, evidência de gravação remota e — quando relevante — duas sessões sincronizadas.
2. `app9240.html`, inicialização, recuperação WAL e registro/salvamento são classificados como **alto risco**. Não desativar testes de outros domínios.
3. Nenhuma função comercial foi removida ou alterada nesta etapa. O catálogo somente organiza verificações.
4. Não acessar Supabase real, não apagar IndexedDB, não repetir lançamentos incertos e não substituir dados reais por fixtures.
5. Antes de extrair um trecho do monólito, apresentar o nome dos métodos, dependências globais, testes equivalentes e um plano de rollback. **A extração física ainda está pendente.**

O workflow `HLGB Domain Smoke Tests v96.01` detecta os arquivos modificados na PR e executa os pacotes das áreas afetadas **incluindo todas as dependências transitivas**. Alterações no carregador, testes, contratos ou código ainda não catalogado executam os oito pacotes (falha fechada). Para executar uma área isolada manualmente, use `workflow_dispatch`. A regressão geral, os testes reais de navegador e a comprovação de gravação permanecem gates independentes. As listas são auditadas em `tests/module-test-catalog-v9601.cjs`.
