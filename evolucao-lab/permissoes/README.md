# HLGB Evolução — Permissões por funcionário e comprovantes (laboratório descartável)

**Não é uma migration do Supabase. Não executar no banco do HLGB.**

## O que foi construído

- Um schema privado `evolucao_access_lab` em **PostgreSQL 16 temporário**, obrigatoriamente dentro do banco denominado `hlgb_permissoes_lab`.
- Sete logins inventados, separados por empresa, função e estado ativo/desativado. As credenciais são **fictícias e locais ao contêiner de CI**.
- Três rotinas de demonstração: `preview_group` (consultar acerto da própria empresa), `stage_receipt` (preparar **somente os metadados** de PDF fictício) e `pay_group` (registrar um pagamento sintético completo).
- Funções em schema privado, `REVOKE EXECUTE FROM PUBLIC`, permissões de execução explícitas, sem `GRANT` direto de SELECT/UPDATE/INSERT nas tabelas para os usuários simulados. RLS habilitado e forçado nas sete tabelas do teste.
- Bloqueio de empresa diferente, papel sem permissão, funcionário desativado, upload de outra pessoa, reenvio com mesmo identificador e pagamento concorrente.
- `permissoes-mobile.html`: demonstração **offline e mobile** das permissões esperadas. Desabilitar botões não é uma medida de segurança, por isso a prova de controle real está nos testes do banco descartável.

## Limitação crítica da identidade

O PostgreSQL local diferencia pessoas pelo **login de conexão** (`session_user`), que, no teste, é uma identidade controlada pelo próprio PostgreSQL. Isso **NÃO corresponde à autenticação do Supabase em produção**, que normalmente compartilha um papel de banco `authenticated` entre usuários e identifica a pessoa com um JWT verificado.

As funções de laboratório são `SECURITY DEFINER` em schema privado, com caminho de busca fixo e validações explícitas; isso **não autoriza copiá-las para o HLGB**. Uma futura implementação deve ser redesenhada e auditada para usar sessões validadas, `auth.uid()`, identidade da empresa e permissões internas apropriadas. Deve ser revisada para evitar bypass de RLS, elevação de privilégio e execução pública de funções. Jamais usar `raw_user_meta_data` como permissão.

## Comprovantes

O laboratório **não envia, recebe, lê ou grava bytes de PDF**, nem acessa Supabase Storage.

Os testes validam somente: nome terminado em PDF, MIME `application/pdf`, SHA-256 declarado, tamanho até 10 MiB, proprietário, empresa e estado `staged → attached` dentro de uma transação. O hash declarado **não foi comparado a bytes**, portanto não é prova de autenticidade do arquivo. O fluxo futuro exigirá upload real isolado, verificação confiável de conteúdo e hash, autorização de Storage e limpeza de uploads órfãos.

## Testes automatizados

- `tests/permissoes-postgres.cjs`: isolamento entre empresas, permissões negadas no banco, acesso com papel de consulta e operação, suspensão de usuário, tentativas de falsificar parâmetros de JWT, metadados de PDF, pagamento com rollback e dois financeiros simultâneos.
- `tests/permissoes-mobile.cjs`: tela de sete perfis fictícios, ações bloqueadas/permitidas, ausência de rede e cinco larguras entre 320 e 1280 pixels, em Chromium e WebKit.
- `.github/workflows/evolucao-permissoes-isolado.yml`: três jobs de CI, **sem qualquer acesso ao Supabase da empresa**, sem segredos reais, sem deploy, sem `merge` e com permissão GitHub `contents: read`.

## O que continua pendente antes de integrar qualquer módulo

1. Validar as regras reais de função/cadastro de pessoas e diferentes empresas no HLGB.
2. Implementar autenticação do Supabase e autorização verificável por sessão com RLS adequada, em projeto **separado e autorizado**.
3. Testar os PDFs reais com upload, Storage, tipos de arquivo, dono, validade do anexo e recuperação de órfãos.
4. Preservar o inventário de **76 funções**, o detalhamento de **43 cenários** e o histórico existente.
5. Testar duas sessões reais no Safari e Chrome com WAL/IndexedDB e eventual perda de conexão.
6. Fazer homologação funcional com os funcionários e autorização explícita da responsável para qualquer alteração em produção.

O Plano Mestre mantém **266 itens pendentes de homologação de produção**. Os testes aqui demonstram apenas o laboratório.
