# Contratos modulares v1 — proposta, NÃO implantada

**Regra:** nenhum código desta pasta altera o HLGB em operação. A revisão da branch é de desenho e testes isolados, não uma autorização de merge ou de migração de dados.

## 1. Núcleo único de gravação

O núcleo ficará responsável por autorização, revisão esperada, chave de idempotência, transação, confirmação por leitura posterior, registro de auditoria e fila WAL. Cada tela só poderá propor um **comando**.

Exemplo ilustrativo (formato de contrato, não uma API implementada):

```json
{
  "commandId": "UUID-do-comando",
  "moduleId": "acertos",
  "kind": "settlement.commit",
  "actorId": "usuario-autenticado",
  "expectedRevision": 12,
  "issuedAt": "2026-11-14T20:00:00Z",
  "payloadSchemaVersion": 1,
  "payload": {
    "groupId": "exemplo",
    "lines": [
      {"lineId": "exemplo-1", "quantity": 50, "unitPriceCents": 15}
    ],
    "adjustments": []
  }
}
```

Esse esquema é uma **intenção futura** e não deve ser enviado ao Supabase existente. No projeto real, o servidor validará autenticação e permissões, limitará campos aceitos, comparará revisões e confirmará uma única transação.

### Estados de uma operação

| Estado | Significado | Ação recomendada |
|---|---|---|
| Rascunho | Alteração apenas no formulário | Pode editar e descartar |
| Validado | Valores coerentes antes de enviar | Pode revisar |
| Enviado | Comando foi transmitido | Não duplicar comando |
| ACK recebido | Servidor confirmou recebimento/aplicação | Aguardar confirmação de leitura |
| Confirmado | Revisão e valores relidos do servidor | Pode apresentar como salvo |
| Conflito | Revisão mudou desde a edição | Comparar com alterações de outro usuário |
| Inconclusivo | Resposta não permite afirmar estado | Bloquear reenvio cego e reconciliar |
| Rejeitado | Validação, permissão ou transação recusada | Corrigir dados ou permissão |

**Para pagamentos:** o grupo inteiro deve ser processado como uma única transação no banco; não é permitido salvar algumas linhas e deixar outras sem confirmação. Falhas de leitura não autorizam repetir POST automaticamente.

## 2. Contratos e classificação de módulos

- **Sempre ligados:** núcleo de dados e autenticação. Não têm botão de desativação.
- **Controlados:** Pedidos, Produtos, Corte, Produção, Separação, Facções, Acertos, Hub Financeiro, Folha, Compras, Estoque e Cadastros. Podem ter interface experimental, mas suas operações pendentes precisam terminar de forma segura antes de qualquer alternância de versão.
- **Opcionais:** relatórios avançados, Auditor, Bot, Central e Impressora 3D. A desativação de uma interface não remove registros nem histórico.

**Desativar um módulo** não equivale a apagar dados ou suspender silenciosamente processos críticos. O núcleo deverá permitir o diagnóstico da desativação e negar mudanças inseguras.

## 3. Autoridade de gravação: riscos já encontrados no código

| Fluxo | Evidência inicial | Decisão de arquitetura proposta |
|---|---|---|
| Acertos | `release-faction-manual-payment-v9566.js` grava `factionPayments` por linha e também relaciona lançamentos do Hub | RPC transacional por grupo, revisão e idempotência |
| Facções | `release-faction-operations-v9520.js` utiliza RPC e conferências | Contrato específico para transferência, preço e histórico |
| Corte | `release-cut-model-grade-adjust.js` salva uma grade por registro | Revisão esperada e efeitos explícitos nas próximas etapas |
| Produção | `release-production-operations-v9385-core.js` salva baixas e embalagens | Identidade estável de lote e comandos idempotentes |
| Separação | `release-separation-commit-v9319.js` registra separação e pode salvar pedido | Transação de baixa parcial ou reconciliação garantida |
| Hub Financeiro | `release-hub-save-proof-v9567.js` observa e delega a função existente | Localizar autoridade final e remover gravação concorrente |
| Folha | `release-payroll-reliable-save-guard-v9344.js` protege persistência local | Competência, versão e passagem por funcionário |
| Compras | `release-purchase-checkers.js` envolve formulário com conferentes | Recebimento integrado ao estoque com prova de conferência |

Estas linhas descrevem **observações parciais**. Não são laudos de falhas existentes neste momento. Cada hipótese só vira concluída após revisão integral da função, banco e testes de múltiplas sessões.

## 4. Regras de interface para todos os módulos

1. **Busca:** uma barra única por domínio, filtros consistentes e resultados de todo o catálogo autorizado pelo servidor, com paginação e autorização.
2. **Formulários:** campos e grades fáceis de preencher no celular, preços e cálculos visíveis, mensagens que distinguem erro de validação de erro de conexão.
3. **Relatórios:** totais com origem verificável, filtros reproduzíveis, atualizações com data da fonte e PDFs paginados.
4. **Acertos:** valores calculados em centavos inteiros; os descontos exigem motivo; salvar bloqueado durante conflitos ou situações inconclusivas.
5. **Mobile:** prioridade para toque, larguras pequenas, tabelas com rolagem própria e leitura em Safari/WebKit e Chrome.
6. **Segurança:** não ocultar erros de gravação. Falha de Auditor/Bot não deve bloquear consultas e operações seguras.
7. **Aprendizado:** registrar causa comprovada, correção e teste; IA não executa mutações nos dados reais.
8. **Experiência:** observar tempo e erros dos funcionários nas tarefas, não apenas aprovação automática de componentes.

## 5. Homologação obrigatória

Os sete portões `G0` a `G6` estão enumerados em `contratos-modulares.json`. A validação inclui: inventário de responsável por dados, integridade e permissões, testes, WebKit/Chrome, duas sessões, experiência com funcionários e aprovação explícita antes de publicar.

A aba Evolução apresenta **simulação**. Não haverá feature flags operacionais ou botão de publicar até existirem contratos reais, segurança e autorização.

## 6. Situação desta entrega

- Inventário e mapa ainda são preliminares: **19 áreas**, **25 dependências** (11 observadas no código, 14 a validar), **8 riscos de gravação**.
- Os fluxos visuais propostos ficam em `fluxos-operacionais.html` com dados fictícios e **sem nenhum salvamento**.
- O Plano Mestre mantém 266 itens aguardando homologação.
- **Falta:** validação runtime das dependências, transações de banco, autoridade única e implementação dos módulos.
