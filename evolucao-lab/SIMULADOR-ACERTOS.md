# HLGB Evolução — Simulador de cálculos financeiros (somente demonstração)

**Data:** 14/11/2026 · **Branch:** `feature/evolucao-laboratorio-isolado-v1-20261114`

## Recursos novos, isolados

- `motor-calculos-demonstracao.js`: funções **puras** de matemática, sem banco, sem requisição HTTP, sem cache, sem WAL e sem efeitos colaterais.
- `acertos-simulador.html`: tela autônoma com o mesmo motor embutido, permitindo abrir um único HTML no Safari ou Chrome, mesmo offline.
- `tests/motor-calculos.cjs`: cenários e casos inválidos de cálculos; confere ainda identidade do motor embutido na página.
- `tests/acertos-simulador-mobile.cjs`: pesquisa por interação em Chromium e WebKit em cinco larguras (320, 375, 390, 768, 1280 pixels).

## Diferenças essenciais de contexto

O **Acerto de Facção** calcula serviços (incluindo travetada por peça), abatimentos/acréscimos e compensações referentes a outro acerto da **mesma facção**, com status original Pago e destino Pendente.

A **Nota/Pedido** representa recebimentos parciais, já recebidos e devoluções, mantendo `valor recebido` separado do `crédito por devolução`. Esses dois fluxos não foram misturados no motor.

Exemplos numéricos fictícios:

| Fluxo | Demonstração |
|---|---|
| Facção: 100 peças × R$ 0,30 | Bruto R$ 30,00; desconto travetada 100 × R$ 0,05 = R$ 5,00; líquido R$ 25,00 |
| Outro serviço: 20 × R$ 0,20 | R$ 4,00 |
| Ajustes diretos | − R$ 2,00 + R$ 1,00 |
| Compensação paga a mais em semana anterior | − R$ 3,00; crédito anterior R$ 5,00, já utilizado R$ 2,00 |
| **Valor do acerto fictício** | **R$ 25,00** |
| Nota: total R$ 100,00 | Já recebido R$ 40,00; devolução R$ 10,00; nova parcela R$ 20,00 |
| **Saldo a receber fictício** | **R$ 30,00 — Parcial** |

## Proteções e limitações

- Os cálculos usam **centavos inteiros**, para reduzir erros de arredondamento.
- Motivos obrigatórios para abatimentos, acréscimos e devoluções; no máximo 25 ajustes diretos.
- Proteção contra compensações duplicadas, status incompatíveis, facções diferentes, abatimento superior ao valor, recebimento acima do saldo, identificadores repetidos e valores inválidos.
- Exemplo de rateio por linha conforme referência no código de `release-faction-manual-payment-v9566.js`; **não é gravação**, nem teste de transação remota.
- **Divergência deliberadamente sinalizada:** `release-acerto-returns-v9565.js` usa tolerância de até 1 centavo para classificar como Pago; o simulador exibe `Revisar centavo residual` em vez de afirmar quitação. Essa diferença exige decisão e homologação antes de eventual integração.
- A função do código legado de compensação distribui eventos e ligações por registros distintos, com confirmação por leitura posterior. Este simulador **não representa** toda a concorrência, limites de transação, anexos ou auditoria.
- Não há salvamento. O botão de pagamento e o botão de recebimento estão **desabilitados**.
- Não acessa dados reais, não faz deploy, não cria PDF nem comprovante, não altera estoque e **não deve ser ligado à produção**.
- A página foi desenhada para uso no celular; testes com funcionários e dispositivos físicos continuam pendentes.

## Critérios para futura migração (ainda não autorizada)

1. Preservar todas as operações e validações do legado documentadas em `paridade-critica-detalhada.json`, incluindo comprovantes, compensações parciais, marcação como pago e cancelamento lógico.
2. Implementar transação atômica no backend entre linhas, ajustes e registros financeiros, com idempotência, revisões esperadas, RLS e ACK+readback.
3. Garantir que o WAL local não faça replay de comando financeiro inconclusivo sem reconciliação.
4. Fazer testes de concorrência, falhas injetadas e rollback em dados de teste, antes de quaisquer mudanças reais.
5. Homologar desktop e mobile com pessoas responsáveis e autorização explícita antes de qualquer integração.

**Status:** protótipo de cálculo e UI para testes; nenhuma das 266 melhorias do Plano Mestre está homologada para produção.
