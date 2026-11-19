# HLGB comercial — Produção e Separação, extração segura v96.03b

**Origem:** `release-separation-commit-v9319.js` da branch `main` do HLGB comercial, não o projeto Evolução HLGB.

## Extraído fisicamente nesta etapa
- `separacao-progresso-v9603b.js` contém os cálculos puros `progress(separation,productId)` e `totalsForItems(items,separation)`.
- Preserva os modelos com identificadores legados (chaves `prefixo:produto`), quantidades numéricas e convertidas de texto, limitando a quantidade concluída à quantidade planejada tal como o código anterior.
- O script `release-separation-commit-v9319.js` delega apenas os cálculos ao núcleo puro. Os métodos originais permanecem no mesmo arquivo como **fallback**.
- A relação pedido/modelo (`itemsFor`), geração e atualização da separação (`ensureSep`), **baixa parcial**, conclusão, histórico e mudança de status do pedido continuam exatamente no código atual.

## Não alterado
- **Gravações:** `saveRecord`, `confirmExisting`, `directApply`, `directMark`, `saveCompletedOrder`, retorno de ACK, atualização local, tratamento de baixa pendente e recuperação.
- **Dados:** estrutura dos registros, Supabase, ID de separação, WAL/IndexedDB, estoque, reabertura, login, histórico de baixa e sincronização.
- **Inicialização:** 156 scripts comerciais originais permanecem na sequência exata, com 2 funções auxiliares novas carregadas imediatamente antes de seus consumidores (158 scripts totais no candidato).
- **Arquivo principal:** `app9240.html` não foi modificado ou dividido nesta etapa.

## Provas
- `tests/hlgb-live-separation-progress-v9603b.cjs` compara núcleo e fallback em 60 totais e 120 recuperações de progresso por produto; valida os handlers atuais e verifica a reconstrução exata da fonte principal após remover somente as três linhas de delegação.
- Contrato de loader guarda 156 scripts comerciais originais e o SHA dos arquivos críticos; duas alterações em scripts legados devem permanecer explícitas no manifesto.
- `HLGB Comercial - Separacao Progresso Puro v96.03b`, testes herdados e regressão geral precisam concluir como `success`.

## Por que o módulo ainda NÃO está pronto
- Extraímos apenas dois cálculos, **não** as funções de gravação, formulários de separação nem o fluxo completo de Produção.
- Falta homologação de baixa parcial/total em sessão de testes, Safari, Chrome e sincronização entre duas sessões, conferindo ACK + releitura remota.
- Antes de qualquer merge na `main`, é indispensável verificar que novos scripts, ordens de carga e fallbacks não eliminam funções dos funcionários e obter aprovação explícita.

**Não publicar ou alterar o banco comercial nesta PR.**
