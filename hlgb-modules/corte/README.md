# HLGB comercial — Corte/Cortadores: extrações pequenas e reversíveis

**Estado: branches de homologação / PRs em rascunho, nunca migrar dados reais sem gates.**

## Core de grade por modelo (v96.02)
- `grade-modelo-v9602.js`: `modelGrade`, `modelPieces`, `modelIds`.
- O `release-cutter-planner.js` delega cálculos puros se o módulo estiver carregado e usa o cálculo anterior como fallback. A gravação, a releitura remota e a identidade dos cortes continuam na implementação atual.
- `tests/cutter-grade-pure-v9602.cjs` compara a paridade; `tests/cutter-stacked-save-proof-v9603.cjs` prova a confirmação remota simulada e o risco de ACK perdido.

## Core de folha impressa (v96.04)
- `folha-grade-materiais-v9604.js`: `gradeOf` e `planMaterials` sem DOM, Supabase, IndexedDB, impressão ou WAL.
- `release-cutter-sheet-materials-v9523.js` só delega esses dois cálculos quando a biblioteca está presente; se não carregar, executa exatamente o código original.
- A busca de material é recebida por callback **somente de leitura**; a fonte dos dados, formulário A4, paginação, assinaturas, impressão e campos permanecem como antes.
- `tests/cutter-sheet-core-v9604.cjs` valida a seleção de grade, consumo/rendimento/perda, catálogo, HTML integral da folha, impressão por corte/pedido e ausência de alterações de dados; preserva os testes legados de folha e pesagem.

## Núcleo de peso com releitura e recuperação (v96.05) — ainda NÃO incluído na PR #264
- `peso-core-v9605.js` extrai validação numérica e comparação conservadora da versão remota do corte; sem acesso a banco, rede, DOM, login ou WAL.
- `release-cut-weight-v9579.js` mantém seu formulário e o fallback de validação, mas exige releitura remota **antes** da gravação. Uma alteração em outra sessão bloqueia a escrita e evita sobrescrita silenciosa do histórico.
- Após um ACK perdido, o rascunho incerto mantém o mesmo `eventId` e `cutId` em memória; uma nova tentativa primeiro confere se o servidor já gravou. Se já gravou, recupera **sem segunda escrita**. Se não gravou e a versão antiga continua exatamente igual, reenvia o mesmo evento.
- Uma nova pesagem com valores diferentes é bloqueada enquanto a tentativa anterior estiver incerta; a fila WAL permanece protegida. Nenhuma tentativa apaga histórico ou força atualização do banco.
- **Limitação após recarga:** o rascunho em memória desaparece; a comparação remota com o corte local impede sobrescrever a pesagem anterior, mas a pessoa precisa sincronizar/reabrir o registro para prosseguir.
- Testes próprios: `tests/cutter-weight-ack-core-v9605.cjs`, `tests/cut-weight-after-finish-v9579.cjs` e workflow `HLGB Cutter Weight ACK Proof v96.05`. CI e Safari/Chrome ainda obrigatórios.

## Contrato da integração empilhada
1. O carregador conserva os **mesmos 156 scripts antigos, na mesma ordem**, e introduz exatamente três scripts puros imediatamente antes de seus consumidores, total 159 scripts.
2. `hlgb-modules/ownership-v9600.json` guarda os SHAs anteriores e posteriores das três implementações antigas deliberadamente alteradas: Cortador, folha de impressão e pesagem. As demais assinaturas críticas não podem mudar.
3. Não remover os fallbacks, trocar IDs, alterar schema, configurar outro login, apagar pendências WAL, migrar dados ou publicar a `main` nesta etapa.
4. A PR #263 depende da #262, que depende da #260. A PR #261 original é apenas referência de extração isolada.
5. A publicação exige CI verde, regressão geral, Chrome e Safari, testes visuais A4, gravação com ACK + leitura remota, sincronização entre duas sessões e verificação de WAL sem perda.

## Próximos componentes, ainda NÃO extraídos
- Programação/salvamento do Corte, contratos de edição e reabertura.
- Pesagem: a validação e a recuperação de confirmação foram extraídas, mas o registro completo e o histórico seguem no módulo legado; aproveitamento de materiais e separação posterior ainda pendentes.
- Integração com Produção/Facções, incluindo fila e rastreabilidade.

O módulo v96.04 é **somente cálculo / leitura**: imprimir não marca como cortado, não altera estoque nem histórico e não registra movimentação comercial.
