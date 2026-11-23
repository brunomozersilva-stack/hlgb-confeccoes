# HLGB Comercial — Acertos v96.19 (candidata isolada)

Base: main após PR #286 (c4fcd254). **Não faz parte do carregador comercial**, não altera HTML, banco, WAL, cadastros ou pagamentos.

## Inventário confirmado no código atual
- `release-faction-acerto-consolidated-v95102.js`: consolidado visual de pendências por facção, protege homônimos pelo ID, ignora pagamentos parciais inconclusivos e trata grupo avulso uma vez.
- `release-faction-manual-payment-v9566.js`: pagamentos avulsos e travetada, com validação, baixa e comprovantes; não substituir.
- `release-faction-payee-settlement-v95104.js`: pagamento normal, verificação de WAL IndexedDB + localStorage, leitura da nuvem e conferência do Hub antes de escrever; não duplicar.
- `release-notes-receivables-v9564.js`: contas a receber, histórico, nota/projeção vs. pedido sem contagem duplicada, abatimento e filtros; não criar fonte paralela.
- A folha permanece um domínio financeiro próprio, separado de facções e clientes.

## Entrega isolada
`acertos-history-readonly-v9619.cjs` recebe uma lista normalizada de acertos como **dados de entrada**. Agrupa por `kind + ownerId + date` e emite detalhes, resumos em centavos e erros de integridade. Não lê diretamente o ERP e não faz qualquer gravação. `kind` diferencia `faccao`, `cliente` e `funcionario`; `ownerId` é obrigatório para não misturar homônimos. Duplicidade de ID e valores inconsistentes não entram silenciosamente nos totais. O chamador deve interromper qualquer exportação ou relatório oficial se `complete=false`.

## Critérios para próximo passo
1. Conectar **adaptadores somente leitura**, preservando os cálculos de cada módulo original e verificando paridade por documento real; não assumir que `paymentHistory` e `paidAmount` são intercambiáveis.
2. Tratar data de competência, vencimento, pagamento e arquivamento como datas distintas. A data `date` do protótipo é uma chave explícita escolhida pelo adaptador, **não** inferência.
3. Testar cancelamentos, devoluções, acertos parciais, múltiplos pagamentos, antigos, PDF, 2 navegadores, WAL e volumes grandes.
4. Só integrar UI/baixas depois de conciliar operações WAL (#152), validação do Safari real e prova de releitura remota. **Esta PR não pode ser publicada como recurso de Acertos concluído**.

Backlog preservado: #276 Acertos; #277 Corte Conjunto; #278 Sobras; #279 Audaces; #280 Plano Mestre; #283 integridade; #287 Auditor WebKit.
