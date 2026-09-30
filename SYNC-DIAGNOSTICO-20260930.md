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
