# HLGB Evolução — Homologação local integrada (sem banco real)

## Entrega e limites

Esta etapa é uma **prova ponta a ponta em localhost**, com dois componentes efêmeros:

- **Servidor Node de teste:** recebe sessões com PINs **fictícios e públicos no código** e associa cada sessão a um login PostgreSQL de demonstração. O usuário não escolhe livremente o papel a cada operação: a autorização de cada comando fica no banco.
- **PostgreSQL 16 temporário:** banco `hlgb_permissoes_lab`, sete papéis inventados, schema privado `evolucao_access_lab`, autorizações de exemplo por papel/empresa e funções transacionais locais.
- **PDF demonstrativo com bytes:** `client.js` envia Base64 do `File` selecionado por HTTP local; `server.cjs` decodifica, confere o início `%PDF-` e o final `%%EOF`, calcula **SHA-256 no servidor**, salva o arquivo com permissão restrita em pasta temporária, registra os metadados por função SQL autorizada, vincula ao pagamento e impede download indevido.
- **Confirmação de resultado:** pagamento idempotente com o mesmo identificador, consulta do resultado persistido após uma resposta ficticiamente perdida e bloqueio de acesso a comandos de outros funcionários.
- **Interface adaptada:** login, consulta, upload, pagamento, comprovante e reconciliação em tela responsiva.

**Não é uma autenticação segura para produção.** O PIN de teste é conhecido; não existe fluxo real de cadastro, credenciais privadas, MFA ou Supabase Auth. Os cookies e as conexões HTTP são válidos **somente em localhost**, não devem ser publicados. O cliente de teste não deve ser integrado ao HLGB.

## Arquivos

- `01-readback-local.sql`: funções privadas `receipt_info` e `command_status`, filtradas por login do PostgreSQL local, organização e estado.
- `server.cjs`: servidor HTTP vinculado a `127.0.0.1`, com sessão opaca efêmera `HttpOnly` / `SameSite=Strict`, guarda de `Origin` e cabeçalho customizado para POST, escopo de rotas fixo, verificações de PDF e consulta ao banco de teste.
- `app.html` / `client.js`: interface mobile de homologação local. **Não** é página estática que possa ser aberta diretamente do GitHub.
- `../tests/integracao-browser.cjs`: testes de funcionamento fim a fim com Playwright, contexto autenticado em Chromium/WebKit, envio de bytes, recuperação de arquivo, troca de empresa, funcionário revogado e concorrência.
- `../../.github/workflows/evolucao-integracao-local.yml`: PostgreSQL e navegador descartáveis em CI, sem Cloudflare, sem Supabase, sem publicação e sem secrets reais.

## Proteções verificáveis

| Risco | Resultado esperado |
|---|---|
| Funcionário de outra empresa | Não consegue ler o acerto, consultar ou baixar comprovante de outra empresa, nem pagar |
| Perfil de consulta ou operação | Pode consultar informações permitidas, mas não pode realizar upload/pagamento mesmo acessando a API diretamente |
| Usuário desativado | Novas ações são negadas, mesmo se o cookie de demonstração ainda existir |
| Acesso sem sessão | Não pode ler, baixar, enviar nem pagar |
| Tentativa CSRF de origem diferente | Servidor responde 403 |
| PDF com extensão errada, assinatura incorreta ou acima do limite | Rejeitado, sem persistir metadados ou arquivo |
| PDF adulterado após upload | SHA-256 não confere; download rejeitado |
| Comprovante de outro funcionário | Não pode ser ligado ao pagamento |
| PDF anexo em pagamento concluído | Continua acessível apenas a financeiro autorizado da mesma empresa |
| Duas pessoas pagam com a mesma revisão | Uma operação confirma; outra recebe conflito, sem duplicidade |
| Resposta perdida após confirmar | Pode ser reconciliada pelo comando; não deve reenviar cegamente |
| Layout mobile | Cinco larguras entre 320 e 1280 px em Chromium e WebKit |

## Restrições importantes

1. **PDF real em bytes não significa PDF seguro.** O laboratório verifica apenas marcadores de formato e tamanho, não faz varredura antivírus, sanitização, análise completa de estrutura ou validação criptográfica de conteúdo. Para a aplicação real, haverá verificação robusta em serviço dedicado.
2. Arquivos e metadados estão em sistemas separados (disco e PostgreSQL). Uma falha no meio do envio pode criar um **arquivo órfão** ou um registro `staged`. A limpeza automática e a reconciliação de órfãos ainda precisam ser implementadas/testadas antes de produção.
3. O laboratório usa logins diferentes de PostgreSQL para simular identidade. **Supabase Auth funciona de outra forma**, por JWT validado e políticas/controles adequados. Nenhuma destas funções `SECURITY DEFINER` deve ser copiada diretamente para `public` ou para o projeto da empresa.
4. Não há sincronização Safari ↔ Chrome com IndexedDB/WAL real, nem conexão com o HLGB, nem dados de empregados ou clientes.
5. A pasta temporária é removida ao fechar o servidor de teste. Nunca envie comprovantes verdadeiros para este laboratório.
6. As configurações de `SameSite` e política de origem servem exclusivamente ao localhost demonstrativo. Em ambiente real será exigido HTTPS, autenticação adequada, proteção contra CSRF e gestão de sessões de verdade.
7. A interface ainda não foi homologada com os funcionários nem testada em iPhone físico.

## Conclusão responsável

Este teste serve para determinar se o desenho proposto **consegue** realizar controle de acesso e transferência de PDF de ponta a ponta com dados fictícios. Não demonstra segurança de produção, conformidade completa, migração segura nem compatibilidade com os 76 recursos antigos.

O inventário mantém **266 itens de desenvolvimento ainda pendentes de homologação**; não alterar `main` e não integrar sem autorização explícita.
