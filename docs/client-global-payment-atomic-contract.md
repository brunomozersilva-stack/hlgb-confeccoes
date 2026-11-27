# Acerto global de cliente — contrato de confirmação (não ativado)

A pré-validação 9775 é somente leitura. Não autoriza a gravação. A revisão comercial consultada usa hlgb_records.revision e hlgb_save_record por registro; chamadas sucessivas não são transação global.

## Requisitos do servidor
- Autenticação, autorização explícita de notas, clientes, financeiro e Hub em cada chamada; negar acesso anônimo.
- Identificador estável do acerto e chave única no servidor; repetição com os mesmos dados retorna o mesmo recibo, conteúdo divergente é recusado.
- Em uma transação, obter bloqueios em ordem determinística, conferir cliente, nota canônica, título único, revisão esperada, saldo em centavos, histórico e créditos. Recalcular alocação, não aceitar documentos editados pelo navegador.
- Conferir a ligação do Hub, impedir registro duplicado de entrada e evitar que o valor previsto e realizado sejam contados simultaneamente. Uma entrada líquida para o pagamento global; manter alocações por nota.
- Se qualquer verificação falhar, abortar a transação inteira. Preservar histórico e status produtivos; não gravar estoque ou cortes.
- Persistir recibo com identidade, data do pagamento, instante e autor do servidor, referências, alocações e revisões. Releitura autenticada por chave após ACK perdido; não repetir com nova chave.
- Saldo inicial e crédito excedente permanecem fora da primeira versão até existir conta corrente persistente, com movimentos de ajuste auditáveis e sem data comercial inventada.

## Testes de aceitação em homologação
1. Duas notas, uma quitação e um pagamento parcial, uma entrada no Hub.
2. Alteração concorrente, título duplicado, cliente divergente, nota cancelada, pendência de sincronização, falta de permissão: zero mudanças.
3. Falha após primeira atualização: rollback de tudo.
4. ACK perdido e reenvio simultâneo em dois dispositivos: uma transação, um recibo.
5. Conciliação de títulos e Hub, preservação de históricos e valores prévios; reversão auditável, não exclusão.
6. Testar RLS e permissões com perfis reais de homologação, inclusive negativas.

Sem migração, endpoint ou escrita comercial nesta etapa. Não habilitar até concluir testes no banco isolado e revisão da integração financeira existente.

## Contrato isolado v98.00 — conta independente

`client-account-ledger-v9800.cjs` modela abertura assinada sem data comercial, ajustes com justificativa, recebimentos com alocações por nota/título e crédito excedente, estorno integral rastreável. O delta independente é somente a parte não alocada; uma entrada no Hub pelo total, nunca por nota. Referência idempotente e revisão são candidatos locais, não garantias de concorrência. O servidor deve recalcular alocações, validar permissões e referências globais, bloquear revisões, conservar movimentos imutáveis e confirmar o recibo e todas as alterações em uma única transação. Estornos exigem prova dos movimentos originais e reversão financeira atômica. Nenhuma tabela, migração, endpoint ou gravação foi ativada. A interface comercial permanece em prévia.
