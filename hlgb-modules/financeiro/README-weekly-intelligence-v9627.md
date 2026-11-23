# F1/F2 — Inteligência financeira semanal (somente núcleo)

Ref #304, #280. Base comercial main 17ccdbd43203afc282c0778b0df17396d07663bf.

## Inventário confirmado no código
- `release-hub-period-summary.js` lê `db.hubFinanceEntries`, usa `hlgbHubPayrollPaidDate9515.rows` quando disponível, filtra `hub_settings`, agrupa `flow`, `status`, `category`, `date`, `value`.
- `release-hub-payroll-paid-date-v9515.js` substitui consolidados mensais apenas quando a folha paga tem prova de `paidAt` e `paidValue`, preservando o original quando incompleta. A vista sintética tem IDs negativos e `realizedAt`; várias datas na mesma competência são distintas.
- `release-hub-week-unified-v9317.js` mantém `hubFinanceWeek` como semana canônica (segunda a domingo).
- `release-hub-save-proof-v9567.js` exige ACK/releitura para confirmar salvamento; o núcleo não interpreta uma fila local como dado confirmado.

## Contrato e limites
O núcleo CJS compara saídas realizadas (data efetiva `realizedAt`, não data prevista) e total da semana alvo (pago + previsto) por categoria, em centavos, com 8/12/26 semanas anteriores fechadas. Não interpreta ausência de linha como zero sem prova externa de cobertura integral. Sem `snapshotVerified`, `targetVerified` e todas as semanas verificadas, não publica mediana, média, faixa ou recomendação. Registros inválidos, pendências identificadas, duplicatas de ID/origem e valores históricos ainda previstos bloqueiam a comparação afetada; totais parciais são apenas observações. Duplicatas de origem podem incluir casos legítimos de parcelamento: exigem resolução no adaptador, nunca exclusão no banco. O adaptador precisa fornecer IDs WAL pendentes, resolver origens/splits e validar permissões e cobertura; ainda não existe. Não é fluxo de caixa nem lucro, não calcula saúde da firma, nem compara previsão histórica com realizado sem snapshots históricos. Não tem interface, loader, Supabase, DOM, armazenamento, automação, pagamentos ou mutações. Nenhum dado real foi usado.

## Próximo gate
Mapear `realizedAt` e status do código de criação/edição, confirmar evidências de cobertura e conciliação, separar gastos pessoais/transferências, definir adaptação da folha e revisão de registros arquivados. Só depois criar tela mobile read-only e validar regressões do Hub/Safari. Corte Conjunto permanece #277 e terá PR separada.
