# Korum-Agents — Roadmap de engenharia

Este roadmap é versionado no fork porque a ferramenta GitHub Issues está desabilitada neste repositório. Nenhuma etapa é considerada concluída somente pelo relato de um agente.

## Estado de referência (MVP PR #1)

- [x] Fork Habblaud na conta do proprietário, branch isolada de desenvolvimento.
- [x] Perfis de oito agentes, reuniões, envio de pedidos entre pares e limite de turnos.
- [x] Sessões individuais OpenCode CLI e memória episódica Markdown local.
- [x] Revisor de QA + governança + gate de testes + evidência de alterações no Git.
- [x] Testes simulados locais (15/15) e workflow de CI publicado.
- [ ] Comprovar CI remoto verde e compatibilidade com o Habblaud.
- [ ] Testar um ciclo real contra OpenCode autenticado.
- [ ] Conectar os agentes ao escritório pixel art.

## Fase 2 — OpenCode no escritório visual

**Arquitetura:** criar fonte no contrato `server/sources/source.ts` sem alterar o comportamento das fontes de Claude/Codex. Evoluir `shared/types.ts` apenas aditivamente; mapear identidade, estado, tarefa, mensagens e relação entre agentes.

**Aceite:** teste de início, atividade, solicitação, bloqueio, conclusão, histórico e saída na UI; compatibilidade upstream; typecheck, testes e build.

## Fase 3 — Mensageria colaborativa e reuniões

Migrar gradualmente do `opencode run --format json` para SDK/event stream OpenCode. Criar barramento de mensagens tipado e persistente, filas com prioridades, bounded concurrency, TTL, limites de tokens/custos e reentrada após interrupção. Reuniões passam a produzir pauta, participantes, decisões com owner e ações verificáveis.

**Aceite:** testes de cancelamento, recuperação, idempotência e ausência de loops de comunicação; execução paralela somente em worktrees/arquivos independentes com locking.

## Fase 4 — PIE e memória contextual verificável

Separar **identidade** (`agents/*.md`), **memória episódica** (execuções e mensagens), **decisões aprovadas** (ADRs) e **evidência de código** via PIE. Implementar adaptador MCP PIE para busca/leitura/grafo/impacto, com referências, hashes, commits e freshness. Episódios de IA nunca viram evidência sem verificação.

**Aceite:** benchmarks em repositórios reais, indexação incremental, tratamento de índices stale/corrompidos, injeção de prompt, deduplicação e custos de contexto.

## Fase 5 — Governança, manutenção e operação

Estabelecer fluxo **testes → revisão → main**, checks obrigatórios, auditoria independente, matriz unitária/integração/regressão/E2E/segurança, relatórios de impacto, rollback e aprovações explícitas. Agendar verificações de saúde/manutenção somente com consentimento e limites de execução.

**Aceite:** nenhuma conclusão sem evidência e CI; ações de risco exigem aprovação humana; notificações recorrentes somente quando configuradas.

## Políticas gerais

1. Não atualizar `main` antes da revisão e de CI verde.
2. Não emitir dados externos sem política e autorização.
3. Não armazenar segredos em memória Markdown nem nos logs versionados.
4. Garantir que o coordenador distribua e registre a decisão, não execute mudanças de alto risco por conta própria.
5. Reportar **implementado**, **simulado**, **não validado** e **bloqueado** separadamente.
