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
