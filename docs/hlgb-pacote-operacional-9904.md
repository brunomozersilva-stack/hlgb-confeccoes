# Pacote integrado operacional v99.04
Base comercial: ed5c56cfd2407cab679e2f7e5b7bb70e011a5f36. Não reaplicar PRs antigas cujas funções já estão na main.
- Metas: histórico por facção/modelo/faixa, backtest, filas e divisão candidata entre equipes; sem promessa ou gravação.
- Corte: guardar e recuperar texto da conferência por cor na mesma aba, vínculo de identidade e ficha, sem bytes dos documentos; limpar no logout.
- RH: preservar formulários da mesma sessão ao trocar abas/páginas, revalidar identidade/permissão.
- Mobile: limitar diálogos operacionais ao viewport e corrigir fieldsets/controles.
## Dependências ainda não entregues
Contratos transacionais de acertos, conta corrente e checklist em testes isolados. Conector HLGB somente leitura, sem ferramenta de migração; outro projeto de homologação é da loja. Não simular atomicidade com saves consecutivos. Não declarar rascunho de aba como checklist permanente. Restam integração real da conta corrente, baixa semanal e anexos, gravação consolidada de avulsos, corte conjunto real, dados reconciliados para produção/financeiro, demais ajustes RH/mobile, Auditor/Bot/Assistente, lazy loading e modularização integral. #280 é fonte do backlog.

- Financeiro/Metas: consulta da carteira documental canônica, condições por cliente e pedido, saldo à vista/a prazo/vencido, títulos compartilhados sem dupla soma e proteção de WAL. Não lança nem importa automaticamente recebíveis.
