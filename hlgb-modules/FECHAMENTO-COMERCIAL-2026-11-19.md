# HLGB comercial — candidata ÚNICA de homologação (19/11/2026)

## Entrega possível hoje — sem prometer extração completa do monólito

Esta é a branch de consolidação do **HLGB que a equipe usa**, derivada da `main` no commit `7c66a37ea04b7bf6b130b28b17cf194941023251`, e **não** da Evolução HLGB. A alteração não toca o banco de dados dos funcionários, não roda migração e não muda a `main`.

A candidata reúne as PRs anteriores da trilha comercial (#260, #266, #267, #268, #269 e #270), sem exigir seis merges separados.

## O que está realmente preparado

1. Os **156 scripts comerciais originais** continuam na mesma ordem, em 16 grupos de inicialização com responsabilidades distribuídas em 14 domínios.
2. Três núcleos pequenos foram isolados com fallback explícito: impressão de Etiquetas A4, cálculos de progresso da Separação e seleção do Corte após Separação. Isso totaliza **159 scripts** no carregador candidato.
3. O catálogo dos 14 domínios reúne **68 entradas de testes** para regressão; existe compatibilidade de leitura dos testes históricos que agora usam a ordem real do carregador.
4. O `app9240.html` original agora contém **91 blocos inline e 1 bloco físico externo**; um deles tem cerca de 787 mil caracteres. A candidata v96.07 usa SHA Git `c490f8854a0aeadf460d3cc5592e0ec6d4da543e`; a `main` continua intacta e o HTML anterior pode ser reconstruído byte a byte (SHA `db896b5fbf85392be5711ae1c44b3bf245893be4`).
5. O inventário `main-inline-boundaries-v9606.cjs` identifica por bloco ordem, linha, funções, atribuições globais, áreas candidatas, dependências potenciais de gravação/WAL e assinatura SHA-256, sem executar código, consultar Supabase ou exportar dados comerciais.
6. O workflow de homologação anexa o mapa como artefato `hlgb-main-inline-map-v9606` para orientar futuras correções sem misturar as funções.

**Não é correto marcar os 14 domínios como fisicamente modularizados.** Somente um dos 92 blocos do `app9240.html` foi separado; separar de uma vez o bloco principal poderia afetar login, salvamento ou sincronização. Os 14 domínios estão **mapeados e testáveis**, não prontos para mudanças irrestritas.

## Portões obrigatórios antes do merge comercial

- [ ] Todos os workflows GitHub Actions do commit final em `success` — os checks verdes de commits anteriores não aprovam novos commits.
- [ ] Abrir uma versão de homologação **isolada e sem gravações comerciais** em Safari e Chrome e verificar que login e telas carregam sem mostrar painel antigo/flicker.
- [ ] Confirmar com registros de teste: novo Pedido, Corte, Produção, baixa parcial e total da Separação; atualizar a página e conferir se voltou do servidor.
- [ ] Verificar Facções/Acertos, inclusive troca de facção, valor avulso e confirmação de pagamento sem duplicidade.
- [ ] Verificar Hub Financeiro, Nota Fiscal e Compras, conferindo ACK remoto; salvar no aparelho ou `pendingSync:0` não bastam.
- [ ] Verificar Folha: editar passagem individual, conferir soma, salvar, preservar ordenação e reler em outro computador.
- [ ] Verificar Estoque, Etiquetas A4 (10 por folha e múltiplos volumes), Ficha Técnica, Auditor/Monitor, Assistente e tela mobile.
- [ ] Validar duas sessões Safari↔Chrome, fila WAL existente e nenhuma perda/reescrita de registros; testar falha de rede e retorno à conexão.
- [ ] Confirmar backup restaurável, documentação de rollback e autorização explícita do responsável antes de integrar à `main`.

## Regra de publicação/rollback

**Não fazer merge automático na `main`.** A `main` pode estar conectada à publicação usada pelos funcionários. A candidata só é publicável quando todos os checks e a homologação acima forem aprovados. Guardar o SHA exato de `main` e o backup transacional/snapshot Supabase antes de publicar. Em caso de falha funcional, reverter o commit de código, verificar dados/WAL e **não** apagar caches, IndexedDB ou pendências locais às cegas.

## Próximo passo depois da candidata

Usar o manifesto dos 92 blocos originais (91 ainda inline) para prosseguir na extração física progressiva de `app9240.html`, primeiro das funções puras com contratos verificáveis, depois das rotinas de estado e persistência com testes de idempotência, sessões concorrentes e ACK remoto. Só marcar um módulo como concluído depois de testar todas as ações reais, sem perder telas, botões, filtros, histórico e impressões.

## Trava adicional dos 156 scripts comerciais

O arquivo `main-156-blob-baseline-v9606.json` registra **o SHA Git e o tamanho exatos de cada um dos 156 scripts JS originais** da `main`, além do `app9240.html`, `index.html` e `abrir.html`. O teste `hlgb-main-156-blob-integrity-v9606.cjs` impede qualquer modificação não declarada: **153 scripts devem ser idênticos byte a byte**, enquanto apenas 3 consumidores com fallback têm alterações explicitamente aprovadas na candidata. O carregador ainda deve manter a sequência original.

Isso evita que a organização em módulos esconda a eliminação de funções; ainda assim **não substitui** a homologação dos funcionários nem transforma o monólito em 14 módulos físicos.

## Continuação v96.07 — PR isolada e reversível

A candidata anterior #271 passou nos 55 workflows automáticos, mas ainda não teve aceite manual de produção. O novo trabalho de extração física está separado na branch `refactor/live-main-cut-production-effective-qty-v9607`, mantendo #271 verde. Extrai um bloco autocontido de quantidades Corte→Produção, **sem alterações de regras**, e exige teste de reconstrução exata da fonte, paridade em nove cenários e carregamento em Chromium/WebKit com rede comercial bloqueada. Esta PR NÃO publica, não altera banco, não migra WAL e não converte o programa inteiro em módulos. Depois da CI, ainda é necessária homologação de operação comercial isolada antes do merge.
