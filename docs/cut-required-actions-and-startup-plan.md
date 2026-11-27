# Corte: funções obrigatórias e abertura progressiva
## Regressões relatadas em 27/11
- Checklist completo da peça dentro do Corte, acessível em cada modelo, com grade, materiais e conferência. Comparar com checklist Facção 1 relatado pela usuária; vídeo ainda não revisado nesta rodada. Rascunho, anexos e faltas permanecem no fluxo de separação; persistência comercial pendente.
- Imprimir folha de pedido do corte com rota existente da folha completa; preservar grade, pesos, aproveitamento, assinaturas, tipo interno/externo, impressão Safari. Não substituir por uma folha simplificada.
- Não perder Ajustar grade, Peso, programação, baixa de separação, filtros, histórico ou funções de outros módulos. Testes de presença e clique, desktop/mobile Chromium/WebKit, comparação com versão comercial.
## Nova melhoria: abertura progressiva por módulos
Relato: tela inicial abre e congela parcialmente por 40–50 segundos antes de uso normal (percepção da usuária, não medição instrumental).
1. Medir autenticação, primeira interação, tarefas longas, renderizações repetidas, requisições e tempo até módulos disponíveis, Chrome/Safari, cache frio/quente, base grande.
2. Carregar shell, autenticação, permissões, estado de sincronização/WAL e dados mínimos da página inicial. Não adiar segurança, integridade ou recuperação de pendências.
3. Carregar página solicitada sob demanda, dividir renderizações em lotes e evitar cálculos e auditorias pesadas de módulos invisíveis durante startup. Pré-carregar demais módulos quando o navegador estiver ocioso, priorizar interação e cancelar trabalho obsoleto.
4. Sinalizar carregamento por módulo, não exibir zero como dado confirmado; manter ações de gravação bloqueadas até fontes autorizadas e completas.
5. Comparar antes/depois com métricas de primeira interação, long tasks, estabilidade de tela, tempo total e nenhuma regressão; meta inicial proposta: acesso essencial em até 5 s em condição de teste acordada, não promessa de desempenho. Não mudar carregador nesta PR.

## Etapa v98.42 — agendamento pós-login
A ponte anterior reagendava cada callback pendente a cada flush (poll, foco, pageshow, online e visibilidade), embora o callback executasse uma única vez. A candidata mantém um timer por registro, cancela o timer se a rotina legada executar primeiro, exige autoridade antes de executar e cancela timers no logout mantendo registros ainda pendentes. Expõe contadores de agendamento, coalescência, execução e bloqueio. Teste determinístico: 100 callbacks com 20 flushes evitam 2.000 reagendamentos; preserva callback legado e login tardio. Sem mudança no loader, WAL, ordem de scripts ou fonte de dados; ganho de tempo real ainda não medido.

## Etapa v98.43 — renderização visual sob demanda
Relatórios e grupos de cortadores eram recalculados pelo loop de manutenção e pelos wrappers de renderização, inclusive em páginas ocultas. A candidata adia apenas esses dois trabalhos visuais automáticos até que a página esteja ativa, visível, autenticada e autorizada, agrupando disparos repetidos e conferindo novamente antes de executar. Observa a classe das páginas para atualizar na entrada; mantém APIs explícitas e todas as outras rotinas, inclusive diagnóstico das pendências, WAL e transporte. Teste determinístico cobre navegação, troca rápida de página, aba oculta, logout e autorização. Não altera a carga de scripts nem comprova redução do tempo total de boot.
