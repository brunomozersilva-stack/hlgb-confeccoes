# HLGB Evolução — Como começar a testar os módulos

**Situação:** central de avaliação manual independente, não homologação ou instalação no sistema em produção.

## O que é possível fazer agora

A página `homologacao-modulos.html` organiza 76 funcionalidades antigas identificadas em 19 módulos, associadas a 43 critérios de paridade mais detalhados. Para cada função, mostra fonte legada, teste existente, roteiro esperado, disponibilidade da demonstração e resultado selecionável.

**Exemplos da lista original de exercícios parciais (agora são 49, incluindo Folha, Corte, Acertos, compensações e Operação Integrada):**

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

As restantes **27 funções não possuem demonstração específica equivalente**. Elas já podem ser registradas como pendências, mas **não podem ser aprovadas no formulário como se estivessem implementadas**.

## NOVO — Compensação de um acerto fictício já pago (sem apagar pagamentos)

Abra a Operação Integrada em `operacao-integrada.html#acertos` pela prévia HTTPS. Use apenas dados inventados.

1. Em **Acertos**, cadastre serviço de embalagem avulsa para uma Calcinha Tammy: 100 peças × R$ 0,15 = **R$ 15,00**. Pode testar travetada como desconto adicional, se desejar.
2. Entre no **Hub**, localize o título a pagar do acerto e marque **Quitado ficticiamente**. Volte a Acertos: o acerto original deve estar **pago**.
3. Em **Compensação separada de acertos pagos**, selecione esse acerto, lance **-R$ 2,00**, referência `AJ-TESTE-001` e motivo "Diferença na conferência". O Hub deverá criar um novo título **a receber** de R$ 2,00.
4. Registre uma segunda compensação com **+R$ 1,00**, referência `AJ-TESTE-002`, que criará título separado **a pagar** de R$ 1,00.
5. Confira a situação: o título original de R$ 15,00 e seu status **pago** não foram modificados. As duas compensações ficam em registros `CMP-...` com referências únicas.
6. Tente lançar outra correção no mesmo acerto usando `AJ-TESTE-001`. Deve ser bloqueado, inclusive com diferença de maiúsculas/minúsculas.
7. Clique em **Conferência PDF** de uma compensação. No diálogo de impressão, selecione imprimir ou "Salvar como PDF". Verifique acerto original, título novo, referência e diferença. **Não é comprovante bancário.**
8. Marque um dos títulos de compensação como pago ficticiamente no Hub. Apenas essa compensação deve mudar de situação. Atualize a página e confira que todas as informações persistiram neste navegador. Exporte o JSON/CSV para registrar a prova.

**Ainda não disponível:** anexar comprovante PDF bancário à produção, corrigir pagamentos reais com contabilização ou compensações legais, fechamento fiscal, múltiplas contas bancárias, conciliação externa e sincronização entre computadores.

## NOVO — Consultar acertos e compensações sem modificar lançamentos

Na Operação Integrada, abra **Acertos e pagamentos avulsos**, após realizar o exercício de compensação.

1. Pesquise pelo código do acerto, nome fictício da facção, modelo, serviço ou referência de compensação. A pesquisa por referência também mostra o acerto original.
2. Combine os filtros **Situação do acerto**, **Facção/embaladeira** e **Tipo de serviço**; confirme a quantidade de resultados e a soma fictícia exibida.
3. Filtre compensações **Em aberto** ou **Quitadas** e verifique que os títulos continuam vinculados ao acerto pago original.
4. Navegue ao Hub e volte. Os filtros de consulta devem permanecer selecionados. Use **Limpar filtros** para voltar a ver todos os registros.
5. Exporte o JSON e recarregue. Os valores e eventos devem permanecer idênticos; filtrar não altera a revisão do documento nem os títulos.

**Limitação:** esses filtros não buscam dados reais, não pagam títulos e não são uma prova da consulta multiusuário de produção.

## NOVO — Como testar Facções, Acertos e Hub integrados

Abra `operacao-integrada.html#acertos`. Todo o exercício usa modelos, pessoas e valores inventados; não há pagamentos efetivos.

1. Em **Pedidos**, crie uma Calcinha Tammy de 10 P. Faça o corte das 10 peças na área Corte.
2. Em **Facções**, envie 8 peças à Oficina Exemplo A. Cadastre preço específico de R$ 3,00 para a Tammy na Oficina Exemplo B; registre a transferência do pedido para a Oficina B, com justificativa, **antes do retorno**.
3. Registre retorno de 5 peças na Oficina B. Como ela não traveta, o valor por peça será R$ 2,50 (R$ 3,00 − R$ 0,50 ilustrativos), total do acerto **R$ 12,50**.
4. Ative a travetada da Oficina B, com motivo; devolva outras 3 peças pelo formulário **Registrar retorno parcial** em Facções. O segundo acerto deve usar **R$ 3,00/peça**, sem recalcular o primeiro.
5. Em **Acertos**, abra **Novo acerto avulso**, escolha Embalagem da Calcinha Tammy e informe 100 peças a R$ 0,15 com R$ 0,05 de desconto por peça. Total **R$ 10,00**, vinculado a uma conta a pagar fictícia.
6. Use **Devolução parcial** de 10 peças com justificativa. O acerto avulso deve passar a 90 peças e **R$ 9,00**, mantendo o histórico anterior. Acrescente depois R$ 1,00 no ajuste, totalizando **R$ 10,00** novamente.
7. No **Hub**, localize esse título e marque-o como pago apenas ficticiamente. O acerto deve aparecer como pago e novos ajustes, retornos ou devoluções diretas devem ser bloqueados.
8. Confira o histórico, use a busca de facções/acertos, atualize a página e exporte o JSON para provar as quantidades e valores.

**Limites importantes:** a troca de facção só funciona para transferência total antes do primeiro retorno; não há compensação de título pago nem comprovantes PDF anexados. Os valores de embalagem e travetada são apenas exemplos. Um teste bem-sucedido não autoriza integrar essas rotinas ao HLGB real.

## NOVO — Como testar o Corte Avançado por lote

Abra diretamente `operacao-integrada.html#corte` ou o botão **Corte Avançado** da entrada. Se ainda não existir pedido fictício, vá a Pedidos e crie uma Camisola Melina com grade **10 P, 10 M, 0 G, 0 GG**.

1. **Editar grade:** teste alterar M para 12 e salvar. Confira o novo valor no título a receber do Hub. Volte a M=10. A edição deve ser bloqueada caso tentasse reduzir abaixo do que já foi cortado ou reservado.
2. **Planejar:** no Corte, crie uma folha `COR-0001` com 4 P e 4 M, cortador 1 "Ana Cortadora", cortador 2 "Beto Cortador", enfestador "Carla Enfestadora" e equipe interna. Planeje outra folha com 3 P e 3 M, equipe externa. O estoque não deve mudar neste momento.
3. **Alterar um lote aberto:** use "Modificar ou cancelar folha" na segunda folha. Troque para 5 P e 4 M. A grade do pedido deve continuar dentro do limite. O peso teórico acompanha as novas quantidades.
4. **Concluir a primeira folha:** informe peso útil **960 g**, lixo **100 g**, conferência digitada "Ana Cortadora" e "Beto Cortador". Deve debitar **1.060 g** do estoque de malha, atualizar o corte em 4 P e 4 M, e impedir a mesma baixa novamente.
5. **Imprimir:** na tabela de folhas clique **Imprimir folha**. Confira nomes dos cortadores, enfestador, origem interna/externa, grade, peso teórico, peso útil, lixo e status. Você pode imprimir em papel ou usar "Salvar em PDF" do navegador.
6. **Testes de proteção:** tente usar a mesma pessoa nos dois campos de cortador, ultrapassar a grade reservada, concluir com peso útil inferior ao teórico ou consumo acima do estoque. Nenhuma dessas tentativas deve alterar o banco fictício.
7. **Recarregar:** atualize a página e abra Corte. A folha concluída e o histórico devem permanecer no IndexedDB local. Exporte o relatório JSON para registrar os testes.

Esses valores, nomes e assinaturas digitadas são **inventados**. Não são uma folha oficial da confecção, não assinam legalmente documentos e não acessam o Supabase nem os pedidos reais. O laboratório ainda não atende todas as rotinas de Corte em produção.

## NOVO — Teste operacional integrado dos 19 módulos na mesma tela

Abra `operacao-integrada.html` na página inicial (ou dentro do ZIP offline). Não exige login, pois contém somente dados inventados. A navegação tem 19 áreas, com comandos reais **somente sobre o banco fictício IndexedDB daquele navegador**.

**Roteiro essencial de ponta a ponta:**

1. Em **Pedidos**, crie um pedido da Camisola Melina para Loja Exemplo Centro: P=8, M=12, G=0, GG=0. A encomenda gera 20 peças e um título a receber de **R$ 798,00**.
2. Em **Corte**, selecione o pedido, registre P=6 e M=10 (em duas ações). O estoque de malha deve cair de 16.000 g para **14.080 g**. Experimente cortar mais 9 P: deve ser rejeitado porque supera a grade do pedido.
3. Em **Facções e rotas**, selecione Oficina Exemplo B, envie 12 peças cortadas e registre 9 peças retornadas. A facção não traveta; o simulador aplica desconto ilustrativo de R$ 0,50/peça, gerando um acerto de **R$ 49,50**.
4. Em **Acertos**, escolha o acerto `ACE-0001`, acrescente **R$ 1,00** e salve. O lançamento associado do Hub deve passar a **R$ 50,50**.
5. Em **Separação e expedição**, separe 7 peças retornadas e depois despache 5. É obrigatório bloquear tentativa de separar acima de 9 ou despachar acima de 7.
6. Em **Compras**, cadastre uma compra de 2.000 g de renda com dois conferentes diferentes e receba. O estoque de renda passa de 8.000 g para **10.000 g** e gera título a pagar. Tentar receber a mesma compra novamente é bloqueado.
7. Em **Folha**, altere a passagem fictícia de Ana Simulada para R$ 250,00, sem misturar com salário-base. Em **Impressora 3D**, cadastre um item inventado.
8. Em **Hub Financeiro**, confira títulos do pedido e do acerto, e marque um título fictício como quitado. O mesmo título não pode ser quitado duas vezes.
9. Em **Relatórios** e **Auditor**, confira os totais e o histórico. Clique em **Exportar evidências JSON** e salve a prova. Esse arquivo indica `productionApproval:false` e `parityApproved:false`.
10. Atualize a página e confirme que pedidos, cortes, facções, acertos, compra, folha e histórico continuam no **mesmo navegador**. Em outra aba do mesmo perfil, altere um lançamento; tentar salvar um rascunho aberto com revisão antiga deve dar **CONFLITO**.
11. Explore também **Produtos e ficha técnica**, **Estoque**, **Cadastros**, **Central de erros**, **Bot**, **Login e permissões** e **Núcleo**, registrando sugestões e funções ausentes na Central de Testes por Módulo.

**Escopo:** as 19 áreas são navegáveis, com rotinas parciais de cadastro e operações relacionadas. Não há implementação equivalente de todas as 76 funções do legado; não existe envio de PDF, cálculo legal da folha, impressão de etiquetas, RLS, login real, nem sincronização entre computadores. O botão "quitar" é simulado e não movimenta dinheiro.

**Importante sobre persistência:** o IndexedDB pode depender do navegador e da forma de abertura do arquivo. Para testar gravação e recarga, prefira a prévia HTTPS no Chrome ou Safari. No ZIP aberto diretamente por `file://`, restrições do navegador podem limitar armazenamento local; não use a prévia como base de dados empresarial.


## Testar agora: Folha 2.0 com edição e passagem por funcionário

Acesse **Folha 2.0 — passagem e salvamento** na entrada ou abra `folha-homologacao.html`. O laboratório usa **cinco funcionários inventados** e **competência 11/2026 fictícia**. Não funciona com a folha de produção.

1. Confira o resumo inicial: **5 funcionários**, salários líquidos simulados **R$ 10.280,00**, passagens **R$ 550,00** e custo com provisões ilustrativas **R$ 12.793,88**. Os valores não incluem encargos legais.
2. Pesquise **Bianca Teste**. Clique em **Editar** e mude a passagem de **R$ 80,00 para R$ 140,00**. O resumo das passagens deve passar a **R$ 610,00**, e o custo demonstrativo a **R$ 12.853,88**.
3. Clique em **Salvar e conferir**. A mensagem só pode indicar sucesso depois da leitura do registro no IndexedDB. Atualize a página e confira se **Bianca Teste continua com R$ 140,00**.
4. Alterne a ordenação **Nome alfabético** e **Por confecção**. Os números e o funcionário selecionado não podem mudar indevidamente após salvar.
5. No mesmo navegador, abra uma segunda aba na mesma URL. Na segunda aba altere o salário de **Ana Exemplo** e salve. Na primeira aba tente mudar novamente a passagem de **Bianca Teste**. Deve surgir **conflito**, sem perder o rascunho nem substituir a atualização da outra aba. Use **Reavaliar conflito**, confira e salve novamente se desejar.
6. Em **Cenário de teste**, escolha **Falha de releitura**. Altere a passagem de **Carlos Simulado** e salve. A tela deve dizer **inconclusivo** e impedir outra gravação até você clicar em **Conferir última gravação**.
7. Use **Baixar relatório JSON** ou **Baixar resumo CSV** para avaliar os cálculos. No JSON, `productionApproval` permanece `false` e `environment` é `browser-indexeddb-only`. A restauração dos valores de exemplo exige confirmação e registra a ação no histórico.

**O que essa prévia ainda NÃO testa:** CPF, funcionários reais, passagens da sua folha, cálculo de FGTS/INSS/IRRF, fechamento bancário, Hub, pagamentos reais, permissões empresariais e sincronização entre computadores. A persistência é **somente naquele navegador**, não no Supabase. É um exercício funcional inicial, não uma folha contábil.


## Nova prova técnica: sincronização com PostgreSQL descartável e dois navegadores

O workflow de GitHub Actions **HLGB Evolucao - Sync Persistente em PostgreSQL Descartavel** utiliza dois navegadores separados contra um servidor de testes em localhost e banco temporário. É um teste automatizado que **não disponibiliza uma URL pública de banco**.

Os testes verificam: duas sessões com revisões concorrentes; salvamento e releitura por ID; WAL IndexedDB após atualizar a página; perda de conexão antes do envio e reenvio manual; ACK perdido depois de commit; reinício do servidor sem perder o lançamento fictício; concorrência no PostgreSQL e tentativas de reutilização indevida do mesmo ID.

O relatório de evidências fica nos anexos da execução do GitHub Actions. O usuário pode continuar testando os estados da interface em `sincronizacao-duas-sessoes.html`, que é apenas a versão fictícia offline.

**Limites:** não há cópia do banco de produção, integração com as tabelas HLGB, sessão corporativa, dados reais ou autorização de implantação. Essa prova não confirma ainda a sincronização verdadeira do sistema.


## Novo teste: salvamento confiável com duas sessões fictícias

Abra **Duas Sessões e Reconciliação** na entrada ou `sincronizacao-duas-sessoes.html`.

**ATENÇÃO:** as sessões A/B estão dentro do **mesmo navegador**, conectadas somente a um **servidor fictício em memória**. Esse exercício não prova sincronização entre dois computadores reais nem funcionamento da nuvem.

1. **Salvar e reler:** clique no cenário 1. O servidor fictício deve mostrar **R$ 120,00**, revisão **2**, um evento e zero pendências. A sessão B só muda quando lê a versão mais recente.
2. **ACK perdido:** clique no cenário 2. O servidor tem R$ 125,00 e um evento, mas a sessão A ainda exibe a versão anterior e o resultado **inconclusivo**. Não é possível salvar de novo enquanto estiver pendente. Clique em **Reconciliar por ID**: deve confirmar a operação sem duplicar o lançamento.
3. **Conflito offline:** clique no cenário 3. A fila de A foi criada com R$ 110,00 na versão 1; B gravou R$ 150,00 na versão 2; o envio atrasado de A recebeu **conflito**. Use **Reavaliar conflito**: o rascunho de A continua com R$ 110,00, enquanto a versão vista indica R$ 150,00. Se quiser confirmar a alteração, clique em **Salvar com confirmação** novamente; somente esse novo comando chega à revisão 3.
4. **Comando não encontrado:** cenário 4. A perda antes do commit gera resultado inconclusivo; a releitura marca ID **não encontrado**. Somente um clique explícito em **Reenviar mesmo ID** permite transmitir; o identificador e a revisão originais permanecem iguais.
5. **Releitura com falha:** cenário 5. O ACK foi recebido, mas não serve como comprovante sozinho. Clique em **Reconciliar por ID** antes de tratar o lançamento como salvo.
6. **Teste manual offline:** clique em restaurar, desconecte A, digite R$ 180,00 e clique em salvar. O servidor continua com R$ 100,00 até clicar em **Reconectar** e **Transmitir fila**. A sessão B permanece na versão anterior até **Ler versão atual**.
7. **Baixar evidências:** o JSON apresenta comandos, eventos, revisões, indicadores de integridade e os campos `productionApproval:false` e `realBrowserSyncTested:false`. Não existe escrita real.

Nos testes unitários existe também o cenário de **commit atrasado entre a leitura “não encontrado” e o reenvio**. A reexecução pelo mesmo ID não duplica o evento no servidor fictício.

**Ainda pendente no HLGB real:** executar essa arquitetura num servidor isolado com autenticação, controle transacional de dados, autorização, persistência e WAL em disco; testar realmente duas sessões Safari/Chrome, cortes de conexão e reconciliação de registros existentes; realizar auditoria de segurança e homologação por usuário antes de integrar.

## Novo teste: Guardião de Preservação — não liberar módulos com funções perdidas

Na página inicial da prévia, abra **Guardião de Preservação** (`guardiao-preservacao.html`).

1. Confira **76 funções, 19 módulos, 30 funções P0 e 43 critérios detalhados**, com **0/76** homologados para implantação. O painel não representa uma análise de banco real.
2. Filtre **P0** para encontrar salvamento, sincronização, devolução, folha, Hub e outras áreas críticas. Use a busca para localizar `PAR-045` (salvar no Hub) e `PAR-030` (histórico de facções).
3. Entre no módulo **Acertos e pagamentos avulsos** e expanda os critérios de cada função. É possível consultar as referências antigas e o roteiro de conferência desktop/mobile sem editar o programa.
4. Filtre as demonstrações. São **8 parciais** e **68 sem demonstração mapeada**. Clicar em uma demonstração abre o simulador separado.
5. Na **Central de Testes — 76 funções**, marque resultados usando apenas dados fictícios e exporte o JSON; volte ao Guardião e use **Importar testes da Central**. O painel mostra a avaliação da prévia, mas mantém o indicador de liberação em **0/76**.
6. Exporte **Pendências CSV** ou **Bloqueios JSON** para analisar os gargalos. O campo `publicationBlocked` do JSON permanece `true`; `releaseApproved` é `false` e há 76 motivos de bloqueio.
7. Teste um relatório incompatível ou com `passed` em funções sem demo: a importação deve ser rejeitada. Mesmo 49 demonstrações com resultado positivo não autorizam produção.
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
