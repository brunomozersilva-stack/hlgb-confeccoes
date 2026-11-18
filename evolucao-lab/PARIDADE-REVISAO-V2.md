# Revisão de paridade HLGB Evolução

Base: `574eeb1543e7cfc293f2a1449c00b56bf0cb10d2` e monitor desta revisão. 76 equivalentes parciais identificados; 0 lacunas sem equivalente; zero aprovações; 43 cenários críticos por homologar. 266 itens do plano mestre continuam sujeitos a validação. Não é percentual de conclusão.

| Função | Situação estática | Observação |
|---|---|---|
| PAR-001 Gravação canônica por registro | Parcial | Persistência servidor com revisão e readback, ainda snapshot integral |
| PAR-002 Autoridade de replay WAL | Parcial | WAL remoto com ID persistente; replay manual |
| PAR-003 Convergência IndexedDB sem reenvio inseguro | Parcial | Reconsulta e cancelamento durável, sem testes concluídos |
| PAR-004 Proteção de sincronização | Parcial | Conflito e idempotência via servidor local |
| PAR-005 Carregamento seguro do login | Parcial | Login fictício local; falta identidade e perfis reais |
| PAR-006 Abertura com diagnóstico sem apagar dados | Parcial | Abertura por IndexedDB e servidor de teste; falta diagnóstico completo de boot |
| PAR-007 Visibilidade remota dos pedidos | Parcial | Consulta compartilhada no servidor local |
| PAR-008 Rastreabilidade de entrega | Parcial | Jornada do pedido e expedição; sem comunicação/entrega real |
| PAR-009 Inclusão de pedido pelo assistente | Parcial | Inclusão guiada pelo Assistente com preview, confirmação e referência única; interpretação livre pendente. |
| PAR-010 Importação assistida de pedidos | Parcial | Importação CSV com SKU e cliente exatos, prévia, lote atômico; importadores de PDF e outras fontes pendentes. |
| PAR-011 Busca de produtos na ficha técnica | Parcial | Pesquisa global e consulta de catálogo |
| PAR-012 Catálogo de produtos para consulta | Parcial | Catálogo e busca dos modelos do laboratório |
| PAR-013 Rastreabilidade por produto | Parcial | Histórico gerencial e vínculo por modelo |
| PAR-014 Eventos operacionais de produto | Parcial | Eventos e quantidades datados |
| PAR-015 Edição da grade de corte | Parcial | order.grade.update e cut.plan.update |
| PAR-016 Divisão de modelos no corte | Parcial | Divisão de folhas abertas do mesmo modelo em dois lotes conservando grade e estoque; divisão multivariantes pendente. |
| PAR-017 Uso de materiais no corte | Parcial | cut.bom.execute / estoque |
| PAR-018 Peso do corte após finalizar | Parcial | Peso útil/desperdício em folha de corte |
| PAR-019 Folha do cortador com materiais | Parcial | Folha de corte e BOM |
| PAR-020 Planejamento do cortador | Parcial | Plano de corte e PCP |
| PAR-021 Filas por etapa de corte | Parcial | Filas do PCP, não todos os estados antigos |
| PAR-022 Baixa operacional | Parcial | Baixa de corte, retorno, separação e expedição |
| PAR-023 Confirmação e integridade de baixa | Parcial | Readback e validações de quantidade |
| PAR-024 Atribuição e acompanhamento de embalagem | Parcial | Embalagem por lote retornado, acerto na conclusão e bloqueio de separação; parcial por cor/tamanho pendente. |
| PAR-025 Reconciliação com corte | Parcial | Comparação corte e produção |
| PAR-026 Confirmação de salvamento de produção | Parcial | Confirmação local/servidor |
| PAR-027 Confirmação canônica de separação | Parcial | order.separate e readback |
| PAR-028 Separação de acordo com grade cortada | Parcial | Grade de corte e separação quantitativa; falta paridade por cor/tamanho |
| PAR-029 Controle operacional de facções e transferências | Parcial | Transferência e retorno multi-facção |
| PAR-030 Proteção contra sumiço do histórico de facções | Parcial | Eventos e histórico de acertos; sem migração homologada |
| PAR-031 Atualização de material da facção | Parcial | Checklist por envio e comparação de ficha; conferência logística em gramas, sem movimentação física de estoque. |
| PAR-032 Preço por serviço e cadastro de função | Parcial | faction.rate.set / serviceType simplificado |
| PAR-033 Travetada vinculada à facção | Parcial | faction.traveta.set, desconto unitário |
| PAR-034 Busca e lista de facções no acerto | Parcial | Seletores e pesquisa global |
| PAR-035 Acerto avulso de facções | Parcial | settlement.add, tipo costura/embalagem |
| PAR-036 Edição de acerto e conferência posterior | Parcial | settlement.revise / readback |
| PAR-037 Manutenção de acertos sem apagar lançamentos | Parcial | Acerto e compensação registrados sem apagar original |
| PAR-038 Ajustes diretos de abatimento e acréscimo | Parcial | settlement.adjust |
| PAR-039 Correção rastreada de acertos | Parcial | settlement.revise e compensate |
| PAR-040 Devoluções e observações auditáveis | Parcial | Devolução parcial e motivo |
| PAR-041 Comprovantes e histórico de acerto | Parcial | Anexo e metadados de acerto |
| PAR-042 PDF e limpeza segura de comprovante | Parcial | PDF de comprovante local; armazenamento remoto privado pendente |
| PAR-043 Pontos de travetada | Parcial | Cálculo por pontos, tarifa por ponto, desconto e snapshot de serviço; homologação pendente. |
| PAR-044 Ferramentas de acerto visíveis | Parcial | Painéis de acerto, sem paridade visual |
| PAR-045 Confirmação de salvar no Hub | Parcial | finance.add/pay e readback |
| PAR-046 Histórico de valores da semana | Parcial | Relatórios por data; comparação semanal incompleta |
| PAR-047 Consulta e filtros do Hub | Parcial | Hub por período/categoria e pesquisa global |
| PAR-048 Integridade de registros do Hub | Parcial | Vínculos e reconciliação de títulos |
| PAR-049 Data de pagamento na folha pelo Hub | Parcial | Folha por competência cria títulos vinculados; baixa no Hub atualiza folha e data. |
| PAR-050 Preservar visualização da folha | Parcial | Folha individual; protótipo separado |
| PAR-051 Proteção de salvamento da folha | Parcial | payroll.update com revisão/readback |
| PAR-052 Integridade da folha | Parcial | Valores individuais e validação |
| PAR-053 Ordenação e somatórios das provisões | Parcial | Ordenação alfabética e provisões ilustrativas no mês; regras contábeis reais e demais ordenações pendentes. |
| PAR-054 Conferência por duas pessoas | Parcial | Dupla conferência de compras |
| PAR-055 Importação de nota de compra | Parcial | Importação estruturada de itens de nota por CSV, total exato e recebimento separado; XML/PDF automático pendente. |
| PAR-056 Comparador de fornecedores | Parcial | Comparador por material, quantidade, preço, frete e validade. |
| PAR-057 Saldos de fornecedores | Parcial | Contas a pagar por compra; saldo fornecedor específico não comprovado |
| PAR-058 Monitor de material | Parcial | Saldo e aviso de insumo |
| PAR-059 Ferramentas de materiais | Parcial | Planejamento de materiais, BOM e ajustes |
| PAR-060 Estabilidade da tela de relatórios | Parcial | Relatórios gerenciais; teste visual pendente |
| PAR-061 Consulta de notas e contas a receber | Parcial | Consulta de recebíveis no Hub; notas fiscais não integradas |
| PAR-062 Comprovantes PDF por nota | Parcial | PDF por nota de compra com versão; comprovantes por nota de venda e storage privado pendentes. |
| PAR-063 Auditor com diagnóstico residual | Parcial | Auditor 3.0, cobertura residual limitada |
| PAR-064 Mapa de autoridade do Auditor | Parcial | Auditor verifica trilha e vínculos; falta mapa completo de escritores |
| PAR-065 Detector de scripts duplicados | Parcial | Inventário de scripts, ordem, globals e hashes; cobertura de escritores legados pendente. |
| PAR-066 Aprendizado determinístico do assistente | Parcial | Bot 3.0 com observações e feedback |
| PAR-067 Memória técnica compartilhada | Parcial | Histórico de observações compartilhado no laboratório, sem memória empresarial |
| PAR-068 Assistente com análise contextual | Parcial | Assistente de consultas determinísticas |
| PAR-069 Painel do monitor de saúde | Parcial | Central de erros e auditoria; falta monitor completo |
| PAR-070 Monitor de verificações horárias | Parcial | Monitor horário enquanto sessão aberta, evidências exportáveis; serviço contínuo hospedado pendente. |
| PAR-071 Persistência dos produtos 3D | Parcial | print.add e persistência |
| PAR-072 Hidratação segura do catálogo 3D | Parcial | Consulta ao catálogo 3D; hidratação remota não comprovada |
| PAR-073 Proteção da navegação da área 3D | Parcial | Rota 3D do laboratório; sem teste específico concluído |
| PAR-074 Fotos de produtos 3D | Parcial | Foto de exercício JPEG/PNG com compressão e versão; armazenamento empresarial pendente. |
| PAR-075 Cadastro de facções e papéis | Parcial | Cadastro facção básico; papéis por serviço incompletos |
| PAR-076 Cadastros do catálogo | Parcial | Cadastros básicos e cores/insumos |
