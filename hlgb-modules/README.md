# HLGB comercial — modularização segura, etapa 1 (v96.00)

> **Escopo desta conversa:** exclusivamente o ERP comercial já existente na `main` do repositório `hlgb-confeccoes`. A branch separada da Evolução HLGB não participa desta modularização.
>
> A classificação em 14 domínios e 16 grupos de carregamento **não finaliza os módulos**. O monólito comercial `app9240.html` permanece inteiro. Antes de extraí-lo, inventariar todas as funções reais e preservar seus contratos com os funcionários.
>
> Progresso adicional desta branch: todos os 14 domínios agora têm pacotes iniciais de regressão (66 entradas), mas **nenhum foi homologado como módulo fisicamente extraído**. Ver [STATUS-MODULARIZACAO-COMERCIAL-v9601b.md](STATUS-MODULARIZACAO-COMERCIAL-v9601b.md) e [TESTES-POR-MODULO.md](TESTES-POR-MODULO.md).


## Evolução da divisão física — em branches de homologação, NÃO em produção

- A PR #267 extrai somente tamanho e formatação do rótulo de Etiquetas A4, com fallback intacto.
- A PR dependente seguinte extrai somente os cálculos puros de progresso e totalização da Separação, preservando todo o código anterior de baixa, escrita remota, WAL, status e histórico.
- A ordem dos **156 scripts originais** continua idêntica; os 2 núcleos opcionais são adicionados antes dos consumidores correspondentes (158 no candidato).
- **Nenhum dos 14 domínios está concluído**, pois o `app9240.html` comercial ainda precisa de inventário de funções e extrações graduais. Não interpretar a preparação como aprovação para merge.

## O que foi de fato separado
- O carregador original tem **156 scripts adicionais**; agora estão agrupados em **16 sequências nomeadas**, em `app-stable3.html`. Uma sequência é um *bloco de inicialização*, não um módulo isolado de negócio.
- O arquivo `hlgb-modules/ownership-v9600.json` identifica o **responsável principal** de cada um dos 156 scripts em **14 domínios**. O índice serve para saber onde corrigir sem misturar assuntos. Há dependências cruzadas: não deve ser usado para descarregar arquivos ou trocar sua ordem.
- `tests/hlgb-module-boundaries-v9600.cjs` exige **exatamente o mesmo conjunto e ordem** de scripts da versão comercial anterior; nenhum arquivo foi removido, renomeado ou alterado nessa etapa.
- Um grupo **não é recurso desativável**. Todos continuam a ser carregados como antes. Mantemos acesso, login, operações, histórico, WAL, políticas, imagens, banco e formulários.
- O arquivo principal `app9240.html`, de quase 1,9 MB, **ainda não foi dividido**. Esta é a primeira camada modular de organização/ownership do carregamento, não a modularização integral do ERP.

## Áreas de responsabilidade
| Domínio | Primeiro conjunto de funções | Atenção ao corrigir |
|---|---|---|
| Base e infraestrutura | entrada, patches e regras gerais | nunca criar nova inicialização concorrente |
| Sincronização e WAL | gravação, ACK, IndexedDB, replay, realtime | evitar apagar fila sem conteúdo + opId provados no remoto |
| Pedidos e Projeção | pedido, catálogo, grade, projeção | múltiplos modelos e cor × tamanho; manter IDs e histórico |
| Corte e Cortadores | programação, grade, folha, pesagem, filas | garantir gravação provada e evitar corte duplicado |
| Produção e Separação | baixa, etapas, entrega | validar por modelo/variação, não só status agregado |
| Facções e Acertos | envio, devolução, troca de facção, pagamentos | preservar pagadores, beneficiários e transações |
| Financeiro e Notas | Hub, NF, valores, vendas | não misturar regra de preços de Notas com Rotas |
| Folha e Pessoal | funcionários, passagem, folha, provisões | editar por funcionário, guardar ordem e salários |
| Compras e Estoque | materiais, fornecedores, planejamento | estoque por lote, unidade e origem |
| Utilidades e Etiquetas | rotas LEVAR/BUSCAR e impressão | salvamento de rota independente de preço |
| Auditor e Monitor | diagnósticos, relatórios de falhas | diferenciar teste efetuado de não testado |
| Assistente e IA | consultas, importações e aprendizado | nunca atuar em registros financeiros sem confirmação |
| Impressora 3D | produtos, estoque, catálogo 3D | manter isolamento comercial |
| Interface e Mobile | busca, telas, melhorias visuais | nunca quebrar Safari ou campos de cadastro |

## Etapas seguintes
1. **Separação física do módulo Corte** (programação, folha A4, pesagem e fila). Extrair gradualmente ações do `app9240.html` por funcionalidade pequena e testada; não envolver WAL na mesma PR.
2. **Pedidos** (grade cor/tamanho, vários modelos, vínculo do Corte) e **Facções/Acertos** (envio, transferência, pagamento). Não remover nenhum campo ou botão.
3. **Financeiro e Folha**, com portões próprios de salvamento/ACK/releitura em duas sessões.
4. **Utilidades/Rotas/Etiquetas** preservando as rotas, volumes e os modelos imprimíveis.
5. **Auditor/Monitor e sincronização** migrados por último, após mapear qual camada tem autoridade final sobre cada gravação.

Cada extração deve seguir: catálogo de funções/nomes globais → teste de comportamento legado → mudança mínima isolada → testes Chrome, Safari e duas sessões → auditoria de WAL sem perda → publicação com rollback. **Não fazer um corte amplo de `app9240.html` em produção.**

## Regras de lançamento
- `main` só recebe mudanças após regressão verde e verificação de abertura. Não mexer em banco real nesta etapa.
- Guardar `releaseScripts` como fotografia da lista anterior: qualquer adição ou mudança de ordem deve ser explicitamente revisada e exigir atualização consciente do contrato.
- Corrigir **uma função por vez** no domínio dono, com teste específico, sem substituir todos os 156 arquivos por novos de uma vez.
