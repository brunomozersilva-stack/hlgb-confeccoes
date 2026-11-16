# HLGB Evolução — critérios permanentes de superioridade e preservação

## Objetivo

A Evolução **não é uma cópia visual do HLGB**. É a melhoria mensurável do programa atual, preservando integralmente as funções já utilizadas e entregando ganhos reais em velocidade, confiabilidade, Auditor, Bot, Assistente, relatórios, histórico, acessibilidade, celular e facilidade de manutenção.

A meta de **zerar bugs** é um objetivo operacional de qualidade, não uma promessa de que qualquer software terá zero defeitos para sempre. Critério verificável antes de disponibilizar: **zero defeitos críticos e altos conhecidos sem tratamento, nenhuma regressão aceita e todos os portões de homologação aprovados**. Os defeitos restantes devem ter gravidade, reprodução, dono, evidência, estado e plano de correção.

## Regras inegociáveis de entrega

1. **Preservar a função antiga.** Cada melhoria deve apontar a origem no inventário das 76 funções/19 módulos, manter os comportamentos e critérios existentes e demonstrar o ganho obtido. As 43 verificações de paridade crítica e os 266 itens do plano são **base de rastreamento, não aprovações automáticas**.
2. **Nenhuma perda de dados.** Não apagar lançamentos, baixas, pagamentos, comprovantes, documentos locais, WAL, dados do Supabase ou registros históricos para esconder uma divergência. Correções financeiras seguem eventos reversíveis e documentos vinculados, não reescrita do passado.
3. **Um único responsável por cada gravação.** Módulos podem ter interface e relatórios isolados, mas não criar múltiplas camadas concorrentes de salvamento. Confirmar por RPC/revisão e releitura remota antes de mostrar êxito no futuro sistema real.
4. **Modularizar com contratos.** Cada módulo tem ID, versão, API explícita, dependências e testes próprios. Se falhar, deve haver diagnóstico, recurso de desativação reversível e preservação dos fluxos críticos; a correção de um não pode derrubar outro.
5. **Auditor baseado em provas.** Cada alerta identifica regra, gravidade, registro, fato detectado, provável fonte e teste reproduzível. Diferenciar *não testado*, *sem alerta nas regras verificadas*, *falhou* e *corrigido com releitura*. Não confundir check de CI com prova em duas sessões reais.
6. **Bot e Assistente melhores, mas seguros.** Usar histórico de ocorrências e regressões para orientar a investigação, explicar recomendações, reunir casos reincidentes e criar testes novos. Não alegar aprendizado de IA quando só há regras; nunca executar autocorreções financeiras sozinho.
7. **Relatórios e histórico completos.** Busca por período e entidade; filtros combinados; exportação íntegra; trilha por registro com origem, autor, alteração, antes/depois, revisões, IDs e conciliação. Não descartar dados antigos para reduzir tamanho da interface.
8. **Modernização com eficiência.** Medir tempo de abertura, latência de salvamento confirmado, erro por fluxo, performance mobile, quantidade de operações para uma tarefa e regressões por módulo. Sempre comparar versão antiga e nova no mesmo cenário e perfil.
9. **Aprovação em etapas.** Laboratório com dados sintéticos → testes unitários/integração/Chromium/WebKit → homologação autenticada com base de testes e dois dispositivos → comparação de paridade → aprovação explícita da proprietária → publicação planejada. **Sem merge ou publicação na main sem autorização.**
10. **Atualização por melhoria.** Informar: ganho, mudanças, testes aprovados/falhos, dados protegidos, funções preservadas, impedimentos e lista atualizada do que falta.

## Estrutura modular iniciada

- `modulos/registro-v1.js`: contrato mínimo, estado ligado/desligado na memória da aba, isolamento de erros e retorno seguro para a função anterior.
- `modulos/observabilidade-v2.js`: lê exclusivamente dados fictícios e fornece diagnósticos, histórico detalhado por operação, indicadores de recorrência e recomendações por evidência. Pode ser desativado sem interromper os outros 19 módulos.
- `operacao-integrada-core.js`: núcleo de transações fictícias pré-existente **preservado**. O observador não ganha autoridade de escrita.
- `operacao-integrada-ui.js`: chama os módulos opcionais; se indisponíveis, mantém o Auditor, Bot e Relatórios originais.
- `tests/observabilidade-v2-contract.cjs`: portão de integridade, imutabilidade dos dados, detecção de divergências e fallback.
- A extração dos demais módulos ainda **não está concluída**. Não alegar que o programa já se tornou inteiramente modular.

## Evidências exigidas antes da migração

- Matriz antiga × nova por função e cenário, com ganhos e testes práticos.
- Inventário de campos, tabelas, eventos, módulos e dependências (nenhuma perda).
- Telemetria e confiabilidade de gravações em homologação (incluindo IndexedDB/WAL e Safari ↔ Chrome).
- Teste regressivo de saldos/compensações, histórico de alterações, anexos, filtros e relatórios.
- Performance comparativa em celular e computador, com números medidos, não estimativas.
- Procedimento de rollback com backup verificado, sem interrupção de disponibilidade.

Este documento define o **norte do projeto**. A demonstração no navegador só prova funcionalidades fictícias e não substitui a garantia de preservação de dados e funções na empresa.
