# Conferência funcional crítica — Acertos, Facções e Hub Financeiro

## Escopo e proteção de dados

- Matriz detalhada de **43 cenários**: Acertos **22**, Facções **12** e Hub Financeiro **9**, todos classificados como **pendentes**.
- A matriz aponta os scripts e linhas em que comportamentos estão identificados. Isso é **levantamento de código**, não evidência de funcionamento efetivo nos dois navegadores da empresa.
- Esses 43 cenários aprofundam **parte** do inventário geral de 76 funcionalidades. Não os somar para dizer que há 119 recursos distintos.
- Nenhum registro empresarial, pagamento, fila WAL, tabela Supabase, arquivo de produção ou versão `main` foi alterado.
- Página isolada: `paridade-critica.html`, com pesquisa, filtros e comparador visual antes/depois, incluindo critérios mobile.
- O botão **Separar para revisão** é somente visual nesta sessão, sem gravar, persistir, homologar ou aprovar remoção.

## Riscos especialmente relevantes

1. `release-faction-manual-payment-v9566.js` contém loops de gravação de linhas, além de saída financeira por grupo. O tratamento de confirmação parcial é uma proteção útil, mas **não substitui transação atômica** que mantenha linhas e Hub consistentes em conjunto.
2. Edição pendente, cancelamento lógico e ajuste não podem desaparecer ao redesenhar o formulário. O legado preserva IDs e histórico em várias situações; a nova versão precisará demonstrar comportamento correspondente.
3. Pagamento **já realizado** não deve ser reescrito silenciosamente. Diferenças pagas a mais/a menos e suas compensações exigem registros próprios, com origem, motivo e conferência.
4. `release-faction-operations-v9520.js` verifica pendências da WAL e utiliza RPC para alterações operacionais. Transferência, travetada e material devem preservar histórico e impedir dupla execução.
5. `release-hub-save-proof-v9567.js` possui uma camada que observa salvamento por callback. A modernização precisa identificar a autoridade de escrita **efetiva**, garantindo ACK e releitura sem status fictício.
6. O Hub possui filtros, totais e ações de edição, exclusão e marcação como realizado. Essas ações não podem sumir no novo visual e exigem permissões, histórico e proteção contra conflitos.
7. A modernização mobile deve assegurar que campos de quantidade, preço, revisão de comprovantes e estados de gravação continuem acessíveis sem rolagem horizontal da página.

## Confirmação necessária antes de substituir módulos

Para **cada cenário**, registrar:

- comportamento antigo reproduzido em ambiente de teste e origem da evidência;
- funcionalidade nova equivalente, no desktop e no celular;
- valores antes/depois, exceções, cancelamentos, histórico e arquivos;
- comparação por funcionário/setor, sem testes em produção;
- revisão técnica de concorrência e operações financeiramente atômicas;
- plano de retorno compatível com registros existentes e filas WAL pendentes;
- aprovação da usuária.

## Testes automatizados desta etapa

- `tests/paridade-critica-contract.cjs`: 43 cenários identificados, linhas de código existentes e isolamento da interface.
- `tests/paridade-critica-mobile.cjs`: Chromium e WebKit em 320, 375, 390, 768 e 1280 pixels, filtro por setor, busca, consulta de comparação e ausência de acesso à rede.
- O workflow `.github/workflows/evolucao-lab-isolado.yml` executa apenas testes do laboratório; não publica nem integra arquivos existentes.

**O resultado positivo da bateria não valida a paridade funcional antiga versus nova: este trabalho ainda está pendente.**
