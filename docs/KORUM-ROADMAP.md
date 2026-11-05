# Korum Agents — Roadmap Codex AI-to-AI

## Etapa 0: monitor e UI
- [x] Korum Command Center com projetos, sessões e atividades Codex detectadas.
- [x] Interface visual herdada preservada em /legacy.html.
- [ ] Validação end-to-end do monitor no Windows com Codex Desktop em múltiplas versões.

## Etapa 1: protocolo AI-to-AI
- [x] Threads Codex individuais, com adaptador SDK e persistência de IDs.
- [x] Mensagens peer-to-peer, replyTo e histórico de eventos local.
- [x] Master delega, avalia, devolve tarefas e pode aceitar entregas.
- [x] Limites de turnos, rodadas e profundidade de perguntas.
- [x] Testes simulados de peer messaging, feedback e bloqueios de qualidade.
- [x] Monitor local das conversas e decisões.
- [ ] Prova end-to-end SDK/Codex real no Windows e Linux.
- [ ] Benchmark de tokens, qualidade e latência com Codex real.

## Etapa 2: visualização integrada
- [ ] Integrar missões, threads e mensagens ao servidor e ao Command Center.
- [ ] Exibir trocas, revisões e encontros nos personagens pixel art.
- [ ] Controles humanos de pausa, retomada, cancelamento e aprovação.
- [ ] Vincular sessões Codex Desktop preexistentes somente com autorização explícita.

## Etapa 3: orquestração robusta
- [ ] Fila transacional com recuperação, idempotência e replay.
- [ ] Concorrência segura com lock e worktrees Git por agente.
- [ ] Revisão QA com rodadas corretivas supervisionadas.
- [ ] Limite de tokens e custos, auditoria de chamadas.
- [ ] PIE/MCP com freshness, proveniência e análise de impacto.

## Etapa 4: operação e produto
- [ ] Fluxo testes → revisão → main com CI obrigatório.
- [ ] Relatórios de manutenção e decisões versionadas.
- [ ] Testes E2E UI, acessibilidade e compatibilidade Windows.
- [ ] Desvincular a rede de fork após preservar PRs e evidências.

## Invariantes

Nenhuma implementação é certificada somente pela opinião do Master. Mensagens são rastreáveis. Loops são limitados. Falha de testes ou de governança impede conclusão.
