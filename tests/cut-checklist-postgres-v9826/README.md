# Laboratório isolado — checklist persistente (#500)
Somente dados fictícios e PostgreSQL de CI. Sem instalação no Supabase comercial. O contrato salva versões independentes por corte/pedido/modelo, linhas por material/cor, responsável, quantidades reais, faltas e notas. Replay idêntico não duplica; edição sobre versão antiga falha. Releitura e histórico preservados; sem baixa oficial. Permissões comerciais observadas: hlgb_tem_acesso e hlgb_pode_ler/escrever_modulo. Roles de laboratório não equivalem a autorização comercial. Antes de qualquer publicação: impedir inserção direta que contorne validação, resolver autoridade de usuário e RLS real, bloquear alterações concorrentes na grade/ficha (a leitura do fixture não é bloqueio de fonte), testar duas conexões simultâneas, validar leitura independente do cliente, anexos privados e limites, integrar UI e impressão sem regressões. Não instalar candidate.sql na produção.

## Segunda etapa
Função de escrita isolada com proprietário sem login, sem INSERT/UPDATE/DELETE direto pelo operador. Bloqueio por linha da fonte antes de revalidar histórico, versão e repetição. Testes com duas conexões simultâneas, repetição idêntica e tentativa de alteração da fonte durante gravação. O papel simulado via SET ROLE é exclusivo do laboratório; o mecanismo real de identidade, RLS, vínculo fonte e anexos privados ainda precisa de integração e validação. Nenhuma migração comercial.


## Fonte de registros v98.29
Laboratório com shape module/entity_id/data/revision/deleted_at observado no banco comercial, mas registros fictícios. Calcula grade e necessidades por cor no servidor, rejeita modelo divergente, fonte excluída, vínculo divergente ou consumo ausente como quantidade desconhecida, identifica revisões de corte/pedido/produto e materiais. Leitura isolada: ainda não é o RPC de gravação e não bloqueia registros comerciais. Antes de integração: testar igualdade com motor comercial (normalização de acentos, material de cor fixa ausente, composição, opções de consumo e catálogos), ligar snapshot a transação com bloqueio e controle de revisões, implementar identidade real e anexos. Não instalar em produção.

Correção do fixture: uso de to_jsonb para nomes textuais. Cor fixa ausente da grade agora gera linha explícita a conferir, sem omissão de material.


## Integração do laboratório
Histórico independente recebe apenas linhas vinculadas ao snapshot calculado no servidor, grava revisões de todas as fontes e rejeita material alterado, modelo errado, replays divergentes e versões obsoletas. O bloqueio de tabela é propositalmente restrito ao laboratório: antes de produção, trocar por bloqueios de escopo reduzido e testar concorrência do contrato integrado, identidade Supabase, paridade de cálculo, anexos e UI. Não executar no banco comercial.
