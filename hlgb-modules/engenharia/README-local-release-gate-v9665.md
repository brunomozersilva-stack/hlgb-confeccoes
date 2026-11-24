# Gate local de estabilização v96.65 — HLGB Comercial

Alternativa de diagnóstico à fila de Actions, não substituição da proteção de merge. Branch isolada sobre pacote de segurança v96.64, sem alteração em runtime comercial ou banco.

## Escopo
- 39 testes Node definidos explicitamente, mais execução de paridade de rescisão com núcleo extraído = 40; 5 suites de browser em Chromium e WebKit = 10. Total 50 execuções, **não 50 casos únicos**.
- Inclui regressões de WAL, integridade de registros, restauração do app, folha, acertos, planejamento, auditor, permissões, paridade e layout.
- O executor verifica o SHA informado e arquivos rastreados limpos antes/depois; exige Node 22, Playwright 1.55.0 e Acorn 8.15.0. Não instala dependências automaticamente, não executa shell arbitrário, nem herda tokens de ambiente.
- Servidor local restrito a 127.0.0.1:4173, somente 22 arquivos de fixtures explicitamente autorizados; sem acesso a arquivos de configuração ou app real por esse servidor. O executor não é sandbox de rede para todo código Node: executar em máquina/contêiner descartável, sem credenciais e preferencialmente sem acesso externo após instalar dependências. Não utilizar checkout de produção.
- Relatório contém resultado por teste, duração, SHA e completude; falha, timeout, teste faltante, SHA divergente ou arquivos modificados nunca passam. Mesmo com aprovação local, `mergeAuthorized=false`, `remotePersistenceVerified=false`, `fullGitHubSuiteRequired=true`.

## Executar em clone novo e autorizado
```sh
git clone --branch fix/integrated-release-hardening-v9664 https://github.com/brunomozersilva-stack/hlgb-confeccoes.git hlgb-gate
cd hlgb-gate
node --version
npm install --no-save --ignore-scripts --package-lock=false playwright@1.55.0 acorn@8.15.0
npx playwright install chromium webkit
node tests/hlgb-local-release-gate-v9665.cjs
node hlgb-modules/engenharia/local-release-gate-v9665.cjs --plan
# conferir o SHA aprovado no relatório da PR; usar esse SHA abaixo
node hlgb-modules/engenharia/local-release-gate-v9665.cjs --run --expect-sha SHA_DE_40_CARACTERES > ../hlgb-gate-report.json
```

Se faltar dependência de sistema no Linux, instalar em ambiente descartável com a ferramenta oficial Playwright. Não desabilitar verificações de segurança, nem usar tokens/banco da empresa. A porta 4173 precisa estar livre; não interromper outro processo automaticamente. Relatório só existe se execução chegar à etapa de emissão; preflight que falhar sai com código não zero.

## Evidência
25 asserções do contrato de planejamento/resultado/allowlist/ambiente aprovadas em runtime controlado, confirmadas nos blobs do GitHub. Execução nativa das 50 suites ainda não realizada: checkout completo e browsers não disponíveis neste ambiente. Sem garantia de resultado verde, login real, gravação remota ou homologação. Gate não muda gatilhos do CI nem cancela runs.
