# Histórico na engenharia preventiva — v9793

O JSON do workflow de engenharia ganha `repairInsights`: casos de CI revisados relacionados aos testes prioritários ou módulos impactados, correções históricas e IDs de runs. Não é predição probabilística, causa confirmada, reparo ou merge automático. A suíte integral continua obrigatória.

`ci-repair-timing-v9793.json` registra metadados públicos dos quatro runs consultados. O intervalo entre `updated_at` da falha e `updated_at` do sucesso é uma aproximação de latência entre resultados, não horas trabalhadas nem duração exata do reparo. Apenas tentativa 1, identidade e sequência consistentes são aceitas. Os dois casos são de seletores/testes, não de defeitos comerciais; sem comparação pré/pós modularização ou média representativa. Atualizar catálogo e capturas a partir de evidências reais; ausências não viram zero.
