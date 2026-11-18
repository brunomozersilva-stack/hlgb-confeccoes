# HLGB comercial — plano de homologação e merge único (candidato v96.04)

> **NÃO PUBLICAR automaticamente.** Este documento prepara o merge e não atesta aprovação dos testes.

## Objetivo
Integrar a estrutura modular, o núcleo de grade por modelo do Cortador e o núcleo de cálculos da folha impressa sem perder funções, dados, IDs, históricos, formulários, impressão, login, sincronização ou gravação.

## Topologia
- PR #260 — estrutura e verificações modulares; base `main`.
- PR #261 — extração inicial isolada, **substituída pela integração da #262**; não integrar à parte.
- PR #262 — núcleo de grade, empilhada sobre #260.
- PR #263 — núcleo da folha, empilhada sobre #262.
- **PR final desta branch** — agregação da árvore da #263 contra a `main`, inicialmente *draft*.
- Reconciliar históricos dos branches de desenvolvimento não é integrar à `main`. Nenhuma publicação foi feita.

## O que o candidato muda em relação à main
- `app-stable3.html`: organiza os 156 scripts originais em 16 grupos, na mesma ordem, acrescentando exatamente dois módulos puros (total 158).
- `release-cutter-planner.js`: delega cálculos puros de grade com fallback preservado.
- `release-cutter-sheet-materials-v9523.js`: delega seleção de grade e previsão de materiais com fallback preservado.
- Outros arquivos de diffs devem ser apenas catálogo, módulos novos, documentação, testes e workflows.
- `app9240.html`, transporte de gravação, WAL, estrutura do banco e demais fontes críticas não podem ser mudados por este candidato.
- A lista efetiva e SHAs críticos devem ser comparados à versão anterior e não apenas inspecionados visualmente.

## Portões obrigatórios antes de marcar Ready for review
- [ ] Ações do GitHub concluídas **com sucesso**, sem `queued`, `failed` ou `cancelled` em checks necessários.
- [ ] Teste de limites modulares: 156 scripts legados na ordem original + 2 módulos puros, nenhum duplicado.
- [ ] Catálogo por domínio: testes das áreas afetadas e das dependências transitivas.
- [ ] Regressão geral existente: abertura, login, Pedidos, Corte, Produção, Facções, Acertos, Hub, Folha, Etiquetas, Auditor, Assistente e mobile.
- [ ] Corte: pesquisa do pedido com múltiplos modelos, programação individual, reabertura e edição sem criar outro corte.
- [ ] Persistência: ACK **e releitura remota**, recuperação pós-timeout, bloqueio de sobrescrita divergente, guarda de WAL.
- [ ] Pesagem e histórico: saldo, peso total/usado/lixo, alteração após finalização, nenhuma perda de status/grade.
- [ ] Folha A4: conferência visual no Chrome e Safari (grade, materiais, pesos, aproveitamento, campos e assinaturas).
- [ ] Pelo menos duas sessões/navegadores sincronizam as mesmas mudanças em ambiente de testes, sem gravar dados comerciais.
- [ ] Homologação visual desktop/mobile e Safari/Chrome com usuário de testes, sem alterar a produção.
- [ ] Prova de que o deploy da `main` será tratado como publicação: identificar fonte GitHub Pages e janela segura.
- [ ] Conferir backup recente e restaurável do banco comercial antes de qualquer publicação; preservação das pendências locais IndexedDB/WAL.
- [ ] Aprovação explícita da responsável pelo HLGB para integrar/publicar.

## Procedimento de merge
1. Registrar SHA da `main` e da branch candidata imediatamente antes de integrar. Se `main` tiver mudado, atualizar o candidato e refazer as regressões.
2. Manter PR #260, #262 e #263 como referência da validação; **não** integrá-las individualmente na `main`.
3. Com todas as provas e aprovação, tirar o status de rascunho da PR final.
4. Fazer um único **merge commit** da PR final na `main`, usando o SHA exato aprovado. Não usar auto-merge.
5. Conferir versão, carregamento, gravação remota, auditoria, Cortador e impressão depois do deploy. Se falhar, suspender lançamentos e avaliar reversão.

## Reversão
- Guardar SHA anterior da `main`, logs e backup validado.
- Preferir reversão do *merge commit* por PR de rollback, seguida de testes; **não** fazer `force push` nem apagar histórico.
- Uma reversão de código **não** reverte automaticamente dados de negócio. Se houver gravação incerta, preservar WAL e reconciliação por `opId` e identidade do registro.
- Desativar o módulo puro por fallback apenas com teste e rastreabilidade. Não limpar IndexedDB de funcionários.

## Bloqueios atuais (a reavaliar no dia do merge)
- GitHub Actions da stack ainda estava em `queued` na verificação de 18/11/2026.
- Homologação real Safari/Chrome e testes de duas sessões ainda não comprovados.
- Fonte exata da publicação GitHub Pages não foi confirmada pela API de Pages; presumir que merge em `main` pode atingir usuários.
