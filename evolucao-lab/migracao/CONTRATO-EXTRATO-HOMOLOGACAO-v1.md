# HLGB Evolução — contrato do extrato paginado de homologação (somente leitura)

**Estado:** protocolo implementado e testado somente com registros *inteiramente fictícios*. Não existe aqui autorização para ler o sistema comercial, integrar banco real, migrar, criar acerto, movimentar estoque, liberar pagamento ou fazer merge para \`main\`.

## Finalidade

Preparar um extrato **reproduzível e paginado** para comparar pedidos do programa antigo com pedidos multimodelo do laboratório. O adaptador funciona em Node.js e recebe um objeto JavaScript ou JSON previamente obtido. Ele **não possui conexão de banco**, cliente de produção, token, credencial, chamadas HTTP ou rotina de importação.

Arquivos:
- \`adaptador-extrato-homologacao-v1.cjs\`: \`inspectExtract(payload)\`, \`compareReads(a,b)\` e \`sha256\`.
- \`dossie-vinculos-v1.cjs\`: preserva IDs originais por documento e a fila de conferência.
- \`dossie-lote-v1.cjs\`: confere até 100 pedidos preparados e identifica documentos repetidos entre pedidos.
- \`conferir-extrato-ficticio-v1.cjs\`: gerador e validador de massa de teste, sem enviar dados à rede.
- \`tests/adaptador-extrato-homologacao-contract.cjs\` e \`tests/conferir-extrato-ficticio-contract.cjs\`: contratos automatizados.

## Envelope v1

A estrutura externa exige \`schema: "hlgb-extrato-homologacao-v1"\` e contém:

- \`source.environment: "homologacao-ficticia"\`, \`source.readOnly: true\`, \`source.snapshotId\`, \`source.revision\` e \`source.capturedAt\` ISO 8601.
- \`manifest\`: para cada uma das seis coleções, número **declarado** de \`pages\` e \`records\`.
- \`pages\`: cada página traz \`collection\`, \`page\` (a partir de 1), \`snapshotId\`, \`revision\`, \`records[]\`, \`checksum: "sha256:<digest>"\`. O digest usa serialização determinística, com propriedades ordenadas, preservando valores de string, inteiros, \`null\`, arrays e objetos.

As coleções são \`legacyOrders\`, \`preparedOrders\`, \`cuts\`, \`allocations\`, \`settlements\` e \`finance\`.

Um registro de \`legacyOrders\` exige \`id\`, \`clientId\` e \`grade[]\` com \`productId\`, \`color\`, \`size\` e \`qty\`. Um registro de \`preparedOrders\` exige seu **ID próprio** e \`sourceOrderId\` explícito apontando para o pedido antigo; a grade multimodelo preserva os campos obrigatórios já validados pelo comparador. Não se permite adivinhar equivalências por nome ou ordem de chegada.

Cada documento em \`cuts\`, \`allocations\`, \`settlements\` e \`finance\` deve trazer \`id\` e \`orderId\` explícitos. Outros vínculos, como \`cutId\`, \`sourceAllocationId\`, \`returnId\`, \`sourceId\`, situação, preço, quantidade e facção, são passados ao dossiê e ao pré-voo para verificação. Documentos sem \`orderId\` ou cujo pedido não apareça no extrato entram em \`unattached\`; **não desaparecem silenciosamente**.

## Bloqueios implementados

1. Versão desconhecida, ambiente diferente do fictício ou ausência de marcador somente leitura.
2. Snapshot/revisão diferentes entre páginas, números repetidos, páginas ausentes, contagem declarada diferente ou hash divergente.
3. Registro duplicado na mesma coleção, inclusive considerando maiúsculas/minúsculas; identidade de pedido preparado sem \`sourceOrderId\`.
4. Dois pedidos preparados apontando para a mesma origem; pedidos sem par explícito.
5. Documento sem pedido conhecido; vínculo, grade, acerto ou título contraditório.
6. Leitura repetida do mesmo snapshot com conteúdo diferente — assinalada por \`compareReads()\`, sem legitimar importação.

**Limite:** máximo de 100 pedidos antigos e 100 preparados, 20.000 registros por coleção declarada, 2.000 por página, 500 páginas por pacote. O comando de arquivo aceita até 2 MiB. Um SHA-256 válido prova apenas que a página corresponde ao checksum entregue **no mesmo pacote**; não comprova autoria, integralidade do banco original, ausência de edição por terceiros ou que a leitura ocorreu diretamente no servidor.

Os resultados sempre incluem \`importable:false\`, \`approvedForProduction:false\`, \`canWrite:false\`, \`canPay:false\`, \`canChangeStock:false\` e \`preparedChanges:0\`.

## Ensaio reproduzível (somente fictício)

A partir da raiz do repositório, com Node.js 22:

\`\`\`bash
node evolucao-lab/migracao/conferir-extrato-ficticio-v1.cjs --summary
node evolucao-lab/migracao/conferir-extrato-ficticio-v1.cjs --json > /tmp/hlgb-extrato-ficticio.json
node evolucao-lab/migracao/conferir-extrato-ficticio-v1.cjs --check /tmp/hlgb-extrato-ficticio.json
node evolucao-lab/migracao/conferir-extrato-ficticio-v1.cjs --compare /tmp/hlgb-extrato-ficticio.json /tmp/hlgb-extrato-ficticio.json
\`\`\`

O comando \`--json\` imprime **apenas** dados inventados pelo próprio código; o redirecionamento acima é opção do operador, não uma gravação produzida pelo programa comercial. \`--check\` e \`--compare\` leem apenas arquivos locais declarados fictícios e não fazem upload. **Não usar dados reais**, inclusive nomes ou documentos de clientes, funcionários ou facções.

## O que falta para a homologação empresarial única

O protocolo de leitura não é uma conexão à homologação. Um adaptador autorizado para banco único deve ser implementado separadamente, com autenticação e leitura mínima, snapshot consistente em transação, mapeamento comprovado dos dados atuais e autorização expressa antes de consultar dados empresariais.

Antes da migração, verificar também: histórico de alterações e compensações, estornos e devoluções, peças em facções diferentes, títulos pagos, acertos arquivados, folha dos cortadores, peso de materiais, permissões e 76 funções legadas; realizar backup, prova de restauração, testes entre computadores, controle de concorrência e aceite humano por tarefa. **Nenhum passo dessa lista foi aprovado por este adaptador.**
