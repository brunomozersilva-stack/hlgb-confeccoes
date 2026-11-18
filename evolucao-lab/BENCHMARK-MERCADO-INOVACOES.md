# HLGB Evolução · Referências de mercado e oportunidades de diferenciação
Data da pesquisa: 18/11/2026. **Somente planejamento do laboratório fictício**; não publicar o sistema ou utilizar dados reais.

## Referências consultadas (fontes dos fornecedores; recursos comerciais, não prova de desempenho)
- Audaces Encaixe: encaixe automático com previsão de consumo, rendimento e sobras. https://audaces.com/pt-br/solucoes/encaixe
- Gerber AccuPlan: ordens, quantidades por tamanho, planejamento do enfesto e aproveitamento dos marcadores. https://help.gerbertechnology.com/AccuPlan/Lesson_2.htm
- WFX Smart Factory: acompanhamento de produtividade, qualidade, planejamento de rolos/enfesto/corte. https://www.worldfashionexchange.com/fashion-mes-software
- WFX Quality: inspeção, rejeições e gestão de defeitos. https://www.worldfashionexchange.com/apparel-erp-software/quality-control
- TOTVS Moda: PCP, sequenciamento/capacidade e operações com facções/prestadores. https://produtos.totvs.com/ficha-tecnica/tudo-sobre-o-totvs-moda/

**Cuidado:** a ausência de uma função nas páginas públicas não prova que um concorrente não a oferece. Não há base para afirmar que o HLGB já supera todos eles. O objetivo é integrar os melhores fluxos, com indicadores mensuráveis e provas de confiabilidade.

## Regras não negociáveis (prioridade 0)
1. Paridade funcional **completa** com a versão comercial, sem migração automática até homologação/assinatura do responsável. Nenhuma função é descartada silenciosamente.
2. Gravações com ID único e prova de confirmação, WAL, reconciliação, trilha imutável e zero repetição automática em caso incerto; testes de duas sessões e conflito.
3. Perfis empresariais reais, MFA, RLS, sessões revogáveis, autorização por módulo e segregação financeira. Os PINs atuais são apenas fictícios.
4. Backup recuperável, simulação de restauração, checksum, inventário de dados e plano de reversão antes de importar dados reais.
5. 43 jornadas críticas com comprovação em Chrome, WebKit/Safari e celular; registrar falhas e sem declarar 100% até os testes de ponta a ponta.
6. Métricas de qualidade do sistema: indisponibilidade, falhas de gravação, atraso entre computadores, pedidos órfãos, alterações não conciliadas.

## Prioridade 1 · Recursos para a sala de corte
- **Já implementado em laboratório:** folha de corte por grade P/M/G/GG, dois cortadores, enfestador, teórico em gramas, peso útil e lixo, duas conferências, cancelamento sem baixa, baixa de material em uma transação e reaproveitamento da mesma regra para disponibilidade por tamanho. Somente dados fictícios.
- **Proposta:** rastrear materiais por *tipo, cor, lote, rolo e largura*; vincular cada folha ao lote consumido e permitir medir retração, diferenças de tonalidade e perdas por motivo. Isso requer novos cadastros e validação de compatibilidade com materiais reais.
- **Proposta:** comparar meta e efetivo, desperdício por modelo/operador/material/facção, gráficos por período, alertas de anomalia e histórico de melhorias de aproveitamento.
- **Proposta futura dependente de moldes/arquivos:** integração com CAD/encaixe geométrico (DXF/AAMA/ASTM ou formato compatível conforme fornecedor), enfesto e cálculo de aproveitamento em área. **Não confundir** o indicador atual de peso útil/(útil+lixo) com encaixe de moldes.

## Prioridade 1 · Facções, qualidade e rastreabilidade
- Roteiro e SLA por facção, produto, cor, tamanho e lote; previsões de entrega, gargalos e retorno parcial.
- QR Code por lote/volume/etapa; leitura rápida por celular, identificação exata de origem e destino e histórico impossível de ser sobrescrito.
- Qualidade por etapa: amostragem, defeitos com fotos, motivo de retrabalho, devolução por falha, taxa de primeira aprovação e custo de não qualidade.
- Reconciliar quantidade *cortada → entregue → retornada → separada → expedida*, com alertas para divergências e responsáveis pelo acerto.

## Prioridade 2 · Diferenciais a validar com usuários
- **Assistente de decisão explicável:** recomenda prioridade de corte e distribuição por facção com base em estoque, prazo e capacidade; mostra motivo e efeito; **nunca executa movimentação financeira ou baixa irreversível sem confirmação humana**.
- **Central de confiança operacional:** cada número de dashboard abre até sua evidência original (pedido, evento, lote, revisão, sessão) e mostra se está confirmado ou pendente de reconciliação.
- **Simulador de capacidade:** impacto de faltas de pessoal, fila de corte, serviços externos e prazo de cliente antes de aceitar pedidos.
- **Custo de ponta a ponta:** margem por modelo, cor/tamanho, facção, perda de material, retrabalho e canal de venda; permissão de leitura apenas ao financeiro.
- **Foco em usabilidade:** pesquisa global realmente unificada, entrada rápida no celular, modo offline seguro com sincronização explícita, painéis por função e relatórios sem navegar entre dezenas de telas.

## Critério de sucesso
Não medir "melhor do mercado" pela quantidade de botões. Medir por dados íntegros, menos erros, desperdício verificável, lucro confiável, tempo de operação e satisfação de quem usa diariamente.

**Decisão pendente:** antes de desenhar CAD/encaixe real, confirmar formato de molde, como pesagem e rolos são controlados hoje e a necessidade de integração. Nunca assumir que cálculo por gramas equivale ao consumo real de tecido ou ao rendimento do encaixe.
