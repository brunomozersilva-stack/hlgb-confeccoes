# Escopo corrigido — modularização do HLGB COMERCIAL, a partir da main

**Repositório:** `brunomozersilva-stack/hlgb-confeccoes`.
**Referência comercial original:** commit `7c66a37ea04b7bf6b130b28b17cf194941023251` da `main` (18/11/2026).
**NÃO é o projeto Evolução HLGB** de `feature/evolucao-laboratorio-isolado-v1-20261114`.
**Objetivo:** tornar mais rápida e segura a correção dos erros que afetam funcionários no sistema atual, sem refazer telas, perder funções ou mexer em lançamentos reais sem autorização.

## Prova de que ainda NÃO terminamos
- `app9240.html` comercial atual tem **1.876.542 bytes** e permanece intacto.
- `app-stable3.html` carrega **156 scripts adicionais**. A primeira camada (#260) só divide o carregamento em 16 grupos e atribui donos a 14 domínios, **sem extrair o código embutido do app9240**.
- O novo inventário `audit-live-monolith-v9601b.cjs` examina nomes de funções e atribuições globais do arquivo original sem executar ou gravar nada. A lista precisa ser revisada função por função, sem supor que um nome de função corresponde automaticamente a um módulo.
- Os 14 pacotes agora incluem **64 entradas de testes existentes**, mas isso não substitui testes de todas as ações dos funcionários, nem validação por Safari/Chrome e duas sessões.
- Todo módulo continua **pendente de aceitação funcional** até a extração gradual ou delimitação formal de suas responsabilidades, preservando exatamente os fluxos atuais.

## Controle de cobertura e extração

| Módulo do sistema comercial | Scripts atuais mapeados | Entradas de teste | Estado da extração do app9240 |
|---|---:|---:|---|
| Base / infraestrutura | 8 | 4 | Pendente |
| Sincronização e WAL | 15 | 5 | Pendente — alto risco |
| Pedidos / Projeção | 9 | 4 | Pendente |
| Corte / Cortadores | 12 | 9 | Pendente |
| Produção / Separação | 4 | 4 | Pendente |
| Facções / Acertos | 18 | 6 | Pendente |
| Financeiro / Hub / Notas | 23 | 5 | Pendente |
| Folha / Pessoal | 11 | 4 | Pendente |
| Compras / Estoque | 9 | 4 | Pendente |
| Utilidades / Etiquetas | 3 | 3 | Pendente |
| Auditor / Monitor | 18 | 4 | Pendente |
| Assistente / IA | 14 | 4 | Pendente |
| Impressora 3D | 5 | 4 | Pendente |
| Interface / mobile | 7 | 4 | Pendente |
| **Total** | **156** | **64** | **Não concluído** |

Os scripts já estão fisicamente em arquivos próprios, mas podem depender de funções e estados globais do monólito. Testes por área representam **cobertura inicial**, não o fechamento do módulo.

## Ordem segura do trabalho — sem cruzar com Evolução HLGB

1. Inventariar todas as funções, botões, telas, impressões e gravações efetivamente usados no `app9240.html` da `main`.
2. Marcar o módulo dono, as dependências, a autoridade de gravação e a evidência de retorno de cada função. Contratos desconhecidos ficam pendentes.
3. Extrair uma única responsabilidade do sistema atual por PR, mantendo **adaptador de compatibilidade** e nomes globais anteriores. Preservar ordem de carregamento, IDs, assinaturas e formatos do banco.
4. Validar funcionamento em contexto real de homologação: Safari/Chrome, múltiplas sessões, WAL/IndexedDB, reabertura e releitura do registro no servidor. Nunca tratar envio local como prova de salvamento remoto.
5. Manter módulo aprovado somente após comparar todos os campos/fluxos da versão ao vivo e ter autorização expressa para integrar.

## PRs anteriores desta conversa
- **#260:** ponto de partida útil — 156 scripts no carregador da `main`, ownership e testes.
- **#262/#263:** extrações de cálculos de Corte/folha; não confundem com a modularização integral, **não devem ser publicadas como conclusão de módulos**.
- **#264:** candidata antiga de lançamento é **prematura para a meta de modularização completa**; segurar sem merge.
- **#265:** correção funcional nova de pesagem é **fora do escopo imediato desta etapa**; segurar sem merge. Não incorporar por engano.
- **Esta branch:** amplia testes de 8 para 14 domínios e audita o monólito sem alterar a execução comercial.

**Critério de conclusão:** nenhum módulo marcado como pronto por contagem de arquivos; só considerar pronto após inventário funcional, paridade dos fluxos, testes automáticos e homologação. A `main` permanece intacta até aprovação explícita.
