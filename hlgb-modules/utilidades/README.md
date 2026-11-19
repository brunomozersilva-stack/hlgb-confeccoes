# HLGB comercial — primeiro núcleo isolado de Utilidades/Etiquetas (v96.02b)

**Origem:** código do HLGB já em uso, na `main` de `brunomozersilva-stack/hlgb-confeccoes`. Não é a Evolução HLGB.

## O que foi fisicamente separado
- `etiquetas-layout-v9602b.js`: `labelSize(mode)` e `labelBody(label,tag)` extraídas do script comercial `release-label-destination-v9310.js`.
- Funções **puras**, sem banco, Supabase, IndexedDB/WAL, DOM, login, rede ou impressão.
- `release-label-destination-v9310.js` ainda tem os códigos originais dessas funções como fallback. Se o novo script faltar, os campos **destino**, **data opcional**, **quantidade de cópias**, **modelo**, **tamanho**, **volume** e **impressão** continuam no comportamento anterior.
- A ordem dos **156 scripts comerciais originais** é a mesma; um único módulo puro entra imediatamente antes do script que o utiliza (157 no total).
- `app9240.html` e todos os demais scripts comerciais permanecem intactos. Esta extração **não finaliza o módulo Utilidades/Etiquetas** nem remove todas as suas dependências com o monólito.

## Testes sem dados comerciais
- `tests/hlgb-live-label-layout-v9602b.cjs`: paridade exata do HTML A4 com/sem módulo, prévia, tamanhos pequeno/médio/grande, escape HTML, destino e data, múltiplas páginas e invariância dos dados de teste.
- `tests/etiquetas-a4-batch-v9454.cjs`: etiquetas de vários volumes e modelos numa mesma folha.
- `tests/hlgb-module-boundaries-v9600.cjs`: verifica **mesmos 156 scripts na mesma ordem**, sem duplicação, SHA dos arquivos críticos da `main` e alteração deliberada somente do consumidor de etiquetas.
- Workflow `HLGB Comercial - Etiquetas Modulo Compativel v96.02b` e testes por todos os 14 domínios são portões adicionais.

## Falta para aprovar este núcleo
- GitHub Actions concluir com sucesso (não basta `queued`).
- Testar visualmente impressão em A4 e formulário em Safari e Chrome, incluindo 10 etiquetas por folha, diversos volumes e sem mostrar a data quando desmarcada.
- Verificar em ambiente de homologação que o carregamento não perde o botão de impressão nem a impressão de lotes.
- Confirmar que nenhuma outra função do `app9240.html` ou `release-operations-pack.js` está substituindo o mesmo handler em ordem incompatível.
- Não publicar automaticamente; merge na `main` apenas após autorização explícita.

## Próxima separação
Inventariar o módulo completo de Utilidades, distinguir responsabilidades dos três scripts existentes (`release-operations-pack.js`, `release-label-typography-v9308.js`, `release-label-destination-v9310.js`) e da tela principal, sem eliminar rotas ou etiquetas existentes.
