# HLGB Confecções — Pacote de melhorias 30/09/2026

Base aprovada: main @ c0a384ea89e3d7e0f212b9838b9684f461703363
Branch de trabalho: melhorias-ia-diagnostico-20260930

## Regra de publicação
- Não alterar o main durante o desenvolvimento.
- Não publicar sem testes e autorização expressa.
- Evitar recriar HTML/base por correção; manter a entrada oficial.
- Usar as rotinas oficiais de gravação e proteções já existentes.

## Erro 1 — Provisões e encargos após rescisão
Relato: funcionários desligados continuam aparecendo/gerando valores em "Provisões e encargos estimados".
Exemplos confirmados no banco:
- Arisergio Inacio Luiz — active=false — terminationDate 2026-08-28.
- Vitoria Pinheiro de Assis — active=false — terminationDate 2026-09-17.

Comportamento desejado:
- Não gerar provisões futuras depois da data de desligamento.
- Preservar somente o que for devido até a data da saída.
- Preservar baixas/adiantamentos vinculados à rescisão.
- Ex-funcionário pode permanecer no histórico sem ser tratado como ativo.

## Erro 2 — Rescisão aparecendo como gasto pessoal no Hub
Relato visual confirmado: ao trabalhar com saída/rescisão no Hub, Arisergio e Vitoria aparecem no campo "Pessoa da despesa pessoal" e a categoria fica como "Gasto pessoal".

Comportamento desejado:
- Rescisão => categoria Funcionários.
- Subcategoria => Rescisão.
- Funcionário/ex-funcionário => favorecido/pessoa vinculada ao lançamento.
- Funcionários não devem contaminar a lista de pessoas de gasto pessoal.

## Melhoria 3 — Projeção semanal mais visual
Objetivo: permitir que a equipe entenda rapidamente o que será entregue.

Visão da equipe:
- cartões por dia/entrega;
- cliente em destaque;
- pedido;
- quantidade total;
- valor total;
- produtos/modelos;
- produzido x total e percentual;
- faltantes;
- local/facção;
- cortador;
- urgência;
- situação.

Resumo superior:
- peças para entregar hoje;
- valor de hoje;
- peças da semana;
- valor da semana;
- clientes da semana;
- atrasados.

Filtros rápidos:
- Hoje;
- Amanhã;
- Esta semana;
- Cliente;
- Produto;
- Local/Facção;
- Atrasados;
- busca por pedido/produto.

Manter também "Visão administrativa" com detalhes completos.
Evitar informação redundante e avisar antes de acrescentar campos que repitam a mesma informação.

## Melhoria 4 — Assistente HLGB
Fase 1 — consulta:
- localizar pedidos;
- responder quantidades, valores, clientes, datas, locais, faltantes e status;
- perguntas em linguagem natural.

Fase 2 — preparar ações:
- baixa de quantidade;
- mudança de urgência/status;
- marcação de pagamento;
- outras ações oficiais.

Regra de segurança:
- a IA nunca grava diretamente no banco;
- para ação, mostrar antes/depois e pedir confirmação;
- executar a mesma função oficial da tela;
- registrar usuário, data/hora e ação.

## Melhoria 5 — Central de diagnóstico
Criar "Central de Erros e Melhorias".

Erros:
- capturar erros JavaScript;
- falhas de gravação/sincronização;
- conflitos;
- registros órfãos;
- duplicidades;
- IDs obrigatórios ausentes;
- inconsistência de status/quantidade/valor;
- agrupar ocorrências repetidas.

Botão "Varrer sistema":
- auditoria somente de leitura;
- mostrar erros, avisos e verificações OK;
- não corrigir automaticamente.

Dados do diagnóstico:
- data/hora;
- tela;
- versão;
- navegador;
- usuário quando disponível;
- IDs envolvidos;
- mensagem técnica sanitizada;
- nunca incluir senhas, tokens ou chaves privadas.

## Melhoria 6 — Sugestões pela equipe
Na mesma Central:
- aba Erros;
- aba Sugestões.

Funcionário pode escrever a sugestão em linguagem normal.
Registrar:
- título;
- descrição;
- tela;
- autor;
- data;
- prioridade;
- status.

Evitar duplicidade:
- identificar sugestões parecidas;
- agrupar quando fizer sentido.

Botão "Preparar para o ChatGPT":
- gerar texto/arquivo com erros e sugestões selecionados;
- incluir contexto técnico útil;
- remover credenciais e dados secretos;
- deixar pronto para enviar em uma conversa de manutenção.

## Ordem inicial de implementação
1. Central de Erros e Melhorias.
2. Captura segura de erros técnicos.
3. Registro de sugestões.
4. Relatório "Preparar para o ChatGPT".
5. Varredura de inconsistências somente de leitura.
6. Correção Erro 1 — provisões após rescisão.
7. Correção Erro 2 — classificação da rescisão no Hub.
8. Nova visualização da Projeção semanal.
9. Assistente HLGB de consulta.
10. Só depois: comandos que alteram dados com confirmação.

## Critérios antes de publicar
- testes automatizados existentes continuam passando;
- testes específicos para cada correção nova;
- nenhuma criação de dados reais só para testar;
- conferir Safari e Chrome quando a mudança afetar interface;
- main permanece intacto até autorização expressa.


## Andamento em 30/09/2026

### Implementado na branch e ainda NÃO publicado no main
- ✅ Central de Erros e Melhorias.
- ✅ Captura automática de erro JavaScript, promise e falha de gravação.
- ✅ Registro manual de erro e sugestão.
- ✅ Varredura inicial somente de leitura.
- ✅ Relatório sanitizado "Preparar para o ChatGPT".
- ✅ Permissão de systemIssues/systemSuggestions vinculada a Cadastros no mapeamento do Supabase.
- ✅ Correção de provisões: desligado não mantém saldo aberto após a rescisão; histórico anterior é preservado.
- ✅ Correção do Hub: rescisão/funcionário não entra na lista nem no resumo de gasto pessoal.
- ✅ Projeção: nova Visão da equipe sem remover a Visão administrativa.
- ✅ Projeção equipe: cliente, pedido, produto, quantidade, valor, progresso, local/facção, urgência, cortador e faltantes.
- ✅ Assistente HLGB v1 em modo consulta.
- ✅ Assistente reconhece pedido, entregas hoje/amanhã/semana, atrasos, clientes/produtos e Central de erros.
- ✅ Comandos destrutivos ou ainda não liberados permanecem bloqueados.
- ✅ Erro/sugestão podem ser preparados no Assistente e confirmados para a Central.
- ✅ Assistente: baixa de faltante liberada com prévia e abertura da função oficial “Abater / recuperar”; quantidade/data/observação continuam exigindo confirmação na tela oficial.
- ✅ Assistente: lançamento do Hub pode ser localizado por descrição/pessoa e marcado como realizado após prévia e confirmação, usando a função oficial do Hub.
- ✅ Assistente: prioridade de pedido pode ser preparada com antes/depois; após confirmação abre o editor oficial com a prioridade pré-selecionada e não salva automaticamente.
- ✅ Assistente: status de pedido pode ser preparado com antes/depois; após confirmação abre o editor oficial com o status pré-selecionado e não salva automaticamente.
- ✅ Assistente impede alternar um lançamento do Hub que já esteja realizado.
- ✅ Testes automatizados novos adicionados à regressão.

### Ainda pendente antes de qualquer publicação
- Teste visual da nova Central, Projeção e Assistente em navegador real.
- Revisão fina de interface/redundâncias após o teste visual.
- Teste visual da Central, Projeção, Assistente e Auditor em navegador real, sem usar dados reais para ensaio.
- Expandir outras ações do Assistente somente depois de validar as primeiras ações liberadas.
- Reconfirmar regressão final e main antes de qualquer publicação.


## Melhoria 7 — Modo Auditor/Testador HLGB
Objetivo: reduzir a dependência do Work para testes e manutenção cotidiana.

### Implementado na branch
- ✅ Módulo técnico `systemAuditRuns` para salvar histórico das auditorias no Supabase.
- ✅ Permissão do módulo vinculada à área Cadastros.
- ✅ Auditoria interna em modo somente leitura.
- ✅ Conferência de funções essenciais.
- ✅ Conferência de módulos novos carregados.
- ✅ Conferência da estrutura das principais telas.
- ✅ Detecção de IDs duplicados no DOM.
- ✅ Conferência estrutural/visual da tela ativa: overflow horizontal, painéis fora da viewport, controles anormalmente pequenos e modal fora da tela.
- ✅ Conferência da sessão/sincronização e pendências locais.
- ✅ Reutilização da varredura de integridade da Central de Erros.
- ✅ Leitura dos erros abertos já registrados.
- ✅ Registro de navegador, versão, usuário, viewport, tela ativa e resultado.
- ✅ Histórico com resultado Aprovado / Atenção / Falhou.
- ✅ Relatório copiável para manutenção.
- ✅ Integração ao Assistente:
  - “rodar auditoria do sistema” prepara e confirma a auditoria;
  - “qual foi a última auditoria?” lê o último resultado salvo.
- ✅ Auditoria não cria pedidos, não dá baixa e não altera produção/financeiro.
- ✅ Teste automatizado específico adicionado à regressão e aprovado.

### Próxima evolução do Auditor
- Automatizar verificações visuais mais profundas sem executar ações destrutivas.
- Acrescentar testes controlados de persistência usando dados técnicos isolados quando realmente necessário.
- Acrescentar comparação de comportamento entre Chromium/WebKit na automação do GitHub.
- Manter Safari real como navegador capaz de executar o próprio Auditor dentro do HLGB, sem depender do Work.
