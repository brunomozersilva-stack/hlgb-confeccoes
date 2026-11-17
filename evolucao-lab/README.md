# HLGB Evolução — Laboratório independente (Etapa 1)

Esta pasta é um **protótipo isolado**: não é uma tela incorporada ao HLGB em produção.

## Nova etapa — Paleta única, ficha de consumo por cor/tamanho e compras consolidadas (LAB)

O módulo opcional `modulos/planejamento-materiais-v1.js` cria três recursos independentes da execução do Corte:

1. **Paleta central de cores:** Preto, Branco e Rubi são apenas exemplos fictícios; outros nomes podem ser cadastrados uma vez e reutilizados como opção no formulário de grade dos pedidos, no cadastro das receitas e na previsão. O catálogo rejeita repetição com diferenças apenas de maiúsculas/minúsculas. Documentos locais antigos, sem catálogo, recebem esses exemplos somente no **clone da próxima transação**, com IDs únicos e preservação dos lançamentos existentes. Nenhuma cor usada em pedido antigo é renomeada.
2. **Receitas de materiais por modelo/variação:** consumo de cada componente, em gramas por peça, pode ser definido para todas as cores/tamanhos ou combinações específicas. A regra mais específica prevalece. Para o material principal, a previsão substitui o consumo básico apenas no cálculo; componentes adicionais como renda ou tule são somados. Uma nova regra preserva a versão e o motivo anteriores, que ficam marcados como substituídos; ela não reescreve corte, acerto ou pagamento já realizado.
3. **Planejamento semanal de compras:** selecione quantidades para vários modelos, cores e tamanhos, até 100 linhas ativas. O sistema gera a lista agregada de gramas por material e por modelo, compara com o **saldo fictício atual**, calcula o faltante e estima os custos a partir do preço/kg cadastrado. Linhas arquivadas são mantidas no histórico, e todas as revisões são validadas antes de gravar. A prévia pode ser consultada por JSON e CSV e aparece também nos Relatórios.

**Isolamento essencial:** o cenário representa uma **nova produção hipotética**, NÃO a produção já em curso. Não existe reserva, baixa, compra automática, previsão de entrega nem integração com fornecedor. O Corte segue utilizando o consumo principal original da ficha e mantém as baixas e movimentos anteriores. Por isso, a estimativa pode não corresponder ao consumo real de uma peça, à perda no enfesto ou às variações do estoque físico. Conferir antes de qualquer compra real.

O núcleo `core.apply` continua sendo **o único escritor** dos rascunhos e dos cadastros fictícios. O módulo de cálculo é puro e não possui rede nem armazenamento próprio. O Auditor 2.0 detecta nomes de cores repetidos, receita inválida/duplicada, modelo ou material ausente e linhas de produção repetidas. Os testes automáticos abrangem cálculo multi-modelo, custos, falta de material, receitas sobrepostas, histórico, atomicidade, migração segura, navegador Chrome e Safari/WebKit.

**A fazer para aprovação real:** ficha técnica completa por insumo e operação, unidade e rendimento por peça, perdas por material, vários materiais por cor/grade usados efetivamente no Corte, reservas de estoque, geração de compras com aprovação, autenticação, sincronização entre máquinas e homologação do inventário das 76 funções antigas. Não publicar sem autorização.

## Nova etapa — Grade por cor e tamanho em cada facção (opt-in no laboratório)

O módulo `modulos/grade-faccoes-v1.js` acrescenta uma camada de rastreamento **por cor e P/M/G/GG** sem mudar os modelos, pagamentos, estoques e pedidos históricos não classificados. No painel Facções, o operador cadastra uma linha por cor informando quantas peças da grade do pedido pertencem a cada tamanho; antes de distribuir as peças, as somas das cores precisam corresponder **exatamente** às quantidades do pedido por tamanho. A classificação é opcional, mas só pode ser criada antes do primeiro envio, para evitar inventar cores de lançamentos antigos.

A distribuição detalhada permite escolher **pedido, oficina, cor, tamanho e quantidade**, validando simultaneamente a quantidade cadastrada para aquela cor/tamanho, o corte efetivamente realizado para o tamanho e o total geral alocado. Cada envio mantém `gradeLines` com `sent` e `returned`; retornos só podem usar cor/tamanho com saldo disponível e geram acertos `ACE-...` próprios com facção, cor e tamanho congelados, vinculados ao Hub. Transferências detalhadas alteram exclusivamente o saldo pendente da cor/tamanho escolhido entre os envios `ALO-...`, preservando acertos e pagamentos anteriores; os movimentos `TRP-...` registram origem/destino, justificativa e identificação da grade.

Devoluções de peças antes da quitação usam o comando separado `settlement.grade.pieces.return`, que ajusta acerto, Hub, saldo da facção e detalhamento por cor/tamanho em uma única operação. **Após pagamento, só a compensação separada é permitida**, sem reescrever o original. As operações genéricas antigas continuam disponíveis **para pedidos não classificados**; em pedidos classificados ficam bloqueadas para evitar saldos sem identificação. Documentos anteriores sem `colorGrades` ou `gradeLines` continuam válidos, sem zerar nem migrar de modo inventado.

O Auditor e os relatórios comparam os detalhes de cor e tamanho com o pedido, o corte, os envios, retornos, transferências e acertos. Exportações CSV/JSON incluem os saldos e os registros originais. A bateria CI exige testes de integridade e operação de navegador em Chromium/WebKit.

**Ainda não concluído:** ficha técnica de consumo por cor, distribuição detalhada por lote físico/rolo, paleta central e variações do produto, leitor de etiquetas, assinaturas de facções, autenticação real, sincronização entre computadores, histórico de alterações empresariais e homologação integral da paridade das 76 funções. Os cadastros de cores são exclusivamente **inventados no laboratório**, não dados do HLGB oficial.

## Nova etapa — Transferência parcial rastreável entre facções

O comando `faction.multi.transfer` permite **redistribuir apenas peças ainda pendentes** de uma facção para outra no mesmo pedido, inclusive depois que outras peças já retornaram ou tiveram acerto quitado. A transferência é uma única operação transacional de laboratório: diminui a quantidade sob responsabilidade da oficina de origem e aumenta a da oficina de destino **sem incrementar o total de peças alocadas ao pedido, sem gerar acerto ou financeiro e sem reescrever retornos/pagamentos anteriores**.

Cada movimento recebe `TRP-...`, IDs de ambos os envios `ALO-...`, IDs das facções, quantidade, justificativa, ID de comando e saldo antes/depois de ambos os destinos. A origem mantém pelo menos uma peça atribuída nesta primeira versão de **transferência parcial**; transferência integral sem retorno continua na rotina anterior, quando aplicável. Os comandos existentes `faction.allocate`, `faction.return`, `faction.multi.allocate`, `faction.multi.return` e `faction.reassign` foram preservados.

O Auditor 2.0 detecta ID duplicado, referência a outro pedido, origem/destino incorretos, incoerência de quantidades e comando de transferência inexistente. **Relatórios** exibem remessas parciais com antes/depois e permitem exportar CSV/JSON completos. O CI testa a proteção de pagamento original, bloqueio de excedentes, atomicidade, novas facções, compatibilidade, navegador mobile e histórico após recarga.

**Ainda pendente:** por tamanho/cor e por lote físico, remessa real entre oficinas, impressão de comprovantes de transferência, identificação de operador/autorização, controle de desperdício e sincronização Supabase/Safari↔Chrome real. O laboratório não é uma implantação empresarial.

## Nova etapa — Distribuição de um pedido por várias facções, sem perder o retorno simples

O módulo `modulos/faccoes-multidestino-v1.js` permite que um pedido cortado seja dividido em **envios para facções diferentes**, com saldo de peças enviadas, retornadas e pendentes **por destino**. A função anterior `faction.allocate` e o retorno antigo `faction.return` continuam disponíveis para pedidos de facção única. Para pedidos divididos, os novos comandos `faction.multi.allocate` e `faction.multi.return` exigem selecionar o envio/ID correto, evitando lançar o retorno na facção errada.

Cada retorno cria seu **próprio acerto e título a pagar**, congelando preço e regra de travetada do momento do retorno. A devolução parcial antes do pagamento corrige somente o saldo da facção de origem e o título vinculado, preservando os outros envios. A transferência total anterior `faction.reassign` continua disponível para pedido com destino único e sem retorno; ela é bloqueada para pedidos já divididos, para evitar transferências ambíguas ou reescrita de acertos.

O estado local guarda `factionAssignments` com IDs `ALO-...`, pedido, facção, quantidade enviada, retornada e origem. Documentos anteriores sem esse campo continuam válidos: na primeira operação de facção necessária, o núcleo cria um espelho local do saldo existente **no clone transacional**, sem apagar pedidos, acertos ou históricos. O Auditor verifica separadamente as somas por pedido/facção, o vínculo do acerto com o envio e duplicidades. Os relatórios mostram os envios e saldos pendentes e podem exportar os IDs e quantidades.

**Limites:** este é um exercício isolado. Ainda não permite roteirização com tempos reais, remessas físicas/comprovantes, assinaturas, gestão de peças por cor/tamanho em cada facção ou sincronização Supabase de múltiplos computadores. Não substitui os pagamentos e alocações do HLGB atual.

## Nova etapa — Fechamento de Facções e Acertos em lote (isolado, com uma transação)

O módulo `modulos/pagamento-lote-v1.js` implementa a **regra de fechamento coletivo de títulos a pagar de acertos e compensações**, independente da camada visual. Na área Hub Financeiro, selecione entre **2 e 50 títulos fictícios**, confira o valor de seleção, preencha uma **referência única** e justificativa e clique em **Validar sem pagar**. Essa pré-validação não altera dados nem revisão; a confirmação só acontece ao clicar em **Conferir e quitar lote fictício**.

O núcleo `operacao-integrada-core.js` permanece a **única autoridade transacional**. O comando `finance.batch.pay` valida todos os IDs, títulos abertos, origens, tipos, valores, duplicidades e referência antes de modificar um clone do documento. Se qualquer item falhar, **nenhum título do lote é quitado**. Quando tudo confere, salva um registro `PAG-...` com referência, motivo, total em centavos, quantidade, ID do comando e vínculos `FIN ↔ ACE/CMP`, além de **um único evento e uma única revisão**. A releitura do IndexedDB continua obrigatória para confirmar o resultado.

O comando legado `finance.pay` não foi removido. Acertos antigos, compensações anteriores, pagamentos anteriores e contas a receber **não são alterados** pela nova função; correção após pagamento continua em título separado. O Auditor 2.0 passa a detectar referências duplicadas, itens desconciliados, valores adulterados ou títulos repetidos em lotes. Os relatórios e CSV/JSON incluem histórico e itens de lote. Os testes exercitam concorrência, referência duplicada, item já pago, falha total atômica, compatibilidade de documentos antigos e navegadores Chromium/WebKit.

**Limitação obrigatória:** não faz transferência bancária, não anexa PDF bancário, não acessa Supabase nem confirma dinheiro real; não substitui a rotina empresarial do HLGB. Para fechar em lote em produção ainda faltam banco transacional, permissões, comprovantes, conciliação remota, testes com dois computadores e aprovação explícita.

## Direção obrigatória — evolução substancial, não cópia

O objetivo prioritário é entregar um ERP claramente melhor que o HLGB atual: mais eficiência, estabilidade, Auditor com provas, Bot e Assistente úteis, maior rastreabilidade, relatórios, interface moderna, crescimento por módulos e **preservação integral de todas as funções antigas**. O documento [NORTE-ARQUITETURA.md](NORTE-ARQUITETURA.md) define os critérios de aceite e as restrições. **Zero bugs** é meta de qualidade medida por testes e incidentes, não garantia irrestrita.

## Nova etapa — Auditor, Bot e relatórios em módulo independente

- `modulos/registro-v1.js`: registro por ID/versão, flag reversível para habilitar/desabilitar, isolamento de exceções. Desabilitar Observabilidade 2.0 restaura as apresentações anteriores de Auditor, Bot e Relatórios **sem alterar lançamentos**.
- `modulos/observabilidade-v2.js`: auditoria somente leitura das relações Pedido ↔ título a receber, compra ↔ entrada e fornecedor, corte ↔ baixa de material, Acerto ↔ título a pagar, compensações ↔ título separado, IDs/histórico e ocorrências recorrentes. Cada alerta aponta regra, gravidade, módulo, ID e orientação. Não corrige automaticamente.
- Bot demonstrativo melhorado: agrupa ocorrências reincidentes, prioriza alertas e orienta qual módulo conferir. **Ainda não é aprendizado autônomo nem um modelo de IA treinado com os erros da confecção.**
- Relatórios demonstrativos: atividade por módulo; linha do tempo completa de eventos; resumo de pedidos/cortes/retornos/expedição por modelo; acertos e compensações por facção; antes/depois e motivos de correções de acertos; CSV específico da auditoria. As 150 linhas visíveis são limite de tela, não de exportação.
- Todas as funções anteriores permanecem disponíveis; esta é a **primeira extração modular real no laboratório**, não a conclusão da modularização dos 19 módulos. A avaliação de RLS, bancos reais, anexos bancários, Safari/Chrome autenticados e paridade integral ainda é pendente.


## Nova etapa — Jornada guiada entre oito etapas do mesmo pedido (somente leitura)

Na área **Salvamento e sincronização / Núcleo** de `operacao-integrada.html`, existe o painel **Roteiro guiado do fluxo integrado**. Se houver mais de um pedido fictício, escolha qual acompanhar. A jornada exige relações com o mesmo pedido (e com o mesmo material da ficha técnica) e verifica: compra recebida com movimento de estoque e título; pedido/conta a receber; corte com consumo; envio para facção; retorno com acerto e conta a pagar; separação; expedição; e quitação fictícia do acerto no Hub. Existe uma etapa extra, **opcional**, de compensação após pagamento.

Os indicadores são derivados do documento IndexedDB já existente, sem criar tabelas, eventos ou pagamentos e sem incrementar a revisão ao consultar. Um acerto de outro pedido ou uma compra de material diferente **não** contam como conclusão. Se valor e status dos títulos vinculados divergirem, o passo financeiro não aparece concluído. Cada etapa possui um botão para abrir o módulo correspondente. O relatório JSON inclui `journey`, com a seleção e as oito situações. Atualizar, importar provas e comparar com Safari/Chrome são conferências manuais e não são certificadas automaticamente. Este roteiro não homologa o ERP empresarial.

## Nova etapa — Compensação de pagamento fictício já quitado

A Operação Integrada inclui o comando `settlement.compensate`, que exige um **acerto original pago**, valor de diferença em centavos (positivo ou negativo), referência única por acerto e justificativa obrigatória. A referência é comparada sem diferenciar maiúsculas, minúsculas ou espaços ao redor.

O original **permanece completamente inalterado**: valor, quantidade, status, facção e título já quitado. O sistema cria um registro separado `CMP-0001`, com o ID do acerto original, valor anterior, referência, motivo e ID de comando. Uma diferença positiva cria um **novo título fictício a pagar**; diferença negativa cria um **novo título fictício a receber**. O Hub pode marcar o novo título como quitado, atualizando o status da compensação sem modificar o pagamento anterior. Não há pagamento ou transferência bancária real.

A tela mostra as compensações separadamente e oferece **Conferência PDF**, uma página A4 gerada para imprimir ou salvar como PDF pelo navegador, com links entre acerto original, título pago, diferença e novo título. JSON e CSV incluem os registros. **O PDF de conferência NÃO é um comprovante bancário anexado nem um documento fiscal.** O sistema de anexos seguros e a prova de pagamento real permanecem pendentes.

Regras testadas: mesmo ID de comando não pode ser reaplicado; mesma referência não pode ser duplicada para um acerto, mesmo em outra caixa; acerto não pago não aceita compensação; diferença zero, excesso de limite e motivo vazio são rejeitados; integridade exige relação 1:1 entre compensação e novo título; versões antigas do laboratório sem esse campo continuam acessíveis sem resetar dados.

## Nova etapa — Consulta combinada de acertos e compensações (somente leitura)

A página `operacao-integrada.html#acertos` oferece busca única por ID do acerto, modelo, facção, referência e motivo das compensações; filtros combináveis por situação do acerto, facção/embaladeira, tipo de serviço e situação da compensação. Mostra contagem e valor total dos acertos encontrados, além da diferença líquida das compensações visíveis. Há um botão para limpar filtros, que não exclui qualquer registro.

As escolhas da consulta são preservadas quando se navega entre módulos e ao salvar novos dados fictícios. Pesquisar por uma referência de compensação também localiza o acerto pago de origem. A filtragem **não faz gravação, não oculta dados do arquivo JSON/CSV exportado e não equivale à pesquisa no Supabase do HLGB real**. Os filtros são locais à aba de teste.

## Nova etapa — Facções, Acertos e Hub com serviço de embalagem fictício

A prévia `operacao-integrada.html#acertos` agora permite testar:

- **Preço por produto e facção:** tarifa específica por modelo, mantendo os acertos existentes com valores congelados; novos retornos recebem a tarifa vigente.
- **Travetada:** alteração por facção apenas para serviços futuros; desconto ilustrativo quando não traveta continua explícito.
- **Transferência antes do retorno:** pode trocar a facção de um pedido já alocado **somente enquanto não houver retorno/acerto**, exigindo motivo e histórico de origem/destino. Troca após retorno é bloqueada, para não reescrever a origem dos lançamentos.
- **Serviços avulsos:** costura ou embalagem cadastrada por quantidade, modelo, facção/embaladeira, preço unitário e desconto unitário de travetada. Exemplos editáveis de R$ 0,25 para camisola/doll e R$ 0,15 para calcinha. A regra real ainda será configurável.
- **Devolução parcial com justificativa:** conserva os valores e quantidades anteriores no histórico, reduz o título vinculado e o retorno do pedido quando aplicável. Bloqueia quantidade maior que a disponível para separação ou devolução após pagamento.
- **Acerto e Hub conciliados:** ajustes em acertos abertos alteram o título vinculado, com motivo e antes/depois. Após marcar o título fictício como pago, o acerto também fica pago e não permite edição ou baixa duplicada.
- **Pesquisa de facções e acertos:** filtro pelo nome e serviço em tabelas locais. Ainda falta busca global do banco de produção e anexação privada de PDFs.
- Testes de cálculo, integridade, trava pós-pagamento, identidade do acerto, revisões, Chrome e Safari/WebKit.

**Nada disso acessa o banco de produção, movimenta dinheiro, gera comprovante oficial ou substitui os serviços financeiros da empresa.** No laboratório existe compensação fictícia pós-pagamento; ainda dependem de homologação real a contabilização de correções, anexos privados de PDF bancário, lotes de serviços, múltiplas facções no mesmo pedido e permissões empresariais.

## Nova etapa — Corte Avançado com folhas por lote (fictício)

A área **Corte** de `operacao-integrada.html#corte` ganhou regras e formulários conectados aos pedidos e estoque do próprio laboratório. Os cadastros e lançamentos anteriores do IndexedDB são mantidos.

- Edição da grade P/M/G/GG com proteção contra redução abaixo do corte efetuado e das folhas abertas. Se houver título a receber aberto, o valor também acompanha a quantidade editada.
- Planejamento de múltiplos lotes por pedido, com reserva de peças por tamanho, equipe **interna ou externa**, dois cortadores distintos e um enfestador. A folha aberta não baixa o estoque.
- Alteração de lotes não concluídos e cancelamento registrado no histórico, sem excluir lançamentos.
- Conclusão do lote com duas **conferências digitadas** correspondentes aos cortadores, peso útil e peso de lixo/desperdício. O estoque é baixado de forma atômica pelo peso útil + desperdício; nenhuma folha pode ser concluída duas vezes.
- Aba de resumo por lote, status, peso previsto/real e impressão A4 do navegador. O usuário pode usar "Salvar em PDF" na interface de impressão. **Não é assinatura legal, nem um PDF fiscal produzido automaticamente.**
- Baixa manual por tamanho preservada, impedida de consumir quantidade já reservada em outra folha aberta.
- Testes automatizados de grade, reserva, excesso, assinatura, estoque, auditoria, impressão e salvamento local no Chrome e Safari/WebKit.

**Ainda pendente:** cores, múltiplos materiais por modelo e consumo variável por tamanho, fichas técnicas completas, balança conectada, identidade legal do signatário, planejamento multi-facções, folha de corte oficial, integração do banco empresarial e homologação com pedidos reais. Essas seis novas rotinas são provas **parciais**, não seis funções antigas completamente preservadas.

## Nova etapa — Prévia Operacional Integrada (19 áreas em uma tela)

Os arquivos `operacao-integrada.html`, `operacao-integrada-core.js` e `operacao-integrada-ui.js` criam uma **prévia isolada** para que o usuário teste múltiplos módulos interligados com os mesmos dados fictícios.

As 19 áreas correspondem às categorias do inventário: Núcleo, Login/Permissões, Pedidos, Produtos/Ficha, Corte, PCP/Produção, Separação, Facções, Acertos, Hub, Folha, Compras, Estoque, Relatórios, Auditor, Bot, Central, Impressora 3D e Cadastros. **Uma área navegável não significa paridade comprovada da função antiga.** Os módulos de login, bot, auditor e saúde são apenas demonstrativos de apresentação/regras.

Operações implementadas no núcleo experimental: cadastros de clientes/fornecedores/materiais/produtos/facções; pedidos por grade P/M/G/GG; corte parcial por tamanho e consumo de matéria-prima; alocação e retorno de facções; acerto automático com travetada ilustrativa e ajuste rastreado; separação e expedição parcial; títulos fictícios no Hub com confirmação única; compras recebidas uma vez com duas conferências e entrada de estoque; ajustes de estoque com justificativa; passagem individual na folha; itens 3D; ocorrências; auditoria e relatórios.

Garantias do ensaio: sem rede, sem login ou pagamento real, sem Supabase de produção, sem dados reais. As operações usam uma transação por mudança no IndexedDB local, revisão esperada, eventos com IDs exclusivos, validações de quantidades e **releitura antes de exibir "salvo"**. Um conflito entre duas abas não sobrescreve silenciosamente a revisão mais recente. O download JSON/CSV é somente fictício; não há geração automática de PDF oficial nem uploads.

Testes em CI: invariantes do motor e fluxo de interface em Chromium/WebKit em larguras 320/375/390/768/1280, exportação, reload, erros e concorrência entre duas abas. A documentação detalhada está em `COMECAR-TESTES.md`.

**Limites:** exige trabalho adicional para integrar verdadeiramente os 19 módulos com banco de homologação, autenticação e papéis, serviços financeiros, armazenamento de comprovantes, folha real, importações de notas e pedidos, grade detalhada, auditor de produção e comparação das 76 funções do inventário. Não liberar para substituir o sistema principal.


## Nova etapa — Folha 2.0 para teste manual em navegador

O arquivo `folha-homologacao.html` oferece uma folha **com cinco identidades e valores totalmente inventados**. A interface está disponível na prévia pública e no ZIP offline, usando IndexedDB **local do navegador** como armazenamento experimental. Não há acesso ao banco da confecção.

- Seleção de funcionário, busca, filtro por confecção e ordenação alfabética/por confecção que permanece estável após salvar.
- Edição individual dos campos salário-base, passagem, extras e descontos; validação de valores inteiros em centavos.
- Separação explícita de salário líquido, passagem, desembolso e provisões ilustrativas (13º e férias), sem simular impostos ou cálculos legais.
- Gravação local com revisão esperada, histórico por comando e **confirmação por releitura**; proteção contra conflito entre abas que compartilham IndexedDB.
- Falha simulada de confirmação bloqueia novas operações até a releitura por ID; conflitos preservam o rascunho para revisão.
- Restauração somente com confirmação do usuário e evento no histórico; download de CSV e JSON fictícios.
- Testes com Chrome e Safari/WebKit em cinco larguras, duas abas, reload, conflito, valores inválidos e exportação.

**Importante:** testar a folha fictícia não equivale a homologar as quatro funções legadas de Folha. Falta mapear todos os casos reais de passagem, fechamento, períodos, provisões, pagamento pelo Hub e integração com o servidor de homologação, sem tocar no principal.


## Nova etapa — Duas sessões reais e PostgreSQL persistente somente no CI

O diretório `sync-persistente/` acrescenta a prova de concorrência e durabilidade em **PostgreSQL 16 real e descartável**, separada da página estática de sincronização. O workflow `evolucao-sync-persistente.yml` cria um banco temporário `hlgb_sync_persist_lab` em cada browser (Chromium e WebKit), abre um servidor HTTP **somente no 127.0.0.1** e executa os testes de ponta a ponta em **dois contextos de navegador separados**.

- Transação e revisões no banco, IDs idempotentes, auditoria, conflito e resposta perdida após commit.
- WAL **IndexedDB no navegador de laboratório**, escrito antes do POST e preservado após reload.
- Interrupção de rede, releitura por ID, reenvio manual com o mesmo identificador e prevenção de duplicidade.
- Reinício do servidor em localhost mantendo o banco descartável; comando e evento sobrevivem ao processo.
- Bloqueios por nome de banco, host e origem; schema privado e acessos públicos revogados.
- Capturas e relatório fictício anexados à execução da CI.

A página interativa de persistência real **não é pública**, pois depende do servidor e do banco descartáveis. A demonstração estática anterior continua acessível na central. Consulte `sync-persistente/README.md` para os limites e o procedimento manual seguro.

**Ainda não é uma correção ou aprovação de sincronização do HLGB**: faltam sessão/Auth da empresa, WAL legado, ACL/RLS de usuários reais, migração, testes entre dispositivos reais, autorizações de liberação e prova de não perda de dados no esquema existente.

## Nova etapa — Laboratório de duas sessões e confirmação de gravação

Os novos `sincronizacao-duas-sessoes-memoria.js` e `sincronizacao-duas-sessoes.html` simulam duas sessões independentes **dentro de uma única página**, conectadas a um objeto servidor que vive somente na memória. Não há autenticação, rede, Supabase nem gravação durável.

As sessões A/B simulam alteração de um lançamento fictício do Hub, com:
- Rascunho isolado e revisão vista por sessão. Leitura da outra sessão é sempre explícita; não se confunde o estado de uma página com confirmação de banco.
- Fila em memória quando offline, sem reenvio automático ao reconectar.
- IDs imutáveis por comando, servidor fictício idempotente e controle de revisão otimista.
- Simulação de ACK perdido, perda anterior ao commit e falha de releitura.
- Releitura de comando e evento antes do status `readback_confirmed`; resultado inconclusivo bloqueia novos salvamentos até conciliação.
- Se ID não foi encontrado, reenvio somente manual **com o mesmo ID**; o teste de commit atrasado prova que o replay não cria evento duplicado.
- Conflito mantém os valores já confirmados por outra sessão e não descarta o rascunho de quem estava offline; exige revisão antes de um novo comando.
- CSV não é usado; é possível baixar um JSON de evidências **somente fictícias**.
- Testes automatizados de invariantes, Chrome e WebKit com cinco tamanhos de viewport.

**Limitação essencial:** essa prova é de um **algoritmo de laboratório**, não certificação de persistência real. O passo seguinte exige banco de homologação isolado, papéis/ACL, transações reais, concorrência, WAL persistente, desconexões e testes entre browsers/dispositivos reais. A branch principal e o banco de produção permanecem intocados.

## Nova etapa — Guardião de preservação e bloqueio de liberação (offline)

A página `guardiao-preservacao.html` vincula o inventário real do repositório (**76 funções de 19 módulos**), a matriz de **43 critérios detalhados** e o plano de **266 melhorias**; identifica **30 funções P0** e permite navegar pelas referências de arquivos e testes legados.

- Busca, filtros por módulo, prioridade e demonstração; links para os 8 exercícios parciais.
- Importação validada do relatório exportado pela Central de Homologação, com separação clara entre **funcionou na prévia** e **paridade funcional comprovada**.
- Exportações de pendências em CSV/JSON com 76 bloqueios obrigatórios, mesmo que 49 demonstrações tenham passado.
- Testes automatizados verificam dados embutidos versus inventários de origem e existência de todas as fontes e referências de teste; o teste de baseline confere hash de **229 arquivos antigos**.
- Browser tests em Chromium/WebKit, incluindo telas estreitas, importação malformada e bloqueio de liberações indevidas.

O Guardião **não publica**, **não aprova**, **não conecta bancos** e não autentica aprovações. A liberação segue bloqueada em 0/76 funções até que haja implementação equivalente, provas funcionais, integridade, validação mobile, testes em duas sessões e autorização explícita. A CI aprovada confirma apenas integridade e correto funcionamento da trava demonstrativa.

## Nova etapa — Planejamento semanal de matéria-prima e compras (simulação)

O arquivo independente `planejador-materiais.html` reúne quatro áreas interativas: plano semanal por modelo/tamanho; necessidade e custo por modelo; edição da ficha técnica de consumo; e configuração fictícia de materiais, preços, estoque, perda e lote mínimo. Os exemplos são Camisola Melina, Doll Crystal, Calcinha Tammy e Conjunto Paula, com insumos sintéticos em **gramas, centímetros e unidades**.

- Consolidar variantes repetidas, editar quantidades e remover modelos; validar limites e quantidades inteiras.
- Consumo por modelo a partir da grade de tamanhos. Perdas configuráveis aplicadas após somar as variantes dentro de cada modelo.
- Custo de consumo e valor de compra deliberadamente separados. A compra é o que falta após estoque e arredondamento ao lote mínimo, não todo o material consumido.
- Rateio de centavos de consumo por modelo, de forma que os subtotais conciliem exatamente com o consolidado por insumo.
- Exportar a lista fictícia de compras em CSV e o planejamento completo em JSON, incluindo indicadores de consistência.
- HTML autossuficiente, sem rede, Supabase, login, armazenamento persistente ou alterações no HLGB. Reinicia ao atualizar.
- Testes automatizados de segurança e no Chromium/WebKit em cinco larguras, incluindo alterações de ficha, preço e estoque.

**Limites:** nenhum dado ou custo real do ERP é lido. O laboratório não possui controle de fornecedores, impostos, frete, descontos, aproveitamento de sobras, conversão real entre metros/quilos/rolos, previsões com ficha técnica validada nem ordens de compra. Uma aprovação de uso real requer migração e conferência dos cadastros no banco separado de homologação.

## Nova etapa — Ficha de corte e aproveitamento de materiais (simulação)

A página independente `fluxo-producao-integrado.html` liga as variantes fictícias de Pedidos → Corte → Facções → Retorno → Separação. A etapa de Corte exige:

- **Cortador interno ou externo** e identificação de infestador com personagens fictícios.
- **Material** (tule, renda ou malha) e pesos inteiros em gramas: disponibilizado, utilizado, resíduo e sobra calculada; rejeita quantidades acima do disponibilizado.
- **Duas conferências distintas**, apenas como campos de teste (não são assinaturas eletrônicas).
- **Custo estimado** por peso consumido (utilizado + resíduo), com valores por kg inventados; resumo da sessão por modelo e material; indicador de aproveitamento sobre a massa consumida.
- Registro das informações no histórico da movimentação fictícia, com versão da grade, IDs únicos, proteção contra reexecução da mesma transição e exportação JSON.
- Testes automáticos em Chromium e WebKit, cinco larguras e dois cortes (interno + externo), usando materiais diferentes.

**Escopo limitado:** não utiliza tabela real de preços, ficha técnica de insumos, estoque, produção, contas a pagar, assinatura de funcionários ou banco. O resumo não inclui os cortes pré-carregados no exemplo, porque eles não possuem informações de peso. Todos os registros se perdem ao atualizar o navegador.

## Prévia operacional 2.0 (para avaliação de usabilidade)

A nova tela `central-operacional-2.html` foi criada após a avaliação de que os protótipos anteriores eram básicos. Ela aproxima a experiência visual e funcional de uma central de trabalho diária:

- Visão geral com indicadores calculados a partir de acertos fictícios e lista de prioridades.
- Busca única por produto, facção ou ID, filtro por situação, ordenação e navegação contextual.
- Criação e edição de acertos pendentes com preço unitário, travetada e ajuste justificado em **centavos inteiros**.
- Seleção e confirmação de vários acertos para pagamento **simulado em lote**, atualizando simultaneamente o Hub fictício e o histórico de operações em memória.
- Painel por facção, com pendências, valores e seleção para ver acertos vinculados.
- Planejamento de rota reorganizável em tela, sem envio de rotas reais.
- Hub com ligação por ID do acerto, filtro por origem, busca e exportação de CSV com dados fictícios.
- Interface responsiva com cartões de acerto no celular, navegação inferior, diálogos de edição e confirmação.
- Restaurar os dados fictícios restaura **também a busca, os filtros e a ordenação**.

**IMPORTANTE:** é uma prévia de usabilidade que não contém as 266 melhorias completas nem substitui os 43 cenários críticos existentes. Não há gravação real, autenticação, comprovantes reais, WAL ou reconciliação entre aparelhos. Todas as operações reiniciam ao recarregar. Testes de funcionários e homologação funcional seguem pendentes. A versão atual em `main` permanece intocada.

O pacote offline `HLGB-Evolucao-Previa.zip` inclui a Central 2.0 e as telas anteriores, com `index.html` como entrada.

## Garantias

- Os arquivos da pasta **não são carregados** por `index.html`, `app-stable3.html` nem `app9240.html`.
- Não há código Supabase, autenticação da aplicação, chamadas HTTP, IndexedDB, WAL, cookies, localStorage nem service workers.
- Interações do protótipo são **simulações em memória**, sem gravar, editar ou excluir lançamentos.
- Nenhuma alteração no `main`, publicação GitHub Pages ou mudança de banco é autorizada nesta etapa.
- Mudanças futuras devem ser validadas por testes técnicos e pelos funcionários, com suporte a iPhone Safari e Android Chrome.
- **Aprovação explícita** será necessária para integrar qualquer alteração na operação atual.

## Etapa atual — Controle de acesso e PDFs (laboratório PostgreSQL descartável)

- `permissoes/01-laboratorio-seguro.sql`: apenas banco temporário `hlgb_permissoes_lab`, funções privadas, papéis fictícios, isolamento por empresa, RLS e pagamentos idempotentes.
- `permissoes/02-reset-fixtures.sql`: casos sintéticos restaurados antes de cada teste, sem dados reais.
- `permissoes/permissoes-mobile.html`: prévia offline dos papéis Financeiro, Operação e Consulta, com perfis desativados e outras empresas.
- `tests/permissoes-postgres.cjs` e `tests/permissoes-mobile.cjs`: concorrência, revogação de acesso, bloqueio de empresa diferente e validação em Chrome/WebKit.
- `permissoes/README.md`: limites indispensáveis sobre identidade, JWT, `SECURITY DEFINER`, comprovantes e Storage.
- **Importante:** os registros de PDF são apenas metadados declarados; nenhuma mídia real é manipulada. O modelo de `session_user` deste laboratório não pode ser transplantado para o Supabase sem reengenharia de autenticação.

## Etapa atual — Transações fictícias em memória (sem banco)

- `simulador-transacao-memoria.js`: operação atômica de demonstração, idempotência, revisão esperada, histórico, PDF fictício e conciliação após perda de resposta.
- `transacoes-simuladas.html`: visualização mobile de resultados confirmados, conflitos e falhas, sem salvar ou usar dados reais.
- `TRANSACOES-SIMULADAS.md`: exemplos, limitações e exigências para futura implementação em um banco de teste isolado.
- Os arquivos desta etapa **não** implementam RPC real, alteração de `factionPayments`, pagamentos ou feature flags operacionais.

## Etapa atual — Simulador de cálculos de acertos e recebimentos

- `motor-calculos-demonstracao.js`: motor de cálculo puro, com validação por centavos e proteção de compensações, sem qualquer gravação.
- `acertos-simulador.html`: laboratório **offline e mobile** para dois fluxos diferentes: acertos de facções e recebimentos parciais de notas/pedidos.
- `tests/motor-calculos.cjs` e `tests/acertos-simulador-mobile.cjs`: cenários monetários, rejeições de valores inválidos, isolamentos e cinco larguras em Chromium/WebKit.
- `SIMULADOR-ACERTOS.md`: matemática, limites, exemplos e diferenças com o código antigo a decidir antes de uma eventual integração.
- A simulação não cria pagamentos, não grava comprovantes, não consulta o banco e não marca nenhuma função como homologada.

## Etapa: preservação das funções antigas (preparação de homologação)

**Objetivo:** evitar que a modernização remova recursos já entregues.

- `paridade-funcional.json` registra **76 funcionalidades preliminares** distribuídas nas 19 áreas; cada uma inclui fonte de código, teste legado quando existe, prioridade e estado `nao_verificada`.
- `arquivos-legados-baseline.json` registra o hash dos **229 arquivos fundamentais ou scripts `release-`** do commit-base, para detectar qualquer modificação não revisada.
- `preservacao.html` é uma tela **independente, mobile-friendly e offline** para buscar e separar visualmente funções para revisão. Nenhuma marcação salva, homologa ou autoriza exclusão.
- `tests/preservacao-contract.cjs` valida o inventário e o isolamento; `tests/baseline-legado.cjs` compara hashes; `tests/preservacao-mobile.cjs` cobre Chromium e WebKit em cinco larguras.

**Limite:** inventariar 76 funções e proteger hashes de código **não demonstra** que todas as funções antigas estejam operacionais ou tenham equivalência em um módulo novo. É um bloqueio inicial contra exclusão involuntária, não uma certificação de paridade.

A aprovação de substituição exige testes de funcionalidades antigas e novas lado a lado, integridade financeira e WAL, critérios de mobile, homologação humana e autorização explícita para a operação atual.

## Etapa atual — contratos e fluxos operacionais (em preparação para testes)

- `contratos-modulares.json`: proposta de 19 contratos de módulos, políticas de ativação e 7 portões de homologação, **não implementados no HLGB atual**.
- `CONTRATOS-MODULARES.md`: desenho de salvamento por comando, transação única, concorrência, critérios mobile e fronteiras do Bot/Auditor.
- `fluxos-operacionais.html`: **laboratório independente** de pesquisa de produtos, acertos e relatórios em layouts responsivos, com exemplos **inteiramente fictícios**, sem gravação.
- `tests/fluxos-contract.cjs` e `tests/fluxos-mobile.cjs`: novos contratos e cenários para verificar pesquisa, cálculos fictícios, filtros, segurança e cinco tamanhos de tela em Chromium e WebKit.
- Cada alteração na versão real continua proibida até validação completa e aprovação explícita.

**Atenção:** os contratos e exemplos não comprovam funcionamento do backend. O botão Salvar foi intencionalmente desabilitado nos acertos para não sugerir gravação sem transação comprovada.

## O que existe nesta primeira entrega

1. `roadmap.json`: registro inicial de **266 itens** do plano mestre, divididos em 13 frentes; inventário inicial de **19 áreas/módulos** a validar.
2. `mapa-dependencias.json`: **25 ligações** entre os módulos (11 encontradas em referências explícitas do código e 14 propostas a validar), incluindo **8 pontos de salvamento de maior risco** e referências a arquivos/linhas. Levantamento estático; não é auditoria funcional.
3. `prototipo.html`: interface standalone para desktop e mobile, incluindo:
   - resumo das frentes e situação de homologação;
   - busca e filtro de módulos;
   - mapa de dependências interativo no desktop e celular, evidências e riscos de gravação;
   - simulação de ativação/desativação (somente em memória; núcleo sensível protegido);
   - laboratório mobile por tipo de funcionário;
   - formulário de solicitação de melhoria **sem enviar e sem salvar**;
   - modelos fictícios de incidentes e critérios para Auditor/Bot 2.0.
4. `tests/standalone-contract.cjs`: testes estáticos de isolamento, segurança, integridade da lista e responsividade.

## Observações e limitações

- A existência de um arquivo no repositório não comprova que a função correspondente esteja homologada, com integração correta ou operacional em duas sessões.
- As áreas estão em **inventário preliminar**; o mapa de responsáveis por gravação, telas e dependências ainda exige revisão detalhada. As 14 arestas com status `proposto-a-validar` são hipóteses, não fatos comprovados.
- Os indicadores do protótipo são **demonstrativos**, não métricas de produção; incidentes exibidos são fictícios.
- O protótipo não é um gerenciador real de módulos e não opera feature flags em produção.
- O botão de solicitar melhoria não armazena solicitações, por design. O armazenamento só deverá ser implementado em ambiente de teste isolado, com permissões e autorização.

## Critérios para considerar uma melhoria pronta

1. Responsabilidade única de dados, documentação de módulo e dependências.
2. Testes unitários, integração, segurança e regressão.
3. Verificação de UX **desktop e mobile** no fluxo real da função.
4. Testes Chrome, Safari e duas sessões, sempre que houver gravação ou sincronização.
5. Validação de salvamento com ACK e releitura; proteção contra duplicidade e conflito.
6. Evidência de reversão segura e integridade de dados existentes.
7. Homologação com funcionário, revisão do Auditor e **autorização explícita de publicação**.
8. Resumo enviado após cada melhoria: concluído, testes, limitações e todas as frentes pendentes.

## Próximos trabalhos

- Completar mapa de dependências e operações de escrita **sem alterar o programa atual**.
- Elaborar o layout padrão de tabelas, pesquisa de produtos, relatórios e formulários.
- Detalhar contratos modulares e desenhar integração segura com o núcleo canônico.
- Preparar testes de mobile e usabilidade com cenários fictícios.
- Só depois estudar integração experimental com ambiente e dados isolados, sem publicar no `main`.

**Este repositório não ganhou uma aba ativa do HLGB nesta etapa. A tela existente continua inalterada.**
