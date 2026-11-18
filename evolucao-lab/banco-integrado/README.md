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
O POST do formulário usa nonce CSRF de uso único, cookie HttpOnly SameSite=Strict e conferência de Origin quando presente, sem exigir o cabeçalho `Origin` de navegadores que não o enviam. O POST JSON autenticado exige cabeçalho customizado e tipo application/json; nunca é login empresarial ou publicação pública. Os PINs em código são apenas de teste local. 
