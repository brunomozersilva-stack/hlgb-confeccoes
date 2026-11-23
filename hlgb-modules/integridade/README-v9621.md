# HLGB Comercial v96.21 — triagem conservadora
Esta é uma extração de lógica **somente leitura**; não está ligada ao carregador comercial, não é um reparador automático e não prova que dados de produção estejam reconciliados.
Os dados de entrada devem vir de leituras autorizadas do auditor, fornecidas por um adaptador futuro.

## Casos identificados
- Corte ativo 1794488399889 sem productId com pedido ativo 1794488399888 e candidato de grade 1788193589429: `inspectCut` informa candidato, **não** altera o corte.
- Financeiro pago vinculado à nota excluída logicamente em 24/10: `inspectPaidInvoice` distingue **arquivada** de **não encontrada no snapshot**, sem recriar a nota nem cobrar novamente.
- WAL no Safari de 23/11: 25 registros, dos quais 4 divergentes, 4 remotos ausentes e 17 não verificados. `inspectWal` é estritamente conservador; **não** limpa nem repete operações. A consulta isolada das 8 entradas anteriormente verificadas não é reconciliação de toda a fila.
- Script `release-printer3d-persistence-v9431.js` com 2 elementos DOM e 2 recursos na sessão reportada: `inspectScripts` separa tags duplicadas de pedidos de rede repetidos; **não** remove script nem interfere na hidratação 3D.

## Regras antes da integração operacional
1. Criar adaptadores somente leitura que usem snapshots por revision/opId e discriminem tombstones; testar contra dados remotos, mas nunca mutar a partir de um parecer.
2. Para corte, exigir comparação de grade, revision e WAL no mesmo instante antes de sugerir atualização manual.
3. Para notas arquivadas, exibir vínculo com histórico e motivo quando comprovados; nunca restaurar/excluir automaticamente.
4. Para 3D, capturar src das tags, ordem de inserção e prova da origem do segundo script. Uma guarda global reduz efeito colateral mas não justifica remover carregamento.
5. Dar baixa em WAL somente com protocolo transacional próprio, replay idempotente, ACK remoto e prova de releitura em outra sessão. **Nenhum desses procedimentos é implementado por esta PR.**

Documentação: #152, #276, #280, #283, #287.
