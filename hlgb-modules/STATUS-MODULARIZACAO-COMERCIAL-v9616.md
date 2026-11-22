# HLGB Comercial no ar — segundo checkpoint da modularização (v96.16)

**Referência:** `main` no commit `a8d6ce97cba345d9ea2d60f2b50e6c593e4b28c6` após PRs #275 e #282. **Escopo:** HLGB Confecções comercial, não a Evolução HLGB nem By Hagatha.

## O que esta etapa efetivamente entrega
- Inventário **somente leitura** do `app9240.html` original: nomes de funções declaradas, exposições em `window`, IDs, handlers inline e hipóteses de domínio. **Não executa** esse JavaScript e não acessa dados de funcionários/clientes.
- Referência de **158 scripts reais do carregador, em ordem exata e sem duplicidade**, distribuídos por **14 áreas responsáveis** no manifesto `ownership-v9600.json`. São rótulos de manutenção, não isolamento físico já concluído.
- Prova de SHA do `app9240.html` e dos arquivos comerciais críticos para detectar alterações involuntárias; teste automático impede a ativação do antigo carregamento em grupos, mantém a ordem atual e confirma que nenhuma área ou script perdeu responsável.
- Workflow próprio gera um arquivo JSON estático do inventário nos Artifacts do GitHub Actions, sem executar o programa comercial, fazer login, chamar Supabase, tocar na WAL ou salvar lançamentos.

**Não muda:** `app9240.html`, `app-stable3.html`, scripts operacionais, pagamentos, Cortes, Facções, Folha, IndexedDB ou Auth. Não é uma homologação de telas nem prova de sincronização entre máquinas.

## Situação real
1. **#260**: primeira organização do carregamento (já integrada); não extraiu as funções do monólito.
2. **#275**: proteção do login Safari (já integrada, publicação concluída).
3. **#282**: auditoria WAL integral read-only (já integrada, publicação concluída).
4. **Segundo merge da modularização (esta etapa)**: inventário e matriz de responsabilidade, sem alterar o runtime; depois iniciar extração de cálculo puro isolado, com fallback e equivalência.
5. **PRs antigas #261–#270**: são candidatas históricas em branches empilhadas. Revisar uma a uma sobre o `main` atual; **não fazer merge automático em lote**, especialmente #266 cujos testes falharam. Não reintroduzir módulos antigos do loader.
6. Funcionalidade restante do monólito: **ainda não concluída**; cada extração deve preservar contratos, botões, ordem, histórico, campos, impressão e gravação.

## Melhoria pedida pela operação — nada será esquecido
| Trabalho | Ticket | Regra de segurança |
| --- | --- | --- |
| **Acertos**: resumo por data e detalhado por cliente/facção/funcionário, histórico, baixa, comprovante e arquivo | #276 | Histórico de pagamento não é exclusão; evitar duplicidade de baixa |
| **Corte Conjunto**: candidatos pelo mesmo material real, grade combinada e simulação | #277 | Sem baixa/estoque/produção por simples simulação |
| **Pontas/sobras**: seleção Sim/Não/Não informado e modelos elegíveis | #278 | Não afirmar encaixe real sem largura/moldes |
| **Audaces**: anexar arquivo real, estudar moldes, pontos vazios e pontas | #279 | Não inventar compatibilidade de arquivo ou economia |
| **Eliminar etapas redundantes depois** | #279, #280 | Primeiro ocultação reversível, depois autorização |
| **Pendências WAL do Safari** (26 em relatório de 22/11) | #152, #280 | Somente provas por opId, conteúdo e revisão; jamais limpar WAL |
| **Produto ausente no corte, finanças arquivadas e duplicidade do script 3D** | #283 | Não reconstruir os 4 pagamentos nem ajustar corte sem conferência |

## Aceite antes das próximas mudanças de runtime
- Regressão completa e navegador WebKit/Chromium em PR, além de login real no Safari quando disponível.
- Igualdade de resultados (inclusive centavos, filtros e relatórios) com o programa comercial anterior.
- Salvamento com ACK e releitura de outro computador; a WAL só poderá ser marcada como concluída com prova real.
- Correção pequena e reversível em cada módulo, com **pelo menos uma melhoria operacional**, mas nunca sacrificando recursos existentes.

**Plano mestre atual:** #280. **Detalhes de acertos:** #276. **Navegação real e ordem do loader são patrimônio do programa original.**
