# Pacote de auditoria, assistente e desempenho v99.05
Base: ef249dcf1e00bcd302d2ec1b9378d6edb6322dff. Complementa #551.
- Auditor identifica falhas persistentes e as que retornaram depois de uma aprovação no mesmo contexto local. Ausência, ambiguidade e troca de escopo não são prova de reparo.
- Classificação de timeout usa todas as fontes existentes, sem ignorar evidência quando a primeira timeline é vazia.
- Relatórios e Cortadores atualizam também após navegação programática, com deduplicação e cancelamento já existentes.
- Assistente consulta lotes atrasados por prazo explícito e histórico por equipe, com permissões, origem por ID, bloqueio de homônimos e sem promessa de data.
- Não altera registros, não executa reparo automático e não instala migração. A baixa semanal, conta corrente e checklist permanente continuam exigindo acesso de implantação no Supabase HLGB.
