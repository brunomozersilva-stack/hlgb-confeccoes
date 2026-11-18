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

## Contrato da integração empilhada
1. O carregador conserva os **mesmos 156 scripts antigos, na mesma ordem**, e introduz exatamente dois scripts puros imediatamente antes de seus consumidores, total 158 scripts.
2. `hlgb-modules/ownership-v9600.json` guarda os SHAs anteriores e posteriores das duas únicas implementações antigas deliberadamente alteradas: Cortador e folha de impressão. As demais assinaturas críticas não podem mudar.
3. Não remover os fallbacks, trocar IDs, alterar schema, configurar outro login, apagar pendências WAL, migrar dados ou publicar a `main` nesta etapa.
4. A PR #263 depende da #262, que depende da #260. A PR #261 original é apenas referência de extração isolada.
5. A publicação exige CI verde, regressão geral, Chrome e Safari, testes visuais A4, gravação com ACK + leitura remota, sincronização entre duas sessões e verificação de WAL sem perda.

## Próximos componentes, ainda NÃO extraídos
- Programação/salvamento do Corte, contratos de edição e reabertura.
- Pesagem, histórico de peso, aproveitamento de materiais e separação posterior.
- Integração com Produção/Facções, incluindo fila e rastreabilidade.

O módulo v96.04 é **somente cálculo / leitura**: imprimir não marca como cortado, não altera estoque nem histórico e não registra movimentação comercial.
