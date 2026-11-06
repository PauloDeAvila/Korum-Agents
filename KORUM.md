# Korum Agents — arquitetura local multi-executor

## Visão

Uma interface Korum Mini local sem conta de World online. **Codex** permanece como monitor de sessões e rede AI-to-AI com Agent Master. **OpenCode** é executor opcional para tarefas delegadas de análise. Um servidor MCP stdio permite que agentes compatíveis solicitem e consultem tarefas.

## Fluxos

- Pessoa → painel Korum :4747 → API local /api/korum/tasks → OpenCode serve :4096 (somente leitura).
- Agente MCP → korum-runtime/mcp.mjs → mesma API Korum → mesma fila OpenCode.
- Agent Master Codex → especialistas via korum-runtime/cli.mjs, com memória, testes e gates; pode usar ferramentas MCP quando o cliente Codex tiver a integração configurada.
- Monitor Codex → servidor existente → dashboard e escritório pixel art local.
- World externo: HABBLAUD_WORLD=0 por padrão. Não conecta nem contorna contas externas.

## Fronteiras de segurança

1. API Korum para delegação só em 127.0.0.1, com validação Host/Origin.
2. OpenCode só acessado em URL de loopback, projeto restrito a KORUM_WORKSPACE.
3. No gateway atual, tarefas OpenCode são somente leitura. Não há opção de escrever via MCP.
4. Resultado de agente é informação, não decisão humana nem evidência de testes externos.
5. Missões interrompidas falham fechadas; não reaplicam ações automaticamente.
6. Não publicar MCP na internet sem autenticação, autorização, transporte seguro e auditoria.
7. Acesso remoto original não perde sua autenticação quando ativado.

## Evolução pendente

Integrar eventos OpenCode e MCP à UI pixel art, permitir conversa AI-to-AI bidirecional entre Codex e OpenCode com controle de orçamento, autorização humana explícita para edição, PIE/MCP e testes reais no Windows.
