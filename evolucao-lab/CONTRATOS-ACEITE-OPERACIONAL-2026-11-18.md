# HLGB Evolução — Contratos de aceite por tarefa (18/11/2026)

**Situação geral: BLOQUEADO PARA SUBSTITUIR O HLGB COMERCIAL.**

Esta é a regra de aprovação recebida em 18/11/2026: **um módulo só será aprovado depois de preservar cada tarefa existente no programa em produção e demonstrar pelo menos uma melhoria mensurável para a equipe.** Presença de tela, teste unitário e conclusão de tarefa fictícia **não equivalem** a aprovação operacional.

## Como registrar cada prova

Cada contrato deve ter: (a) caminho e versão da função antiga na `main`, (b) procedimento de uso real observado, (c) cenário de homologação com dados anonimizados, (d) resultado esperado por registro, (e) resultado observado na Evolução, (f) evidência de gravação/releitura do servidor e de outro computador, (g) histórico/estado antes e depois, (h) resposta do Auditor, (i) teste mobile e Safari, (j) nome/cargo de quem aprovou e data, (k) falha e causa se houver. Sem evidência, marcar **PENDENTE**.

Os três resultados permitidos para **cada tarefa** são:
- **PRESERVADA:** comportamento antigo integralmente reproduzido, com registros corretos e prova de releitura remota.
- **MELHORADA:** comportamento antigo integralmente preservado **e** ganho medido/documentado (redução de passos, bloqueio de duplicidade, conferência ou rapidez).
- **PENDENTE:** nenhuma das provas é completa; inclui tarefa implementada apenas no laboratório.

Aprovação do módulo = todas as tarefas preservadas + pelo menos uma tarefa melhorada + sem problemas críticos/altos abertos relacionados ao módulo + aprovação operacional documentada. **Não inferir status a partir do número de commits.**

## Contratos prioritários, todos ainda PENDENTES de aceite real

| ID | Tarefa atual que nunca pode sumir | Melhoria exigida | Evidência obrigatória |
|---|---|---|---|
| ACE-001 · Pedido | Pedido com dois modelos; cores e PP/P/M/G/GG/XG/G2 próprios de cada modelo, edições depois de salvar, pesquisa e pedido antigo | Grade horizontal por item e saldo sem misturar modelos | Cadastrar, editar, reler no Safari e no Chrome; somatório por modelo, cor e tamanho |
| ACE-002 · Corte | Cortar parcialmente 80 de 120, preservar histórico e folha A4 com materiais, lixo, peças extras e três assinaturas | Mostrar 40 a cortar e permitir completar peso após finalizar, sem reabrir grade | A4 visível, peso por material, evento histórico, prova de baixa/estoque em teste |
| ACE-003 · Facções | Transferir lote entre facções com valor de mão de obra corrigível e histórico | Acerto consolidado por facção sem pagar ao prestador errado | Transferência de teste Graziano → Roseli, valores conferidos, histórico e reabertura |
| ACE-004 · Separação | Separar 50 após cortar 80, com baixa parcial por cor/tamanho | Mostrar 30 cortadas ainda a separar e 40 ainda a cortar | Reabrir pedido, comparar saldos por célula e impedir baixa duplicada |
| ACE-005 · Avulsos | Registrar serviço avulso para facção sem preço de venda do produto | Reunir serviços avulsos com acertos da mesma pessoa | Dois itens discriminados, valor certo e nenhuma cobrança de preço de nota |
| ACE-006 · Folha | Alterar passagem individual por funcionária, manter lista por confecção, salvar e reabrir | Soma correta, posição estável da lista e gravação confirmada | Cenário anonimizado equivalente ao da Lara; antes/depois do total, Safari ↔ Chrome |
| ACE-007 · Folha | Alterar outros valores por pessoa mesmo após pagamento sem perder a identidade do registro | Auditor destaca operação, valor anterior e atual | Cenário equivalente ao de Diego; releitura da edição em outra sessão |
| ACE-008 · Hub | Salvar despesa, visualizar e editar, manter histórico | Comprovante do servidor, estado local/pendente/conflito | Registrar no Safari, reler no Chrome, conferir ID e prevenir duplicidade |
| ACE-009 · Sincronização | Nenhum lançamento pode ficar invisível por falha de IndexedDB/WAL | Estados explícitos: aparelho/pendente/nuvem/conflito, recuperação idempotente | Criar offline, reconectar; também editar em dois PCs e resolver conflito sem perder versões |
| ACE-010 · Rotas | Escolher local explicitamente, ordenar paradas, LEVAR e BUSCAR, editar, imprimir | Não atribuir itens automaticamente à facção errada; manter histórico auditável | Salvar, reler em outro computador, imprimir resumo + checklists e conferir destinos |
| ACE-011 · Etiquetas | A4 em 10/18/21, modelos combinados, volume n de N e emissão em lote | Menos etapas e conferência de volumes | Imprimir modelos e volumes, comparar folhas e códigos ao legado |
| ACE-012 · Embalagem | Embaladeira individual, cliente, modelo, cor, tamanho, quantidade, pronta e etiqueta | Fila de trabalho por pessoa | Embalar parcial, conferir saldo e imprimir etiqueta correta |
| ACE-013 · Regularização | Recuperar histórico de pedidos/lotes antigos e registrar origem | Simulação reversível, sem substituição silenciosa | Prévia de diferenças, teste de restauração e prova no servidor |
| ACE-014 · Auditor/Assistente | Localizar pedido/lote/movimento/histórico sem inventar confirmação | Mostrar falha, ID, última revisão e etapa não confirmada | Pergunta de teste sobre 120 peças do Robe Gabrielle, com origem e último evento |
| ACE-015 · Fila por setor | Cada colaborador vê o que realmente pode executar no dia | Priorizar prazo e material; separação vê parcial disponível | Um pedido travado não aparece como liberado; cada aviso abre registro exato |
| ACE-016 · Atenção da gestão | Ver vencimentos, lotes divergentes, acertos pendentes, mudanças não sincronizadas | Painel de exceções com ligação para registro e motivo da pendência | Simular cada exceção, abrir o registro correto e verificar resolução |
| ACE-017 · Migração | Preservar pedidos antigos, saldos, facções, folha, acertos, histórico e pendências WAL | Comparação linha a linha + migração reversível | Snapshot isolado autorizado, reconciliação financeira/operacional, plano de rollback |

### Cenário transversal que impede lançamento

1. **Pedido antigo parcialmente atendido:** reproduzir o percurso e conferir alterações/pendências antigas em uma cópia desidentificada. Até existir cópia e concordância dos saldos, o cenário está **PENDENTE**.
2. **Pedido novo com dois modelos:** Pedido → Corte parcial → Facção → Retorno → Separação parcial → Acerto e Pagamento. Exigir grade e totais independentes por cor/tamanho, sem movimento financeiro duplicado. **PENDENTE** enquanto os novos pedidos multimodelo não estiverem integrados aos demais módulos.
3. **Reconexão em dois computadores:** criar/editar em Safari e Chrome, inclusive offline e com disputa de edição; exigir confirmação real no servidor, não apenas `pendingSync:0` ou sucesso local. **PENDENTE**.
4. **Migração ensaiada:** verificar também valores pagos, facção destinatária, itens históricos e WAL local **antes** e **depois**. Se um item divergir, impedir troca de sistema.

## Estado da frente Utilidades nesta revisão

`Rotas LEVAR/BUSCAR`: **IMPLEMENTAÇÃO FICTÍCIA EM TESTE**, ainda **PENDENTE** de aceite. O motor local suporta múltiplas paradas, criação/revisão/cancelamento com histórico, lista de levar/buscar por parada e formulário com escolha obrigatória do destino, bem como HTML de impressão A4. Roteamento automático por lotes em produção, identificação de todos os locais reais e sincronização confirmada entre dois computadores **não** foram implementados.

`Etiquetas, modelos de embalagem, embaladeira e regularização histórica`: **PENDENTES**; nenhum deles foi considerado preservado.

**Bloqueio de produção:** não realizar merge na `main`, não ligar ao banco comercial, não migrar sem inventário completo, aceite por tarefa e plano testado de reversão.
