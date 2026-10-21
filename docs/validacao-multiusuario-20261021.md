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
- GitHub Actions executou a validação lógica multiusuário com sucesso no run `39635590380`.
- GitHub Actions executou WebKit com dois contextos isolados simulados: geração dos dois relatórios, downloads, importação, comparação, rejeição do mesmo perfil e ausência de erros de página. A etapa passou no run `39635590380`.
- A captura `hlgb-multiuser-webkit.png` foi publicada como artefato do mesmo run e revisada; não foi observada quebra aparente de layout no viewport de 1100 × 850 usado pelo teste.
- O teste legado `audit-sync-confirmation-v9311.cjs` falha antes dos cenários por exigir texto da versão 93.11, enquanto o módulo atual é 93.47. Não é evidência de falha nova de sincronização; precisa de atualização de expectativas de carga compatível com o fluxo atual. Não foi alterado para forçar aprovação.

O teste WebKit novo usa dois contextos isolados e dados simulados. Ele valida interface e fluxo no motor WebKit, mas não representa login, Realtime, RLS ou sincronização de duas contas reais.

### Ambiente local x CI

No ambiente local anterior, o WebKit não iniciou por ausência de bibliotecas nativas e restrições de permissão para `playwright install-deps webkit`. Esse bloqueio foi contornado no GitHub Actions, onde as dependências foram instaladas e o teste WebKit passou. A pendência restante para homologação é o teste operacional com duas contas reais autenticadas.

Manter PR em rascunho e sem merge até concluir os testes operacionais com duas contas reais.
