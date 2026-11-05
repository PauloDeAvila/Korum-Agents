# Korum Agents — decisão Codex AI-to-AI

## Objetivo

Rede de agentes Codex com contextos independentes e colaboração persistente: perguntas diretas entre agentes, entrega ao Agent Master, reavaliação e realocação até concluir com evidências.

## Componentes ativos

- korum-runtime/: AgentNetwork e SDK oficial Codex.
- client/src/korum.ts: Command Center e monitor legado de sessões Codex.
- korum-runtime/monitor.mjs: visualizador experimental de conversas.
- server/sources/codex/: observador de sessões Codex existentes.
- docs/KORUM-ROADMAP.md: plano de integração visual e PIE.

## Política

1. Agentes possuem threads separadas; mensagens com origem, destino, correlação e histórico.
2. Master avalia e pode devolver trabalho, mas não ignora testes.
3. Escrita exige branch não principal e worktree limpa. Só engenharia recebe permissão de editar.
4. Nenhum agente obtém permissão automática de push, merge, deploy ou de acessar segredos.
5. Testes determinísticos precedem testes com modelos reais.
6. Conclusão de implementação depende de diff Git + testes + QA + governança.
7. Recuperação de fila, controle de custos e contexto PIE ainda são etapas futuras.
