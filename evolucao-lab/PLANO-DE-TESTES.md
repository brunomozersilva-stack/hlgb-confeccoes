# Plano de testes da entrega — HLGB Evolução (Etapa de protótipos)

**Execução somente em branch isolada.** Não envolve alterações no banco, pagamentos, estoque, WAL ou arquivos já utilizados pelo HLGB.

## Nova bateria — preservação de funções

1. Verificar as **76 funções inicialmente catalogadas**, cada uma com módulo e arquivo correspondente.
2. Confirmar que todas permanecem **não homologadas**, sem permissão de remoção.
3. Comparar o hash exato dos **229 arquivos legados** ao commit-base (o teste falha se algum mudar).
4. Conferir que a tela isolada `preservacao.html` não usa rede, Supabase, IndexedDB, localStorage ou outras APIs persistentes.
5. Executar navegação, pesquisa por acerto, filtro por módulo, prioridade e seleção temporária para revisão.
6. Validar em Chromium e WebKit nas larguras **320, 375, 390, 768 e 1280 pixels**.
7. Reconfirmar que o `main` permanece inalterado, sem publicação ou migração de dados.

**Não significa que 76 funcionalidades foram homologadas:** o teste confirma inventário e isolamento, não substituição real de comportamentos. A comparação antiga versus nova será uma etapa posterior com dados fictícios e aprovação humana.

## Escopo automatizado

- Validar a lista de 266 melhorias, 19 áreas de módulo, 25 dependências e 8 pontos críticos.
- Validar 19 contratos propostos de módulo e portões G0–G6.
- Checar que os arquivos do app atual não foram modificados.
- Verificar ausência de acesso remoto, IndexedDB, localStorage, sessão e APIs de gravação em ambos os protótipos.
- Chromium e WebKit em 320, 375, 390, 768 e 1280 pixels.
- Pesquisar produtos fictícios por categoria, SKU, nomes e acentos.
- Preencher acerto fictício, recalcular em centavos, validar abatimento, incluir/remover linhas e confirmar que Salvar está desabilitado.
- Filtrar relatórios fictícios e visualizar origem do registro de demonstração.
- Avaliar ausência de erros JavaScript e rolagem horizontal indesejada.

## Fora do escopo nesta etapa

- Homologação com funcionários em celulares físicos.
- Consulta real a catálogos, pagamentos ou tabelas do Supabase.
- Testes de duas sessões reais no backend de produção.
- Implementação de comandos transacionais reais, migração de banco ou feature flags.
- Aprovação de lançamento em produção.

## Política de falhas

Se qualquer verificação falhar, a mudança permanece na branch isolada. O resultado será registrado e a causa investigada sem alteração do HLGB atual.

## Portões para futuro merge

Somente com revisão técnica, testes, validação de acesso e aprovação explícita da responsável pelo projeto. Nenhum sucesso automatizado autoriza mesclar sozinho.
