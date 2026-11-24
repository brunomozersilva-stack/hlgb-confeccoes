# Assistente e pesquisas — #313 #301

15 verificações controladas. Nova ação de consulta com evidências no Assistente existente, separada do roteador legado. Pedidos e modelos por referência, fontes e IDs explícitos, reavalia permissões antes de ler, sem valores financeiros, sem gravação, sem IA externa. Não resolve todos os comandos existentes nem prova sincronização. Inventário inicial de 37 campos em 15 páginas do HTML original, não inclui campos montados dinamicamente, todos marcados como inventariados/não testados. Teste de paridade com HTML e CI acrescentados. Próximo: teste de UI real com login simulado, cobertura das buscas dinâmicas e autorização no servidor; preservar voz/importação/edição originais.

## v96.70 — consultas integradas e triagem

Assistente com exemplos de pedidos, histórico de modelo, materiais, acertos de facção/cliente/funcionário por identidade e previsão semanal do Hub. Reutiliza adaptadores existentes e checa todas as permissões; troca de ator ou de escopo descarta consulta, sem listeners duplicados. Não executa comandos financeiros, não conclui sincronização, não usa IA externa. 30 asserções controladas.

Auditor: triagem priorizada de pendências WAL, conflito/ACK, armazenamento, autenticação, nuvem e runtime; orientação para reproduzir antes de corrigir, nenhuma reparação automática. Status identifica versão e cobertura da auditoria. 22 asserções. Bot: distingue aprovação, cancelamento, inconclusão e falha (contagem total, não limitada às 18 referências exibidas), deduplica tentativas do mesmo run, indica janela parcial e cache desatualizado; não certifica checks obrigatórios nem duas sessões. 15 asserções. Mobile: busca sem acentos e por termos, revalidação do item de origem, foco e fechamento no logout, ajuste de campos; 5 casos de busca controlados, suite nativa adicionada a Chromium/WebKit. Não publicar antes da homologação.

Correção CI da PR #310: run 45304497656, ambos browsers falharam por seletor de “Modelo de origem” ambíguo. Adicionado exact:true na candidata e no pacote funcional. Caso só poderá integrar aprendizado confirmado quando a reexecução do commit corrigido comprovar sucesso.
