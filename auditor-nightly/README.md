# HLGB Auditor diário

A rotina automática roda diariamente às 18:00 no horário de Brasília (21:00 UTC).

- A coleta privada por perfil acontece no Supabase às 17:55 e só é legível por quem possui a permissão `auditor`.
- A suíte técnica roda no GitHub Actions às 18:00.
- O resultado técnico publicado em `auditor-nightly-data` é sanitizado e não contém dados de funcionários.
- O Auditor do sistema combina os dois resultados no botão **Relatório diário** e gera um único JSON para download.

Arquivos `latest.json` e `latest.txt` são gerados pela rotina e publicados em branch própria; não são versionados neste diretório do `main`.
