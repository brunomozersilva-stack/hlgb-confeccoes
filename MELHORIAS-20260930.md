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
