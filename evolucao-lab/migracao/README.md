# HLGB Evolução — plano de migração preservadora

**Escopo atual: somente inventário de esquema, contratos com dados sintéticos e preparação. Nenhum registro real exportado, nenhum banco alterado.**

Arquitetura: organização HLGB exclusiva, projeto novo separado da operação atual e da loja. O projeto hospedado ainda depende da disponibilidade e autorização de custo da organização. A conexão da produção nunca será usada como destino.

## Inventário e precedência

- `hlgb_records`: identidade composta (module, entity_id), revisão, dados JSONB, deleted_at, updated_at, updated_by. Preservar todos os registros inclusive tombstones; não recuperar excluídos como ativos.
- `hlgb_data`: snapshots legados e metadados; não misturar automaticamente com registros centrais.
- Produtos, materiais, clientes e pedidos possuem tabelas de espelho. Conservar origens e resolver diferenças por regra comprovada, nunca por nome, quantidade ou timestamp isolado.
- Históricos, atividades, diagnósticos, memória e feedback do assistente são arquivos de evidência; não executar comandos neles registrados.
- Acesso, identidades, Storage (PDFs e imagens), backups adicionais e configurações externas são inventários separados. Revisar permissões antigas; não ativar grants, outboxes nem comunicações automaticamente.
- Identificadores declarados neste contrato são candidatos baseados nas colunas conhecidas. Antes de exportar, confirmar constraints, índices, unicidade e escopo completo. O contrato é de conferência do arquivo, não uma migração física concluída.

## Protocolo

1. Inventário fechado de todas as tabelas, objetos e referências; backup criptografado e teste de restauração.
2. Extrair snapshot consistente por conexão autorizada e somente leitura; usar texto JSON original e chaves textuais para preservar valores numéricos grandes, datas, revisões e campos ainda desconhecidos. Hash SHA-256 por envelope; não publicar dados ou hashes individuais em GitHub.
3. Inserir no arquivo privado de staging, sem executar ações de negócio. Validar hashes, contagens por tabela e módulo, ativos/excluídos, referências e exceções. Tabelas de backup e Storage requerem manifesto próprio.
4. Transformação por adaptador explícito de cada módulo, com chave de origem, vínculo de destino, unidade monetária, quantidade, grade, situação e razão de qualquer exceção. Não usar conversão heurística nem descartar campos não mapeados.
5. Reconciliar pedidos/corte/retorno/separação, acertos pagos e abertos, Hub Financeiro, materiais, folha, relações de usuários, anexos e históricos. Comparar totais de valores e quantidades e verificar amostras e chaves. Um manifesto idêntico NÃO certifica paridade funcional.
6. Homologar com base protegida, sem pagamentos ou comunicações externas. Preparar janela de corte, reconciliar WAL em todos os dispositivos e capturar alterações finais. Autorizar troca somente com aprovação humana, alternativa de retorno testada e antigo sistema preservado. Não permitir escrita simultânea independente nas duas bases.

O módulo `manifesto.cjs` só verifica arquivos fictícios e não tem acesso remoto. Campo activationAllowed permanece false. A verificação de integridade não restaura nem ativa dados. Materiais sensíveis não serão disponibilizados em repositório público.
