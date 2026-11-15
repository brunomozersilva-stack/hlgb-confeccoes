# HLGB Evolução — Transações simuladas, histórico e concorrência

**Apenas laboratório.** A funcionalidade é um exercício em memória local para validar contratos. Não existe conexão com banco, WAL, Storage ou Hub real.

## Implementação

- `simulador-transacao-memoria.js`: simula uma única unidade atômica para compensação entre grupo **Pago** e **Pendente** da mesma facção, além de registrar um pagamento fictício com todas as linhas e a saída correspondente do Hub.
- `transacoes-simuladas.html`: demonstração mobile dos estados normal, conflito, falha **antes de confirmar** e resposta perdida **depois de confirmar**.
- `tests/transacao-memoria.cjs`: testes de idempotência, revisão esperada, grupos e Hub, readback, anexos e histórico.
- `tests/transacoes-mobile.cjs`: automação Chromium/WebKit em cinco larguras de tela.

## Situações simuladas

| Situação | Comportamento do laboratório | Comportamento exigido no futuro backend |
|---|---|---|
| Duas sessões com revisão diferente | Segunda alteração retorna `conflict`; estado intacto | Controle de concorrência na transação SQL |
| Falha antes de confirmar | Nenhum grupo, Hub ou evento alterado | Rollback atômico |
| Falha após confirmar, antes de receber resposta | Resultado `uncertain`; interface bloqueia novo envio até conciliar | Idempotência persistente e consulta de operação |
| Reenvio com o mesmo ID e mesmo conteúdo | `already_committed` sem nova alteração | Deduplicação atômica no servidor |
| Mesmo ID com conteúdo diferente | `rejected` | Bloqueio e investigação |
| Pagamento de várias linhas | Marcação de todas, histórico e saída do Hub confirmados juntos | RPC transacional real, ACK e releitura |
| Comprovante PDF fictício | Metadados preservados, antigos não sobrescritos | Storage seguro e registro de vínculo, com controle de uploads órfãos |

### Exemplo inteiramente fictício

- Origem `AC-099` já paga: diferença **R$ 5,00**, compensação anterior **R$ 2,00**.
- Destino `AC-101` pendente: R$ 25,00 + R$ 4,00 − R$ 1,00 = **R$ 28,00**.
- Aplicar **R$ 3,00** de compensação: origem fica sem saldo e destino passa a **R$ 25,00**.
- Marcar pago: as duas linhas do grupo passam a `Pago`, a saída fictícia do Hub fica em **R$ 25,00** e um identificador de comprovante é acrescentado. Não há pagamento nem arquivo enviado.

## Limitações importantes

- **Não é** uma transação PostgreSQL; a troca atômica ocorre apenas entre objetos em memória de uma página.
- **Não é** um teste com dois navegadores simultâneos conectados ao mesmo banco. As revisões conflitantes são simuladas.
- A simulação não testa permissões RLS reais, travas de banco, uploads em Supabase Storage, filas WAL ou pagamentos reais.
- Não houve merge, deploy, alteração da versão atual ou mudança de dados de produção.
- O inventário existente de 76 funções, 43 cenários críticos e os 266 itens do Plano Mestre permanece **pendente de homologação**.
- Esta camada não autoriza reaproveitamento direto no aplicativo em produção.

## Próxima etapa planejada

Projetar testes **de integração em um banco de teste independente**, com dados inteiramente sintéticos, antes de qualquer implementação que toque os serviços usados pelos funcionários. Isso exigirá especificar tabelas, políticas RLS e migração segura, preservando o banco atual, e obter autorização explícita antes de publicar.
