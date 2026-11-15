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

## Novo teste: Guardião de Preservação — não liberar módulos com funções perdidas

Na página inicial da prévia, abra **Guardião de Preservação** (`guardiao-preservacao.html`).

1. Confira **76 funções, 19 módulos, 30 funções P0 e 43 critérios detalhados**, com **0/76** homologados para implantação. O painel não representa uma análise de banco real.
2. Filtre **P0** para encontrar salvamento, sincronização, devolução, folha, Hub e outras áreas críticas. Use a busca para localizar `PAR-045` (salvar no Hub) e `PAR-030` (histórico de facções).
3. Entre no módulo **Acertos e pagamentos avulsos** e expanda os critérios de cada função. É possível consultar as referências antigas e o roteiro de conferência desktop/mobile sem editar o programa.
4. Filtre as demonstrações. São **8 parciais** e **68 sem demonstração mapeada**. Clicar em uma demonstração abre o simulador separado.
5. Na **Central de Testes — 76 funções**, marque resultados usando apenas dados fictícios e exporte o JSON; volte ao Guardião e use **Importar testes da Central**. O painel mostra a avaliação da prévia, mas mantém o indicador de liberação em **0/76**.
6. Exporte **Pendências CSV** ou **Bloqueios JSON** para analisar os gargalos. O campo `publicationBlocked` do JSON permanece `true`; `releaseApproved` é `false` e há 76 motivos de bloqueio.
7. Teste um relatório incompatível ou com `passed` em funções sem demo: a importação deve ser rejeitada. Mesmo 8 demonstrações com resultado positivo não autorizam produção.
8. Para garantir que nenhum arquivo original sumiu no código, consulte os testes automatizados de **229 arquivos legados (hash congelado)** e do **Guardião** nas ações do GitHub.

**Escopo real:** é um painel de auditoria **estático/offline**, não homologação do sistema novo. A referência de uma função ou teste antigo não demonstra que ela existe no novo ERP. A liberação não pode ocorrer apenas importando um relatório; depende de trabalho técnico e aprovação formal posterior.

## Novo teste: escolher vários modelos e calcular compras semanais

Abra **Ficha técnica e materiais da semana** no índice, ou diretamente a página `planejador-materiais.html`.

1. O exemplo inicial planeja **100 Camisolas Melina (20 P, 40 M, 40 G)** e **30 Calcinhas Tammy M**. O total deve mostrar **2 modelos, 130 peças, R$ 612,68 de consumo previsto e R$ 534,00 de compras sugeridas**. Todos esses valores são inventados para demonstrar o funcionamento.
2. Na lista de compras, confira os materiais: **9.051 g de tule** necessários, estoque fictício **200 g**, sugestão de compra **9.000 g**; **5.249 g de renda**, estoque **500 g**, comprar **5.000 g**; **9.950 cm de elástico**, estoque **3.000 cm**, comprar **7.000 cm**; **130 etiquetas**, estoque **75**, comprar **100** pelo lote mínimo.
3. Acrescente **Conjunto Paula G, 10 peças**; depois acrescente mais 5. Deve aparecer **uma única linha de Conjunto Paula G, com 15 peças**. Edite a linha para 12 peças, remova-a e confirme que o plano retorna para 130 peças.
4. Em **Fichas técnicas**, escolha **Calcinha Tammy, M, Renda**. Altere o consumo de **42 g para 52 g por peça**. A renda necessária deve subir para **5.573 g**, a sugestão de compra de renda para **5.500 g** e o valor geral de compras para **R$ 555,00**.
5. Em **Materiais / estoque**, altere a renda para **R$ 50,00/kg**, estoque fictício **6.000 g**, perda **10%** e lote **1.000 g**. A renda necessária passa a **5.676 g**, sem necessidade de comprar renda. O valor geral sugerido de compras passa para **R$ 324,00**.
6. Na aba **Por modelo**, examine a necessidade de cada insumo, a grade e o custo previsto. Os custos atribuídos a cada modelo devem fechar exatamente com o custo consolidado, mesmo quando centavos são arredondados.
7. Baixe a lista em **CSV** e o relatório **JSON**. O JSON deve incluir `plan`, `bom`, `materials`, `perModel`, `byMaterial`, `summary` e verificações de consistência em `checks`. Clique em **Restaurar simulação** e confirme que o estado inicial é reconstituído.

**Não é uma lista de compras real:** as fichas técnicas, coeficientes por tamanho, preços, percentuais de perdas e saldos de estoque são apenas exemplos. Ainda falta cadastrar os insumos verdadeiros e seus fornecedores, conectar estoques e pedidos num banco exclusivo de homologação e validar conversões, lotes, devoluções, impostos, fretes e permissões.

## Novidade: folha de corte, materiais e aproveitamento

Na demonstração **Pedidos → Corte → Produção → Separação**, entre em **Corte**, localize a variante fictícia **PD-100 / Camisola Melina / Preto / P** e registre 20 peças. No diálogo da ficha de corte:

- Escolha o tipo de cortador **Interno** ou **Externo** e confirme que o prestador fictício muda junto. O **infestador** e as duas pessoas responsáveis pela conferência também são selecionados.
- Escolha **Tule** (valor sintético de R$ 18/kg); peso disponibilizado **500 g**; peso utilizado **420 g**; lixo / resíduo **50 g**. O sistema deve calcular **30 g de sobra** e **R$ 8,46** de custo aproximado para os 470 g consumidos.
- Tente registrar 470 g usados e 50 g de lixo contra 500 g disponibilizados: deve bloquear. Experimente escolher a mesma pessoa para as duas conferências: deve bloquear.
- Depois de registrar, a área **Folhas de corte desta sessão** deve mostrar os totais e o agrupamento por modelo/material, com os 20 itens cortados. Em **Auditoria**, veja cortador, infestador, conferentes, peso e custo.
- Exporte o JSON e confira o objeto `materialSummary`, os detalhes em `movements[0].cutSheet` e as verificações `pesosConservados`, `folhasDeCorteComDados` e `conferenciasDistintas`.

**Limitações importantes:** não há ficha técnica real de consumo por peça, estoque físico, compra de matéria-prima, assinatura eletrônica nem contabilização de custos no financeiro. Os três preços por kg são inventados para validar interface e cálculos. A inclusão de pessoas no formulário identifica apenas personagens fictícios, não constitui assinatura válida.

## Teste integrado de Pedidos → Corte → Facções → Retorno → Separação

A página **fluxo-producao-integrado.html** permite executar, na mesma sessão, cinco movimentos fictícios vinculados à **mesma grade por cor e tamanho**. Ela é uma prévia adicional e **não altera** os 8 exercícios de homologação já catalogados; ainda falta avaliar equivalência com as rotinas legadas.

1. No índice, abra **Pedidos → Corte → Produção → Separação**. O total inicial fictício é de **390 peças pedidas, 200 cortadas, 160 enviadas às facções, 130 retornadas e 70 separadas**, somando as quatro encomendas de exemplo.
2. Em **Pedidos**, busque **Camisola Leidiane Preto M**. Somente uma variante deve aparecer, sem misturar com a cor Rubi. Limpe os filtros.
3. Em **Produção / Facções**, tente enviar **PD-100 / Camisola Melina / Preto P** antes do corte. O botão deverá permanecer bloqueado.
4. Em **Corte**, selecione **PD-100 / Preto P**, tente registrar 21 peças (deve bloquear) e depois confirme **20 peças**. Total cortado: **220**.
5. Em **Produção / Facções**, envie essas 20 peças à **Fran Demo**. Total enviado: **180**.
6. Em **Retornos**, a mesma grade aceitará retorno de no máximo 20 peças pela mesma facção. Registre **18**. Total retornado: **148**.
7. Em **Separação**, confirme **10 peças**, depois **8 peças**. O saldo a separar dessa variante deve virar zero, e o total separado da demonstração deve chegar a **88**. Uma terceira baixa da mesma variante deve ficar indisponível.
8. Entre em **Auditoria** e baixe o JSON. Confira **5 movimentos, 4 pedidos, 14 variantes**, todos os indicadores `checks` verdadeiros e histórico de envio e retorno pela facção que você selecionou. Utilize **Reiniciar exemplos** para restaurar a sessão.

**Limite:** a movimentação não representa pedidos reais nem altera corte, estoque, facções, pagamentos ou separação no banco. Este laboratório não grava em nuvem; serve para validar regras e interface antes de criar integração segura em um banco exclusivo de homologação.

## Primeiro ciclo completo para conferir de ponta a ponta

1. Abra **Central Operacional 2.0** a partir do índice. Entre em **Acertos** e edite `AC-1041` (Doll Crystal, facção Roseli): quantidade 200, preço 0,80 e travetada 0,05. Confira o total previsto de **R$ 150,00**.
2. Crie outro acerto fictício para Fran com 40 peças, preço 0,50, travetada 0,05 e abatimento total de 1,00, justificando a alteração. Confira **R$ 17,00**.
3. Selecione **AC-1041** e **AC-1042**, simule o pagamento em lote e confira o total **R$ 250,80**, sem clicar no programa operacional.
4. Abra **Hub Financeiro**, filtre **Criados na sessão** e procure `1041`. Verifique que existe apenas uma saída vinculada ao acerto e que o valor foi mantido.
5. Clique em **Baixar evidência JSON** no Hub e envie o arquivo no chat. Ele inclui todos os acertos fictícios, lançamentos, rota, histórico e indicadores simples de integridade, sem dados da empresa.
6. Entre em **Facções**, mude a posição de Roseli na rota e confirme a sequência. Em seguida, use **Restaurar dados fictícios** para reiniciar.

Estes são testes **demonstrativos e interativos** dos fluxos disponíveis, não homologação de registros, dados ou banco de produção. Os demais módulos continuam listados na Central de Testes com estado não implementado quando não houver demonstração real.

## Novo teste: devolução de peças e compensação financeira sem apagar lançamentos

1. Na **Central Operacional 2.0 → Acertos**, localize a **Calcinha Tammy (AC-1039)**, que começa com **350 peças**. Clique em **Devolver peças**, indique **20 peças** e um motivo com pelo menos cinco caracteres. O acerto deve permanecer pendente com **330 peças** e **R$ 79,20**. Não é permitido devolver todas as peças nem deixar um total negativo nesse fluxo. Clique em **Histórico** para conferir antes/depois e o motivo.
2. Edite e pague o **Doll Crystal (AC-1041)** como no teste anterior, chegando a **R$ 150,00**. Depois clique **Corrigir pago**, informe **R$ 25,00** e um motivo. O acerto e pagamento originais devem permanecer com **R$ 150,00**. No Hub, deverá existir uma **nova compensação de −R$ 25,00**, vinculada ao mesmo ID, com saldo líquido **R$ 125,00** para esse acerto.
3. Tente corrigir mais de **R$ 125,00**: a confirmação deverá ser bloqueada. Ajustes posteriores são separados, limitados pelo saldo e não alteram a linha original.
4. Clique em **Histórico** para ver criação/edição/pagamento/correção, sem excluir eventos. No **Hub**, baixe o JSON de evidência e confirme as listas `historicoPorAcerto`, `hub` e os indicadores de integridade.
5. **Limite da prévia:** não há movimentação real de dinheiro, nota de crédito, baixa de estoque, cancelamento integral nem gravação durável. As regras futuras de devolução total e estorno real exigem um fluxo adicional de aprovação e conciliação no banco isolado.

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
