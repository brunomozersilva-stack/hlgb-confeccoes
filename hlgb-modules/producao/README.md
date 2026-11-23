# HLGB Comercial — Produção / Separação (extração física v96.17)

## Escopo realizado
Esta etapa parte da `main` `76042bdf7e27139bc110c161658520129b3a467a` do **HLGB comercial em uso**, não da Evolução HLGB.

- O arquivo novo `separacao-progresso-v9617.js` contém apenas os cálculos puros **`progress(separation,productId)`** e **`totalsForItems(items,separation)`**. Não há acesso à nuvem, WAL, IndexedDB, campos editáveis, DOM nem escrita.
- O controlador legado `release-separation-commit-v9319.js` permanece integral, exceto pelas três inserções de delegação opcionais. Tem fallback para o cálculo antigo caso o módulo não exista **ou lance erro**.
- O carregador continua uma lista plana e na **mesma ordem dos 158 scripts já presentes**, inserindo só o núcleo puro imediatamente antes do controlador legado. O núcleo não está na lista de arquivos essenciais da tela de login.
- `app9240.html` não é alterado. O motor de pedido, baixa parcial, conclusão, `hlgbRecordSaveWithRetry`, ACK, UI, `modelProgress`, `history` e `pendingFor` seguem sob os mesmos responsáveis de gravação.

## Validação de equivalência
`tests/hlgb-live-separation-progress-v9617.cjs` protege **60 casos de totais** e **120 leituras por ID** — incluindo quantidades inválidas, negativas, excesso de peças, prefixos antigos (`prefixo:produto`), grade consolidada e projeção por modelo. Valida que o controlador é idêntico ao commit anterior fora das três inserções e que o resultado é o mesmo com núcleo presente/ausente/defeituoso.

`tests/audit-separation-commit-v9319.cjs` continua cobrindo baixa parcial e conclusão: 1 gravação do registro de Separação e 1 gravação do pedido quando conclui, sem duplicá-las.

A PR deve passar WebKit, Chromium, contratos de loader/inventário e regressão geral antes de merge. Testes automatizados não comprovam, por si sós, que a funcionária salvou corretamente no Safari real.

## Melhorias futuras **não encerradas**
- **#276:** histórico e acertos por data/facção/cliente/funcionário, baixa e arquivo;
- **#277:** Corte Conjunto, materiais compatíveis e simulação de grade;
- **#278:** sobras/pontas Sim/Não/Não informado e produtos que cabem;
- **#279:** futuro arquivo Audaces, encaixe, revisão de etapas redundantes;
- **#152 / #280:** preservar 26 operações WAL locais até prova por opId e conteúdo;
- **#283:** correção de corte sem referência de produto, histórico de projeções arquivadas e duplicidade de script 3D.

**Status: núcleo físico extraído; módulo completo de Produção/Separação ainda não está modularizado ou homologado.** Próxima extração deve ser pequena e de risco controlado.

## Extração adicional v96.18 — somente escolha do alvo do Corte

- O núcleo `corte-alvo-v9618.js` identifica o **pedido em andamento na Separação** e o **ID de produto único** da grade/projeção. Ele não lista, cria, edita, envia nem grava Cortes.
- O controlador `release-separation-cut-target-v9335.js` mantém o código original de seleção como fallback se o módulo novo estiver ausente ou lançar erro. As três inserções são revertíveis por remoção simples e o SHA original é testado.
- A regra atual de `targeted()`, a gravação remota `confirmCut()`, o salvamento local, o ACK, a atualização do pedido e as recuperações por WAL permanecem **inalterados**. Este trabalho não tenta corrigir automaticamente o Corte sem `productId` da issue #283: o caso exige revisão humana.
- Carregador: **160 scripts** (158 do checkpoint #284 mais 2 núcleos puros); a ordem dos 158 originais é idêntica. Mantemos o `app9240.html` integral e a tela de login protegida.
- Testes: 18 estados de operação, 195 pares de pedido/projeção, ausência e falha do núcleo, prova SHA do controlador e inicialização do HTML comercial real em WebKit e Chromium.
- Não declarar as etapas completas; a modularização física integral de Corte e Produção continua pendente. Acertos, Corte Conjunto, pontas, Audaces e revisão posterior de telas seguem em #276, #277, #278, #279 e #280. As operações WAL de #152 permanecem intocadas.

## Checkpoint v96.24 — Corte/Cortadores continua em extrações seguras

**Os totais de 158/160 scripts nas seções anteriores são registros HISTÓRICOS**, não a quantidade de hoje. A referência vigente é `ownership-v9600.json`: 158 scripts históricos preservados mais núcleos puros aprovados; o inventário valida a ordem, unicidade, responsáveis e arquivos críticos sem depender de uma contagem fixa.

- **v96.22**: `cortadores-grade-core-v9622.js` isola IDs, grade, quantidades e finalização por modelo no planejamento. O controlador `release-cutter-planner.js` conserva o fallback, filtros e gravação original. Merge PR #291 confirmado no `main`.
- **v96.23**: `corte-pesagem-core-v9623.js` isola somente validação de peso e indicadores informativos. `release-cut-weight-v9579.js` mantém a gravação, histórico, ACK e bloqueio WAL com fallback literal. Merge PR #292 concluído; confirmar publicação GitHub Pages separadamente.
- **v96.24, PR #293**: `corte-consumo-core-v9624.js` separa cálculos puros de kg/g, peças por quilo, custo por peça e lucro estimado de aproveitamento; controlador `release-cut-material-usage.js` mantém cadastro, ficha medida, pagamento, banco e salvamento atuais. Carregamento extra de um script opcional imediatamente antes do controlador. Não representa geometria de encaixe nem integração Audaces.

**Limites operacionais:** nenhuma dessas extrações encerra a modularização do setor. A baixa de estoque, o corte planejado/finalizado, os registros reais de materiais, a folha A4 e a WAL continuam com os responsáveis legados. Para considerar uma área concluída exigir prova de gravação, ACK remoto, releitura em outra máquina e WebKit/Chromium. Não fazer merge de mutações do monólito em lote.

**Pendências rastreadas sem exclusão:** #276 (Acertos), #277 (Corte Conjunto), #278 (pontas/sobras), #279 (Audaces), #283 (produto ausente, projeções arquivadas, injetor 3D) e #152 (reconciliação WAL).
