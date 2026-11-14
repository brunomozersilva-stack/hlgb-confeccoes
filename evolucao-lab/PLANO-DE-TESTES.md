# Plano de testes da entrega — HLGB Evolução (Etapa de protótipos)

**Execução somente em branch isolada.** Não envolve alterações no banco, pagamentos, estoque, WAL ou arquivos já utilizados pelo HLGB.

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
