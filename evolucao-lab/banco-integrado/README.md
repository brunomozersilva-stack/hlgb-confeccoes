# HLGB Evolução — persistência integral, etapa 1

**Não é banco hospedado.** A interface de 19 módulos permanece local no IndexedDB. Este adaptador integra o núcleo de operações ao PostgreSQL descartável, usando o mesmo código de regra e validação no servidor.

- Guarda conexão por nome, host e marcador do banco; nenhum endpoint, segredo ou credencial da empresa.
- Transação com bloqueio de revisão, comando único, fingerprint SHA-256 do ator + payload canônico, evento auditável e snapshot atômico.
- Repetição idêntica retorna o resultado anterior; ID reaproveitado com outro conteúdo ou ator é rejeitado.
- Releitura em transação consistente compara comando, evento e snapshot; não reenvia automaticamente.
- CI: `HLGB Evolucao - Banco Integral Descartavel`. Teste integrado de pedidos, corte, facções, financeiro, concorrência e recuperação do comprovante local de gravação. Execução pendente até o GitHub concluir.

## Separação e limites

O projeto Supabase atual da HLGB e o projeto da loja não são alvos. Não há deploy, migração remota, credenciais reais, acesso público ou aprovação de produção. O usuário privilegiado existe somente no contêiner de teste. RLS forçada e revogação pública são defesa inicial, não comprovação de autenticação ou autorização reais. O documento agregado inclui dados de vários módulos; não deve ser exposto diretamente a usuários por API.

Antes de hospedar: criar projeto dedicado autorizado (organização e preço confirmados se necessário), validar referência e ambiente, implementar autenticação e perfis com acesso mínimo, separar dados por escopo/entidade, guardar PDFs em storage privado, adicionar backend validando identidade e comandos, configurar backup/restauração, executar teste de CORS/HTTPS e duas sessões reais, integrar UI ao transporte, homologar todas as funções antigas. Não transportar dados reais até aprovação específica.

Nenhuma chamada a produção. Não mesclar em main. Não copiar dados da confecção para o laboratório.

## Privilégios e prova integral
A criação do esquema usa o administrador exclusivamente no PostgreSQL descartável. O runtime usa `hlgb_lab_runner` com RLS, sem poderes de administrador, DDL ou exclusão e alteração de eventos/comandos. O servidor recusa outro usuário de conexão. Provas HTTP exigem o comando original e o ator da sessão; o fingerprint é comparado. O snapshot passa por comparação da trilha inteira, não somente do último evento. Credenciais declaradas são exclusivamente de CI, não reutilizar em hospedagem. 

### Login de laboratório fictício
O POST do formulário usa nonce CSRF de uso único, cookie HttpOnly SameSite=Strict sem depender de Origin/Referer (que navegadores podem omitir em formulários). O token é guardado em memória no servidor e só pode ser usado uma vez, sem exigir o cabeçalho `Origin` de navegadores que não o enviam. O POST JSON autenticado exige cabeçalho customizado e tipo application/json; nunca é login empresarial ou publicação pública. Os PINs em código são apenas de teste local. 

## Perfis de escrita demonstrativos (não liberar)
- Operador A: todos os comandos inventariados explicitamente (falha fechada para novos comandos desconhecidos).
- Operador B: operações de pedidos, corte, facções e embalagem; proibidos os comandos financeiros, Folha e ajustes administrativos.
- A política é conferida no servidor e desabilita botões na interface apenas como auxílio. Burlar a interface não libera comandos.
- A leitura é agora isolada no servidor por perfil de laboratório: `/api/state` só atende Operador A; `/api/production-state` só atende Operador B e retorna campos explicitamente permitidos de pedidos, clientes, produtos, facções e folhas de corte, sem preços, Folha, salários, contas ou trilha financeira.
- O Operador B abre a página `/producao-integrada.html`, que permite ensaiar criação de pedidos, corte simples, envio e retorno por facção com confirmação via PostgreSQL e WAL. É uma primeira tela operacional restrita; não substitui os 19 módulos da interface administrativa.
- **Limitação crítica:** as identidades e senhas continuam fictícias, sem autenticação empresarial, regras de acesso por funcionário/empresa, RLS de produção, proteção de dados reais ou garantia de que todos os campos operacionais futuros foram classificados. Projeção segura é defesa de laboratório, não aprovação de produção. Não usar dados reais nem hospedar este servidor publicamente.

### Inicialização de testes sem dependência de psql no navegador
A matriz de navegadores prepara o banco de CI com `preparar-ci.cjs` usando Node/pg, eliminando a instalação desnecessária de `postgresql-client`. O preparador exige explicitamente `GITHUB_ACTIONS=true`, `CI=true`, endereço loopback, banco e credenciais fictícias de CI, e valida o marcador SQL. Não iniciar em servidores ou bancos reais.

### Identidades individuais de ensaio — etapa 2
Três funcionários **inventados** possuem IDs distintos: LAB-FUN-001 (administração), LAB-FUN-002 (produção) e LAB-FUN-003 (corte). A sessão do servidor escolhe o ator; o navegador não pode enviá-lo para executar operações em nome de outra pessoa. O identificador do ator acompanha o registro de comandos do laboratório. O perfil de corte só grava `cut.record`, não lê clientes, facções, salários nem contas, e pode visualizar apenas pedidos, modelos e grades necessários ao corte.
O formulário possui PINs **fictícios e publicados no código**, CSRF de uso único, cookie HttpOnly SameSite=Strict, bloqueio local após cinco erros por perfil e encerramento de sessão. O bloqueio não substitui autenticação empresarial, MFA, revogação durável, limitação distribuída, gestão de usuários ou políticas RLS em ambiente hospedado. O servidor continua preso ao loopback, sem dados reais. Não autorizar publicação nem migração.

### Revogação transacional no banco descartável — etapa 3
O PostgreSQL de CI mantém três contas fictícias em `hlgb_integrado_lab.lab_accounts` e histórico de desativação em `lab_access_events`. Somente o Operador A pode desativar B ou C; não existe rota para desativar A nem para reativar contas. Contas desativadas não voltam a efetuar login e suas sessões antigas são removidas. Toda requisição verifica o status da conta; `commit`, `readback` autenticado e `cancel` também revalidam a conta, usando a mesma trava transacional da desativação para evitar gravação posterior à confirmação de revogação.

Em `/acessos-lab.html` a Administração visualiza apenas três identificações inventadas, seus perfis e status. O navegador pode confirmar e desativar B/C por um botão; a API `/api/admin/accounts` recusa os operadores. As provas automáticas verificam bloqueio imediato, autenticação negada, leitura segregada, histórico imutável e persistência sem duplicações.

**Limite:** os PINs são públicos e fictícios. Isto não implementa MFA, recuperação de conta, SSO, identidade empresarial verificada, roles empresariais no banco, permissões por entidade/empresa ou hospedagem segura. Não hospedar, não usar funcionários reais, não integrar o banco do HLGB comercial.

### Rate limit persistente no laboratório — etapa 4
Cinco PINs errados para uma mesma identidade fictícia bloqueiam novas tentativas por 15 minutos. O estado reside em `lab_login_attempts` no PostgreSQL descartável, sob transação e `SELECT FOR UPDATE`, não mais em um mapa volátil de cada processo. Servidores de teste locais que acessam o mesmo banco compartilham o bloqueio. Login válido reinicia o contador quando a conta não está bloqueada nem desativada. Códigos desconhecidos compartilham a faixa `unknown`.
O banco guarda eventos append-only `lab_login_events` de sucesso, falha, bloqueio e conta desativada, sem PIN, cookie, IP ou dados reais. Somente a administração fictícia pode consultar as 30 ocorrências recentes por `/api/admin/login-events`; a API de produção as recusa. Os eventos são informação de teste; não são autenticação empresarial.

### Validação em duas instâncias locais
O contrato de CI inicia dois servidores HTTP locais independentes que compartilham o mesmo PostgreSQL fictício, erra cinco vezes o PIN A no primeiro e confere que o segundo recusa o PIN correto durante o bloqueio. O painel `/acessos-lab.html` mostra uma tabela das 30 tentativas fictícias recentes, sem segredos. O código jamais pode ser publicado como autenticação de produção: contas e PINs continuam ilustrativos e sessões HTTP ainda ficam em memória por instância.

### Sincronização de telas restritas — etapa 5
A tela `/producao-integrada.html` consulta a revisão do PostgreSQL a cada 15 segundos, ao receber foco ou ao voltar à aba. Quando outra sessão altera o banco, avisa a revisão nova, bloqueia os botões de gravação e disponibiliza `Conferir e atualizar dados compartilhados`. Essa checagem é exclusivamente de leitura; jamais reaplica comandos ou apaga o WAL. Quantidades digitadas são preservadas ao conferir outra revisão. Se existir operação pendente, a atualização exige primeiro a conferência de WAL; se a revisão mudar na verificação imediatamente anterior ao envio, o comando não é criado. Os mesmos fluxos são cobertos por testes de Chromium e WebKit/Safari entre as sessões A e B.

### Sequência completa do chão de fábrica restrito — etapa 6
Os formulários fictícios de `/producao-integrada.html` agora incluem `order.separate` e `order.ship`. A tabela de pedidos mostra saldos **retornado e ainda não separado**, **separado e ainda não expedido**. Os formulários conferem a quantidade disponível na revisão lida e não criam intenção local se o valor exceder o saldo; o núcleo no PostgreSQL revalida independentemente. Quantidades digitadas permanecem intactas ao atualizar a revisão. A política B já autoriza as duas operações; C continua limitado a `cut.record`, e não recebe clientes, facções, contas ou salários. O ensaio integrado registra corte pela pessoa C, envio/retorno/separação/expedição por B, verifica um único acerto e título, a trilha dos quatro eventos e bloqueia separações/expedições excedentes sem alterarem a revisão.

### Facções multidestino e transferência parcial — etapa 7
A tela de Produção agora permite `faction.multi.allocate`, `faction.multi.transfer` e `faction.multi.return`. O operador visualiza apenas `id`, `orderId`, `factionId`, `qtySent` e `qtyReturned` de cada envio, na projeção do servidor e em uma tabela de saldos. Corte não recebe esses dados, nem pode abrir os formulários. Transferências exigem justificativa, destino diferente e deixam ao menos uma peça no envio de origem; o backend revalida tudo transacionalmente. A transferência não altera acertos já gerados nem duplica a quantidade enviada, e o retorno identifica precisamente a facção recebedora para o acerto. Valores de serviços, acertos, títulos e transferências detalhadas continuam fora da projeção operacional. Teste integrado cria pedido separado de 5 peças, corta, distribui a duas facções, transfere 2 peças e confere o retorno, o acerto e o título único no banco, além do bloqueio de transferência inválida.
