# Validação multiusuário — 21/10/2026

Implementação no shell atual do Auditor; não cria uma autoridade adicional de abertura, timers, interceptadores de salvamento ou gravações de negócio.

## Fluxo

Auditor → Validação multiusuário → Gerar relatório deste usuário → Baixar relatório.
Repita no segundo usuário, dentro de dois minutos, sem editar entre as coletas.
Importe o JSON do primeiro no segundo. Relatórios expiram em 15 minutos.

A comparação confere identidades distintas (pseudônimos SHA-256), versão informada, filas, revisões, conteúdo recebido e conteúdo local de Pedidos, Cortes, Produção e Hub. Os dados de negócio e credenciais não são exportados. O relatório contém hashes determinísticos, portanto é pseudonimizado, não anônimo.

Diferenças de escopo ou horário geram atenção, sem declarar corrupção. Módulos ausentes, vazios ou filas indisponíveis não são aprovados. Dois relatórios do mesmo perfil são rejeitados. Há limites de tamanho, esquema, datas e registros duplicados.

## Limites obrigatórios

O resultado é sempre parcial. Fotografias iguais não comprovam Realtime, persistência após login, tratamento de conflitos ou autorização no servidor. A versão informada não identifica todos os scripts efetivamente carregados. A validação não modifica dados reais para simular esses cenários.

Para encerrar a homologação, executar em ambiente de teste com dois usuários reais:

1. A cria/altera registro autorizado; B recebe sem recarregar. Repetir B → A.
2. A e B editam simultaneamente o mesmo registro: verificar aviso/resolução de conflito e preservação dos campos.
3. Desconectar e reconectar uma sessão; confirmar reaplicação única e fila final vazia.
4. Sair/entrar e verificar persistência.
5. Verificar acesso permitido e negado no servidor para cada perfil, incluindo chamada direta à API.

## Verificações executadas

- Teste comportamental de comparação, identidade, validade, esquema, filas e autenticação.
- Regressões do shell, carregamento tardio, diagnóstico somente leitura, cliente Realtime único, contenção de nuvem, integridade e tombstones.
- O teste legado `audit-sync-confirmation-v9311.cjs` falha antes dos cenários por exigir texto da versão 93.11, enquanto o módulo atual é 93.47. Não é evidência de falha nova de sincronização; precisa de atualização de expectativas de carga compatível com o fluxo atual. Não foi alterado para forçar aprovação.

O teste WebKit novo usa dois contextos isolados e dados simulados. Não representa login ou sincronização de contas reais.

### Bloqueio visual neste ambiente

O WebKit 2336 foi baixado, mas não inicia por ausência de bibliotecas nativas (GTK4, GStreamer e outras). `playwright install-deps webkit` falhou por restrições de permissões do ambiente (`setgroups/seteuid`). O teste visual está preparado, mas **não passou nem foi executado até o fluxo de tela**. Manter PR em rascunho, sem merge, até executar o teste WebKit e revisar a tela.
