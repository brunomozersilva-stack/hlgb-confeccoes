# HLGB comercial na main — regressão por todos os 14 domínios (v96.01b)

**Escopo exclusivo:** `brunomozersilva-stack/hlgb-confeccoes`, branch comercial `main`. Não é a branch `feature/evolucao-laboratorio-isolado-v1-20261114`, nem uma reconstrução de tela.

Os 156 scripts comerciais anteriores continuam carregados exatamente na mesma ordem. A modularização atual **classifica responsabilidades e testes**; ela já extraiu **1 bloco físico de Corte→Produção** do monólito `app9240.html` (1.870.271 bytes na candidata, 91 scripts inline e 1 externo). Cada extração física precisa ser testada e homologada à parte.

## Como executar no checkout da branch de homologação

- `node hlgb-modules/run-module-tests-v9601.cjs --list`: mostra todos os 14 domínios e seus pacotes de testes.
- `node hlgb-modules/run-module-tests-v9601.cjs --all`: executa as 68 entradas do catálogo contra dados simulados e testes do repositório, sem banco comercial.
- `node hlgb-modules/run-module-tests-v9601.cjs --impact release-separation-commit-v9319.js`: destaca Produção/Separação e suas dependências, como Pedidos, Corte e WAL.
- `node hlgb-modules/run-module-tests-v9601.cjs --impact release-current.js`: **alto risco**, exige as 14 áreas por afetar a infraestrutura.
- `node hlgb-modules/run-module-tests-v9601.cjs --impact app9240.html`: **alto risco**, exige as 14 áreas.
- Na aba Actions, `HLGB Domain Smoke Tests v96.01` permite selecionar uma das 14 áreas para rodar seus testes e dependências.

## Pacotes de regressão do sistema comercial

| Domínio | Entradas de teste | Observação |
|---|---:|---|
| Base / infraestrutura | 4 | abertura, login, Safari e roteamento |
| Sincronização e WAL | 5 | gravação, replay e consistência |
| Pedidos e Projeção | 4 | grades, visibilidade e vinculação |
| Corte e Cortadores | 11 | programação, salvamento, impressão e filas |
| Produção e Separação | 5 | atribuição, baixa e apresentação |
| Facções e Acertos | 6 | pagamentos, beneficiários e lançamentos |
| Financeiro, Hub e Notas | 5 | valores, confirmação de gravação e pesquisa |
| Folha e Pessoal | 4 | passagem, provisões e proteção de salário |
| Compras e Estoque | 4 | materiais, fornecedores e conferências |
| Utilidades e Etiquetas | 4 | impressão e rotas |
| Auditor e Monitor | 4 | diagnóstico, WAL e confiabilidade |
| Assistente e IA | 4 | consultas e pedidos |
| Impressora 3D | 4 | acesso, persistência e hidratação |
| Interface / mobile | 4 | estabilidade visual, Safari e navegação |
| **Total** | **68** | 14 domínios catalogados |

A mesma prova pode fazer parte de uma suíte mais ampla. **68 são entradas de teste nos pacotes**, não 64 funcionalidades homologadas, nem prova de que todas as operações comerciais funcionam.

## Regra para corrigir falhas sem comprometer os funcionários

1. Registrar o erro real, a função utilizada e o domínio proprietário.
2. Conferir qual registro e qual autoridade salva (Supabase, cache, IndexedDB/WAL), **sem apagar pendências**.
3. Criar primeiro teste que reproduza o erro atual. Corrigir em uma PR de um único domínio; executar regressão da área e dependências.
4. Preservar login, telas, botões, filtros, impressões, histórico, IDs, grades e dados anteriores.
5. Verificar em Safari e Chrome, além da sincronização entre dois navegadores, com dados seguros de teste.
6. Somente após testes e aprovação explícita considerar merge na `main`, que pode publicar o programa em uso.

**Ainda falta:** extração física dos 91 blocos restantes do `app9240.html`, inventário de cada função/contrato e homologação das áreas com usuários de teste. `Actions queued` não é teste aprovado.

**Núcleo puro de Etiquetas v96.02b:** a PR dependente separa somente dois cálculos de apresentação do script já existente. Preserva os 156 scripts anteriores e o `app9240.html`; o catálogo de execução passa para 157 scripts. Nenhum módulo completo foi homologado.

**Produção/Separação v96.03b:** extração de cálculos puros de progresso e totais do script comercial já existente, com fallback e gravação autoritativa preservados. O `app9240.html` e os fluxos de salvamento continuam não modularizados. Na branch candidata a carga passa de 157 para 158 scripts (156 antigos + Etiquetas + Separação).

**Corte-alvo v96.05b:** extração limitada à leitura do pedido ativo e do produto único destinado ao corte após Separação. O código comercial da gravação segue no mesmo arquivo, com fallback e testes comparativos em 213 cenários. A branch candidata tem 159 scripts (156 originais e 3 núcleos puros); nenhuma área foi homologada como completa.

**Extração física v96.07:** `node --test tests/hlgb-main-inline-cut-production-v9607.cjs` compara 9 cenários da rotina de quantidades do Corte com a implementação original, além de restaurar o HTML anterior byte a byte. A verificação do navegador isolado usa Chromium/WebKit com rede comercial bloqueada. Essa extração não comprova o funcionamento integral do ERP nem autoriza merge.
