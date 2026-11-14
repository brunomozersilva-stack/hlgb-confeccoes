# HLGB — Inventário técnico preliminar (Etapa 1)

**Referência imutável de consulta:** `main@2440621468d8c4d8260effe32ea47eef478077c4`  
**Data de análise:** 14/11/2026  
**Estado:** mapeamento inicial, sem homologação funcional, sem consulta ao banco e sem alteração no aplicativo atual.

## Repositório observado

- 1.275 entradas na árvore do commit analisado (arquivos e diretórios).
- 225 arquivos JavaScript com prefixo `release-`; **o número não significa 225 módulos independentes**.
- 387 entradas em `tests/` e 242 entradas em `.github/workflows/` (essas contagens podem incluir pastas).
- Entrada atual: `app-stable3.html` carrega `app9240.html` com tratamento de falhas e injeta scripts de proteção. Qualquer futura integração deve preservar o funcionamento no Safari.
- O projeto já contém várias camadas de salvamento, WAL, renderização e Auditor. Elas precisam ser mapeadas por **responsabilidade**, não apenas por nome do arquivo.

## Inventário das 19 áreas

| Área | Evidência no código | Risco de mudança | Próxima verificação |
|---|---|---|---|
| 1. Núcleo de dados | `release-wal-single-authority-v9339.js`, `release-wal-idb-convergence-v9536.js` | Crítico | Mapa de escritores, snapshot e replay |
| 2. Autenticação | `release-login-confirm-gate-v9407.js` | Crítico | Ordem de carga, sessão e papéis |
| 3. Pedidos | `release-orders-cloud-visibility-v9537.js` | Alto | Consulta de pedidos e origem dos dados |
| 4. Produtos e ficha | `release-products-search-v9452.js`, `release-product-catalog-v9419.js` | Médio | Pesquisa global vs. somente linhas exibidas |
| 5. Corte | `release-cut-model-grade-adjust.js` | Alto | Grade, versões e origem do corte |
| 6. Produção e PCP | `release-production-operations-v9385-core.js` | Alto | Baixas parciais e conciliação |
| 7. Separação | `release-separation-commit-v9319.js` | Alto | Baixa e compatibilidade com grade real |
| 8. Facções e rotas | `release-faction-operations-v9520.js` | Crítico | Identidade de lote, transferência e custos |
| 9. Acertos avulsos | `release-faction-manual-payment-v9566.js` | Crítico | Atomicidade de grupo, abatimentos e PDFs |
| 10. Hub financeiro | `release-hub-save-proof-v9567.js` | Crítico | Escrita, ACK, reconciliação e idempotência |
| 11. Folha e provisões | `release-payroll-reliable-save-guard-v9344.js` | Crítico | Valores por funcionário e competência |
| 12. Compras | `release-purchase-checkers.js` | Alto | Conferência e saldos de fornecedores |
| 13. Estoque | `release-material-health-v9260.js` | Alto | Reservas, lote e perdas |
| 14. Relatórios | `release-reports-stability-v9438.js` | Médio | Fonte dos totais e navegação de filtros |
| 15. Auditor | `release-auditor-autocorrect-v9448.js` | Alto | Fontes de evidência e responsáveis |
| 16. Bot | `release-auditor-learning-assistant-v9556.js` | Alto | Aprendizado determinístico vs. IA real |
| 17. Central de erros | `release-health-monitor-panel-v9541.js` | Alto | Correlação de incidentes e estados |
| 18. Impressora 3D | `release-printer3d-cloud-hydration-v9517.js` | Médio | Isolamento de catálogo e sincronização |
| 19. Cadastros gerais | Código-base de `app9240.html` | Médio | Clientes, fornecedores e permissões |

## Achados verificáveis no código revisado

1. **Produtos:** `release-products-search-v9452.js` filtra os elementos `tr` já renderizados. Isso não comprova busca em todos os registros do banco. A Pesquisa 2.0 deve consultar o catálogo completo.
2. **Acertos:** `release-faction-manual-payment-v9566.js` opera com registros de linha e confirma gravações. A atomicidade do grupo não está garantida por esse mecanismo isoladamente; uma transação única no servidor será estudada antes da migração.
3. **Relatórios:** `release-reports-stability-v9438.js` protege foco, filtros e rolagem. A modernização também precisa abordar fonte dos dados, filtros globais, rastreabilidade e exportações.
4. **Auditor e Bot:** existem vários arquivos versionados. O assistente `release-auditor-learning-assistant-v9556.js` declara que seu aprendizado é determinístico e **não é IA generativa**.
5. **Sincronização:** o núcleo usa WAL, readback e proteções desenvolvidas ao longo do projeto; é necessário definir uma única autoridade por operação antes de reorganizar os módulos.
6. **Mobile:** a experiência deve ser testada em cada módulo, não tratada como uma tarefa isolada a ser feita no final.

## Dependências propostas que exigem confirmação técnica

- **Produto/Ficha →** Pedidos, Corte, Produção, Facções, Estoque, Compras e relatórios.
- **Pedido →** Corte, Separação, Estoque, Projeção e Financeiro.
- **Corte →** Produção, Consumo de materiais e Separação.
- **Facção →** Envios, Materiais, Acertos e Hub Financeiro.
- **Acerto →** Comprovantes, compensações, Hub Financeiro e relatórios.
- **Núcleo de sincronização →** todos os módulos com escrita, com isolamento e autoridade.
- **Auditor/Central/Bot →** observação de todos os módulos, sem permissão irrestrita de alteração.

Essas dependências são **hipóteses de contrato para investigação**, não um mapa já comprovado em runtime.

## Estratégia para o próximo levantamento

1. Identificar funções de escrita, leitura e renderização por módulo.
2. Registrar tabelas e entidades de dados sem consultar, copiar nem alterar registros reais.
3. Construir grafo de dependências, identificando ciclos, duplicidades e wrappers concorrentes.
4. Definir contratos de dados e critérios de desativação de cada módulo.
5. Definir testes desktop e mobile, incluindo Safari, Chrome e dois usuários simultâneos.
6. Desenvolver apenas em branch e ambiente isolados; apresentação para aprovação antes de qualquer integração.

## Regra de atualização do plano

Depois de **cada melhoria** devemos comunicar: o que foi implementado, onde está, quais testes passaram, o que não foi testado, risco residual e **resumo atualizado dos 13 grupos de trabalho / 266 itens**. Nenhum item será marcado como concluído sem homologação.
