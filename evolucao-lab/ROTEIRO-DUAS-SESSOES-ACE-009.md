# HLGB Evolução — homologação de gravações em duas sessões (ACE-009)
**Revisão:** 18/11/2026 · **Aprovação do módulo:** PENDENTE · **Substituição da main:** BLOQUEADA

Esta folha existe para impedir que `pendingSync:0`, uma gravação no IndexedDB, ou um teste em dois perfis do mesmo navegador sejam considerados provas de chegada ao banco comercial.

## Etapas de evidência que NÃO são equivalentes

| Nível | Ambiente | O que demonstra | O que NÃO demonstra |
|---|---|---|---|
| 1 | Duas abas no mesmo navegador, mesmo perfil | Transação local serializada, rejeição de revisão desatualizada, releitura IndexedDB | Sincronização com outro navegador ou computador |
| 2 | Chrome/WebKit em jobs separados, banco PostgreSQL descartável | Duas sessões independentes de navegador no mesmo servidor de teste, replay do mesmo comando, conflito, WAL persistente, ACK perdido e queda de rede | Safari nativo no Mac, conexão de rede de dois computadores físicos, banco comercial |
| 3 | Safari em Mac + Chrome em outro computador, homologação separada | Gravação realmente confirmada em servidor por dois dispositivos, mesma identidade de registro, conflitos e recuperação após desconexão | Equivalência com todos os dados antigos sem reconciliação |
| 4 | Repetição do fluxo com cópia autorizada e anonimizada dos registros reais | Paridade pedido/lote/cor/tamanho/facção/acerto/histórico, inclusive WAL local pendente e divergência antiga | Autorização para trocar o sistema antes do aceite e rollback ensaiado |

## Critérios obrigatórios do teste de operação (sem dados verdadeiros)

| Prova | Cenário | Como deve terminar | Estado |
|---|---|---|---|
| S-01 | Sessões A/B abrem mesmo documento de homologação | Ambas mostram mesma revisão do servidor após a leitura | PENDENTE |
| S-02 | A salva pedido fictício: Melina 120 + Tammy 10 | Um único `PDM` com dois itens; quantidade por cor/tamanho exata | PENDENTE |
| S-03 | B ainda na revisão anterior tenta editar o mesmo fluxo com 110 peças | **Conflito explícito**; 120 continuam no servidor; tentativa de 110 permanece exportável para confronto | PENDENTE |
| S-04 | B exporta WAL pendente e decide cancelar após conferir prova | Servidor confirma cancelamento do ID; versão de 110 arquivada no dispositivo; 0 gravações extras | PENDENTE |
| S-05 | Reabre B após atualização de IndexedDB WAL v1 → v2 | WAL antigo não some e jamais é reenviado automaticamente | PENDENTE |
| S-06 | A programa/conclui 80 do primeiro modelo e B envia à facção | `PCM` concluído, lote `MFL` de 80; segundo modelo inalterado | PENDENTE |
| S-07 | A devolve 30, B transfere o saldo, A devolve 20 | 30 peças com mão de obra e facção antigas; 20 com facção/preço novos; sem recalcular valor pago anterior | PENDENTE |
| S-08 | A perde o ACK após o servidor gravar retorno | Mesmo ID fica pendente; releitura encontra evento; nenhuma duplicação de retorno/acerto | PENDENTE |
| S-09 | B fica offline antes de conferir acerto | WAL guardado; reconexão apenas consulta; reenvio exige ação explícita e mesmo ID | PENDENTE |
| S-10 | Separar 50 e expedir 20 | Restam 40 a cortar e 30 cortadas a separar; detalhes por variação e sem saldo negativo | PENDENTE |
| S-11 | Reabrir em outra sessão e confrontar | Revisão, `commandId`, lote, cores/tamanhos, quantidades, facção e dinheiro demonstrativo idênticos | PENDENTE |
| S-12 | Verificar status e lançamentos comerciais | Nenhuma nova linha em `finance`, `settlements` ou `stockLedger` por movimentos da simulação | PENDENTE |

**Regras de aprovação:** salvar as evidências de A e B com data, navegador/versão, ID de pedido e comando, revisão esperada e lida, resultado do servidor, estado WAL antes/depois, captura do caso de conflito e assinatura de quem homologou. Se qualquer passo falhar, **não apagar a intenção nem tentar novamente com um ID novo antes de localizar a origem**.

## Arquivos de teste automatizado (precisam executar e passar)

- `tests/operacao-duas-abas-local-mobile.cjs` — duas abas do mesmo IndexedDB e um perfil de navegador realmente isolado (deve confirmar que NÃO há sincronização entre perfis independentes sem servidor).
- `tests/banco-integrado-multimodelo-browser.cjs` — duas sessões remotas em PostgreSQL descartável, concorrência, WAL, ACK perdido, replay idempotente, offline e preservação das duas versões conflitantes.
- `banco-integrado/cliente.js` — upgrade não destrutivo do IndexedDB para WAL v2 e arquivo `wal-review` por ator após cancelamento confirmado, jamais antes da prova do servidor.
- `.github/workflows/evolucao-operacao-integrada.yml` e `.github/workflows/evolucao-banco-integrado.yml` — matrizes Playwright Chromium/WebKit. Evidência JSON deve existir apenas se o teste respectivo realmente passar.

## Pendências de alto risco

1. A solução de **arquivo de conflito** ainda é **somente local e de laboratório**. No produto futuro, a cópia anterior e a nova precisam ficar protegidas também no servidor, com permissões, prazo de retenção, privacidade e solução de conflito orientada por pessoa responsável.
2. A captura da tentativa original **não equivale** a merge automático: depois da reconciliação, a equipe precisa decidir qual valor utilizar e registrar o motivo.
3. A base empresarial existente, os pedidos antigos parcialmente atendidos, os acertos pagos e as operações WAL ainda presas em outros computadores não foram migrados ou comparados em teste.
4. O laboratório PostgreSQL de CI é descartável e restrito a localhost. **Não corresponde a um ambiente de homologação publicado acessível em dois computadores reais**.
5. O WebKit Playwright em Linux **não substitui o Safari nativo no macOS**, embora ajude a detectar incompatibilidades.

**Porta de produção:** `ACE-009 = PENDENTE`, `ACE-017 = PENDENTE`, `approvedForProduction = false`. Nenhum merge na `main`, nenhuma operação no Supabase comercial e nenhuma aprovação implícita pelo número de testes.
