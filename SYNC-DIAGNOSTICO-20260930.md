# Sincronização: investigação ainda não encerrada

Base verificada: `8b074da9683ae01a2d91d0a4ea61bc9ac9b542c9`, branch `melhorias-ia-diagnostico-20260930`.

## Evidência confirmada

- Leitura do Supabase `huhrgvijgsshqlsnqeuz`, sem comandos de escrita.
- `systemAuditRuns / audit-1790799200708-244373`: auditoria Safari de 2026-09-30T20:13:20.708Z; 33 pass, 2 warn, 0 fail. O histórico informa 13 pendências normalizadas, mas não contém seus módulos, IDs ou payloads. O contador WAL de 2 foi relatado pela usuária; não está registrado nesse histórico.
- `hlgbRecordPendingStore` e `hlgbNormalizedSyncModule` comparavam JSON com ordem de chaves significativa. A troca da ordem das chaves, inclusive em objetos internos, criava pendência e tentativa de gravação sem mudança de conteúdo. Reproduzido por teste executando as funções originais extraídas de app9240.html: falha antes, aprovação depois da correção.
- `scanDirty955` usa comparação canônica de campos de negócio; o WAL pode por isso divergir da contagem da fila normalizada. Isso não prova a origem dos 13/2 itens relatados.
- `hlgb955ReconcileServer` consulta módulo/ID antes de reconhecer pendências satisfeitas. Não foi executado contra uma sessão real nesta investigação.

## Correção limitada

Comparação canônica do conteúdo completo somente nas duas rotinas normalizadas acima. Nenhum campo é ignorado; ordem de arrays e diferenças de metadados continuam relevantes. Nenhuma mudança no WAL, no banco, nos dados de negócio ou na limpeza de filas reais. O histórico técnico continua fora do caminho operacional.

## Validação

- 44 arquivos de testes CJS aprovados, incluindo nova regressão de ordem das chaves.
- Regressão do Auditor ampliada: execução e salvamento simulados com filas vazias preservam dados de negócio e não criam fila normalizada nem WAL localStorage. O teste usa VM e respostas simuladas; não equivale a auditoria visual nem valida IndexedDB real.
- Verificação de whitespace com git diff --check.

## Limite e pendência necessária para fechar o incidente

O navegador Work recusou `http://localhost:8765/hlgb-confeccoes/abrir.html` com `net::ERR_BLOCKED_BY_CLIENT`. A instalação do navegador de testes falhou com arquivo de download inválido. Portanto NÃO foi concluída reprodução visual em sessão limpa e NÃO existe nova auditoria real pós-correção.

As filas originais do Safari não estão disponíveis nesta sessão. Permanecem não identificados os módulos/IDs das 13 pendências normalizadas e das 2 do WAL, incluindo possíveis entradas exclusivas de IndexedDB. Não é possível classificá-las honestamente como técnicas, operacionais reais, já satisfeitas ou falsos positivos somente pelo contador.

Para concluir: obter uma exportação somente leitura de `hlgb_records_pending_v91`, `hlgb_durable_wal_v1` e do object store `entries` em IndexedDB `hlgb_durable_wal`, na mesma origem/sessão Safari do incidente. Não limpar armazenamento, não reenviar pendências como teste e não incluir tokens/sessão de autenticação nessa exportação. Comparar cada payload com consulta atual ao Supabase pelo módulo/ID, preservando qualquer alteração operacional ainda não confirmada. Rodar a versão corrigida em sessão limpa e repetir o Auditor, verificando as três filas antes/depois.

Nenhuma publicação ou merge no main autorizado ou realizado.


## Evidência nova — exportação real do Safari às 20:30

Foi analisado o arquivo real `HLGB-DIAGNOSTICO-SINCRONIZACAO-2026-09-30T20-30-48-607Z.json`, gerado no Safari da sessão afetada, e comparado por consultas somente leitura com `public.hlgb_records` no Supabase.

- No momento da exportação havia **11 pendências normalizadas**, não 13: **1 em `orders`** (ID `1788437076679`) e **10 em `factions`** (IDs `1788439929438`, `1788440003849`, `1788439983951`, `1788439978349`, `1788439938662`, `1788440009025`, `1788439901034`, `1788547747038`, `1789307296209`, `1788439971026`).
- O mesmo arquivo mostrou **WAL localStorage = 0** e **WAL IndexedDB = 0**. Portanto as “2 alterações salvando” vistas às 20:13 já não existiam às 20:30; essa exportação posterior não permite identificar quais eram aquelas 2.
- Nas 10 facções, a comparação com a nuvem mostra que a diferença é somente o campo derivado `description`: a fila local contém o nome exato do modelo daquela produção, enquanto o snapshot remoto antigo contém uma descrição agregada de vários modelos do pedido.
- No pedido `1788437076679`, a diferença é somente `projectionItems[*].noteQueuedQty` em itens da projeção. Os demais campos do payload conferido coincidem com o snapshot remoto.
- Assim, **os 11 itens presentes nessa exportação são classificáveis com segurança pelo limpador atual como falsos positivos derivados**, desde que não exista WAL para o mesmo módulo/ID e o snapshot carregado continue sendo o remoto atual. O limpador já restaura a cópia local a partir do snapshot da nuvem e não grava nem apaga dados remotos.
- A branch atual já contém duas prevenções para não recriar esse tipo de sujeira durante simples renderização: a descrição canônica de facção é aplicada só na UI sem alterar o objeto ao renderizar, e o indicador de fila de notas é calculado para exibição sem atualizar `noteQueuedQty` durante `renderProjection`.
- O botão **“🧹 Limpar falsos positivos confirmados”** existe somente na versão atual da branch de diagnóstico. A tela fotografada pela usuária é a versão publicada anterior e por isso mostra apenas três botões. Como `main` não pode ser publicado/alterado nesta investigação, a limpeza não deve ser procurada nessa tela publicada.

### Estado do incidente após a nova evidência

A origem das **11 pendências restantes às 20:30** está identificada e não representa 11 edições operacionais reais pendentes. Continua sem prova individual apenas o par de alterações transitórias exibidas às 20:13, porque elas já haviam drenado quando o diagnóstico foi exportado. Nenhum dado real foi alterado para chegar a essa conclusão.
