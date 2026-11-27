# Laboratório isolado — checklist persistente (#500)
Somente dados fictícios e PostgreSQL de CI. Sem instalação no Supabase comercial. O contrato salva versões independentes por corte/pedido/modelo, linhas por material/cor, responsável, quantidades reais, faltas e notas. Replay idêntico não duplica; edição sobre versão antiga falha. Releitura e histórico preservados; sem baixa oficial. Permissões comerciais observadas: hlgb_tem_acesso e hlgb_pode_ler/escrever_modulo. Roles de laboratório não equivalem a autorização comercial. Antes de qualquer publicação: impedir inserção direta que contorne validação, resolver autoridade de usuário e RLS real, bloquear alterações concorrentes na grade/ficha (a leitura do fixture não é bloqueio de fonte), testar duas conexões simultâneas, validar leitura independente do cliente, anexos privados e limites, integrar UI e impressão sem regressões. Não instalar candidate.sql na produção.

## Segunda etapa
Função de escrita isolada com proprietário sem login, sem INSERT/UPDATE/DELETE direto pelo operador. Bloqueio por linha da fonte antes de revalidar histórico, versão e repetição. Testes com duas conexões simultâneas, repetição idêntica e tentativa de alteração da fonte durante gravação. O papel simulado via SET ROLE é exclusivo do laboratório; o mecanismo real de identidade, RLS, vínculo fonte e anexos privados ainda precisa de integração e validação. Nenhuma migração comercial.


## Fonte de registros v98.29
Laboratório com shape module/entity_id/data/revision/deleted_at observado no banco comercial, mas registros fictícios. Calcula grade e necessidades por cor no servidor, rejeita modelo divergente, fonte excluída, vínculo divergente ou consumo ausente como quantidade desconhecida, identifica revisões de corte/pedido/produto e materiais. Leitura isolada: ainda não é o RPC de gravação e não bloqueia registros comerciais. Antes de integração: testar igualdade com motor comercial (normalização de acentos, material de cor fixa ausente, composição, opções de consumo e catálogos), ligar snapshot a transação com bloqueio e controle de revisões, implementar identidade real e anexos. Não instalar em produção.

Correção do fixture: uso de to_jsonb para nomes textuais. Cor fixa ausente da grade agora gera linha explícita a conferir, sem omissão de material.


## Integração do laboratório
Histórico independente recebe apenas linhas vinculadas ao snapshot calculado no servidor, grava revisões de todas as fontes e rejeita material alterado, modelo errado, replays divergentes e versões obsoletas. O bloqueio de tabela é propositalmente restrito ao laboratório: antes de produção, trocar por bloqueios de escopo reduzido e testar concorrência do contrato integrado, identidade Supabase, paridade de cálculo, anexos e UI. Não executar no banco comercial.


## Bloqueio de escopo reduzido (v98.30)
Substitui bloqueio global do laboratório por advisory lock transacional por corte e SHARE nos registros de origem existentes. Cortes independentes podem compartilhar leitura de material, sem impedir operações alheias. Material vinculado inexistente/excluído impede gravação até revisão; a impressão comercial não é afetada. Teste concorrente da transação integrada cobre alteração de material, gravação independente e replay. Identidade comercial, paridade, anexos e integração final ainda pendentes; não executar em produção.


## Consulta e confirmação de gravação (v98.31)
Consulta histórica por corte/pedido/modelo e versão exata; listagem paginada, leitura em nova transação e autorização simulada. Contrato cliente em laboratório requer ACK e releitura independente idêntica, valida identidade, versão, revisão e quantidade por cor, impede confirmação de resposta inconsistente e mantém mesma chave na falha de transporte. Não carregado no app comercial; ainda requer transporte autenticado real, paridade de cálculo, integração visual e anexos.


## Anexos por versão (v98.32)
Laboratório bytea somente para testar conteúdo real, SHA-256, prefixo PDF/JPEG/PNG/WebP, limite de 3 arquivos de 5 MiB por versão, replay e autorização simulada. Vincula corte/pedido/modelo/versão exatos e mantém checklist imutável; leitura de bytes e metadados por função autorizada, sem acesso direto. Prefixo não é validação completa nem antivírus. Produção requer armazenamento privado, política real, verificação confiável do objeto, upload/commit/releitura, testes concorrentes e interface. Nenhuma instalação comercial.


## Autorização por funcionário (v98.33)
Mapeamento fictício com active/access conforme shape comercial hlgb_user_access. Exige Corte, Pedidos, Produtos e Materiais; decisão conservadora até validar as permissões operacionais reais. Dois operadores compartilham histórico com autoria distinta; desativação e retirada de área bloqueiam leitura, gravação e anexos. Identidade SET ROLE é exclusiva do laboratório, não deve ser usada em produção. Banco comercial consultado apenas para metadados: nenhum bucket configurado. Produção exige auth.uid() validado no servidor, RLS real e armazenamento privado; não publicar automaticamente.


## Integração visual de ponta a ponta (v98.35)
O formulário comercial chama adaptador opcional somente se instalado; o loader comercial não o instala. Em CI a candidata usa o modal real, o contrato de confirmação e PostgreSQL isolado por gateway de teste, com dois navegadores/sessões, gravação por cor, documento e consulta independente. Bloqueia divergência de linhas/grade e conserva impressão sem painel candidato. Anexos são confirmados separadamente do histórico; uma falha intermediária exige retry da mesma operação, sem afirmar sucesso. Não é autenticação Supabase nem armazenamento comercial. Falta paridade abrangente e ambiente de homologação HLGB com auth/storage reais.
