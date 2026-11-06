# Korum Agents — Roadmap Mini / Codex / OpenCode / MCP

## Pronto como base
- [x] Korum Mini com painel e escritório local sem login online por padrão.
- [x] Habblaud World online desligado por padrão, sem contornar login do serviço externo.
- [x] Codex: monitor de sessões e Agent Master com colaboração entre agentes (testes simulados).
- [x] OpenCode: health local, checagem de workspace, fila de análises e persistência de resultados.
- [x] API local com proteção loopback/Origin e sem escrita para tarefas OpenCode.
- [x] Ferramentas MCP stdio para descobrir provedores, delegar análises e consultar tarefas.
- [x] Uma aba Delegações no Command Center principal, sem visualizador extra obrigatório.
- [ ] CI geral validado, incluindo gateway, MCP e testes herdados.

## Próximas verificações
- [ ] E2E com OpenCode real no Windows, autenticado e apontando ao workspace correto.
- [ ] E2E com Codex SDK/Agent Master reais, inclusive uso do MCP no Codex.
- [ ] Protocolo de estados e mensagens de agentes OpenCode no escritório pixel art.
- [ ] Cliente MCP para ChatGPT com autorização explícita e compatibilidade verificada; sem localhost remoto automático.
- [ ] Filas transacionais duráveis, idempotência, controle de custos e cancelamento.
- [ ] Sandbox OS com permissões verificáveis (plan mode e bloqueio de ferramentas isoladamente não bastam).
- [ ] Integração PIE com proveniência, hash, freshness e impacto de código.
- [ ] Integração humana para merges e deploys, somente com autorização e CI verde.

## Política
Sem exposição pública do gateway, sem credenciais em Git, sem tratar opiniões de agentes como teste, sem mudança automática na main. Manter os créditos MIT do upstream.
