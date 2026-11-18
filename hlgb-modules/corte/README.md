# Corte/Cortadores — extração pequena da grade (v96.02)

Este arquivo contém apenas os cálculos puros de **grade por modelo**, **quantidade de peças por modelo** e **IDs de modelos do pedido**. Não consulta banco, IndexedDB, WAL, financeiro, nem modifica objetos por conta própria.

O script `release-cutter-planner.js` passa a reutilizar `HLGB_CUTTER_GRADE_9602`, mantendo o cálculo antigo como fallback se o novo script não carregar no Safari/Chrome. O carregador deve inserir o arquivo **antes** do Cortador e nenhuma função global antiga foi removida.

O teste de paridade compara os resultados do módulo novo e do comportamento anterior com IDs mistos, tamanhos, cores, quantidades zeradas/negativas e modelos repetidos. Os testes existentes de programação e confirmação de gravação continuam obrigatórios.

**Essa alteração é experimental e isolada.** O monólito `app9240.html` não é mexido. Antes de integrar à produção, combinar o novo módulo com o catálogo de ordem e as assinaturas de arquivos da PR #260, atualizar a contagem deliberada de scripts, comprovar abertura no Safari/Chrome e obter regressão geral verde. Não existe autorização para retirar os fallbacks nesta etapa.
