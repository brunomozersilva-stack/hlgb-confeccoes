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
