# Evidências automatizadas parciais — cenários críticos HLGB

Esta matriz indexa os 43 cenários anteriores sem alterar suas condições de homologação. A aprovação **humana permanece pendente nos 43**.

- 19 cenários possuem nova prova automatizada **parcial** (uma ou mais invariantes), não a aceitação integral.
- 24 cenários continuam sem prova nova nesta rodada, embora possam possuir testes anteriores.
- Para consultar o vínculo entre cenários e testes, use `paridade-critica-evidencias-v1.json`.
- A suíte CI executa `tests/criticos-jornadas-v1.cjs` e valida a rastreabilidade.
- Não são testes de login empresarial, hospedagem, SQL real em larga escala, notas fiscais ou dados da HLGB em produção.

**Bloqueios de liberação:** confirmar em banco hospedado separado, autorização por funcionário, auditoria de todos os escritores, desempenho, aprovação do usuário e reconciliação de migração com backup, sem alterar `main`.
