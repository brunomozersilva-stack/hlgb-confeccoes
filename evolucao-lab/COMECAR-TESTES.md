# HLGB Evolução — Como começar a testar os módulos

**Situação:** central de avaliação manual independente, não homologação ou instalação no sistema em produção.

## O que é possível fazer agora

A página `homologacao-modulos.html` organiza 76 funcionalidades antigas identificadas em 19 módulos, associadas a 43 critérios de paridade mais detalhados. Para cada função, mostra fonte legada, teste existente, roteiro esperado, disponibilidade da demonstração e resultado selecionável.

**Oito exercícios parciais interativos disponíveis neste pacote:**

| ID | Módulo | Exercício |
|---|---|---|
| PAR-012 | Produtos | Consulta a catálogo fictício |
| PAR-034 | Facções | Busca de facção em acertos |
| PAR-035 | Acertos | Incluir acerto fictício |
| PAR-036 | Acertos | Editar quantidade, preço e facção |
| PAR-038 | Acertos | Calcular abatimento e acréscimo |
| PAR-043 | Acertos | Conferir desconto de travetada |
| PAR-044 | Acertos | Seleção e fechamento fictício em lote |
| PAR-047 | Hub | Buscar, filtrar e exportar lançamento fictício |

As restantes **68 funções não possuem demonstração específica equivalente**. Elas já podem ser registradas como pendências, mas **não podem ser aprovadas no formulário como se estivessem implementadas**.

## Primeiro ciclo completo para conferir de ponta a ponta

1. Abra **Central Operacional 2.0** a partir do índice. Entre em **Acertos** e edite `AC-1041` (Doll Crystal, facção Roseli): quantidade 200, preço 0,80 e travetada 0,05. Confira o total previsto de **R$ 150,00**.
2. Crie outro acerto fictício para Fran com 40 peças, preço 0,50, travetada 0,05 e abatimento total de 1,00, justificando a alteração. Confira **R$ 17,00**.
3. Selecione **AC-1041** e **AC-1042**, simule o pagamento em lote e confira o total **R$ 250,80**, sem clicar no programa operacional.
4. Abra **Hub Financeiro**, filtre **Criados na sessão** e procure `1041`. Verifique que existe apenas uma saída vinculada ao acerto e que o valor foi mantido.
5. Clique em **Baixar evidência JSON** no Hub e envie o arquivo no chat. Ele inclui todos os acertos fictícios, lançamentos, rota, histórico e indicadores simples de integridade, sem dados da empresa.
6. Entre em **Facções**, mude a posição de Roseli na rota e confirme a sequência. Em seguida, use **Restaurar dados fictícios** para reiniciar.

Estes são testes **demonstrativos e interativos** dos fluxos disponíveis, não homologação de registros, dados ou banco de produção. Os demais módulos continuam listados na Central de Testes com estado não implementado quando não houver demonstração real.

## Serviços avulsos de embalagem e travetada (novidade da prévia)

- Abra **Central Operacional 2.0 → Acertos e pagamentos → Novo acerto** e escolha **Embalagem**. A seleção passa a mostrar apenas embaladeiras fictícias, e o campo de preço apresenta um valor de exemplo quando o modelo está na pequena lista de testes.
- **Exemplo numérico:** selecione Camisola Melina, 20 peças, sugestão fictícia de R$ 0,25, abatimento total de R$ 1,00 e motivo registrado. Resultado esperado: **R$ 4,00**. O preço pode ser editado manualmente e modelos novos podem ser digitados.
- Simule o pagamento individual ou em lote. Na confirmação, selecione opcionalmente um **PDF criado para teste**, nunca um comprovante real. Só o nome do arquivo é associado ao lançamento fictício; a prévia não lê, guarda nem envia o conteúdo do PDF.
- Em **Travetada**, a lista passa a mostrar apenas a travetadora demonstrativa. Com Calcinha Tammy, 10 peças e R$ 0,06 como preço de exemplo, o total é **R$ 0,60**.
- Filtre por serviço e pesquise a embaladeira ou travetadora em Acertos. Em **Facções**, confira os quadros separados dos prestadores avulsos. No **Hub**, confira vínculo, valores, nome do PDF e exporte a evidência JSON.
- Valores, modelos e prestadores são **exemplos sintéticos** para validar a interface; não representam a tabela de preços ou as pessoas cadastradas no HLGB.

## Como usar

1. Extraia `HLGB-Evolucao-Previa.zip`, entre na pasta `HLGB-Evolucao-Previa` e abra o arquivo `index.html`.
2. Clique em **Central de Testes por Módulo**. Comece por Acertos e pagamentos avulsos, em seguida Facções e rotas e Hub Financeiro.
3. Escolha a função, clique em **Ver roteiro e critérios** e siga os passos em **Abrir demonstração em outra aba** quando estiver disponível.
4. Marque o resultado: **Funcionou na prévia**, **Falhou na prévia**, **Precisa desenvolver**, **Bloqueado** ou **Revisão necessária**. A interface não permite aprovar na prévia um item sem demonstração.
5. No campo de observação, descreva o comportamento e, se necessário, a diferença em relação ao programa antigo, usando **apenas exemplos fictícios**.
6. Clique em **Baixar relatório JSON** antes de fechar a página. O documento serve para continuar depois em **Continuar relatório anterior** ou para enviar ao ChatGPT. Nada é salvo automaticamente na nuvem.

## Importante para interpretação dos resultados

- Marcar **Funcionou na prévia** significa apenas que aquela experiência demonstrativa funcionou ao ser testada. **Não é homologação da função antiga versus a nova**.
- O programa antigo e o banco de produção continuam sem alterações. Não testar pagamentos, baixa de estoque nem exclusão de registros reais por causa desta prévia.
- O teste visual no WebKit do GitHub Actions não substitui usar Safari em iPhone físico; nem comprova duas sessões Supabase/IndexedDB com contas reais.
- O inventário atual é **preliminar**. As 76 funções cobrem referências existentes, não afirmam que todas as funções do ERP foram encontradas.
- O Plano Mestre continua com **266 itens pendentes de homologação de produção**, distribuídos em 13 frentes.
- Os resultados exportados devem ser revisados e convertidos em tarefas na branch isolada com critérios de aceite, sem deletar funcionalidades antigas.
- A central funciona offline e não contém código de produção, chamadas externas, localStorage ou service workers.

## Critérios para um módulo realmente ficar pronto para ser testado integralmente

- Todas as funções antigas do módulo listadas e os comportamentos reproduzidos com dados sintéticos, inclusive exceções.
- Interface nova e antiga comparadas no desktop e no celular.
- Salvar, editar, consultar e recuperar dados executados no **ambiente independente**, com testes de rede lenta, perda de confirmação e duas sessões.
- Provas de não duplicação, preservação de histórico, arquivo anexo e integridade financeira quando aplicável.
- Suíte automática passando em Chromium e WebKit, com execução isolada e sem mutações reais.
- Funcionalidade aceita formalmente pela responsável antes de qualquer substituição ou merge.

**Primeiro foco:** Acertos / Facções / Hub, pelo risco de pagamentos, desaparecimento de lançamentos e inconsistências de sincronização. Em paralelo, construir ambientes de teste interligados para Pedidos → Corte → Produção → Separação, seguidos por Compras/Estoque, Folha, Auditor e Impressora 3D.
