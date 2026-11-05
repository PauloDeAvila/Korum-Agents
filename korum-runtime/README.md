# Korum Agents — Codex AI-to-AI

**Objetivo:** agentes Codex com sessões persistentes individuais, mensagens diretas roteadas pelo Korum, Agent Master delegando e revisando, loops de feedback até conclusão verificável.

Esta branch substitui o orquestrador experimental anterior por um núcleo exclusivamente Codex. A interface do escritório herdado mantém seu leitor de sessões Codex; a nova rede de conversas tem monitor próprio nesta etapa.

## Componentes

- Agent Master (Atlas): abre missão, define critérios, delega, revisa e devolve tarefas.
- Tyson: engenharia; único agente autorizável para edição.
- Iris: arquitetura e apoio técnico.
- Nora: QA e revisão independente.
- Vera: segurança e governança.
- Igor: infraestrutura, CI e confiabilidade.
- Davi: manutenção e diagnóstico.
- Bia: suporte e documentação.

Cada agente é uma thread Codex independente, criada ou retomada pelo SDK oficial. As mensagens entre pares são realmente entregues à thread do destinatário pelo Korum, e a resposta volta ao solicitante com um identificador de correlação.

O fluxo suporta perguntas e respostas entre pares, devolutivas ao solicitante, entregas ao Master, pedidos de correção e redistribuição de tarefas.

## Preparar o Windows

- Node.js 22+;
- Git instalado;
- Codex CLI ou aplicativo configurado e autenticado;
- repositório local com branch Git válida.

Na pasta do Korum:

    cd korum-runtime
    npm install
    npm run check
    npm test

O motor usa a biblioteca oficial @openai/codex-sdk. A dependência está marcada como latest nesta prova experimental, sem lockfile. Para release, fixaremos a versão após uma validação end-to-end.

### Primeiro teste somente leitura

    node cli.mjs --workspace "C:\dev\meu-projeto" --goal "Investigue riscos e proponha correções, conversando entre especialistas"

O Master pode aceitar uma análise, mas o estado final será reviewed, não implementação certificada. Nenhum agente edita código nesse modo.

### Escrita opcional, somente em worktree experimental

    node cli.mjs --workspace "C:\dev\meu-projeto-lab" --write --test "npm test" --goal "Corrija um bug e valide as alterações"

Escrita exige branch diferente de main/master, worktree limpa e comando permitido. Somente Tyson recebe workspace-write; os demais permanecem read-only. O sistema não executa push, merge ou deploy intencionalmente.

**Segurança:** o sandbox do Codex não substitui isolamento de SO. Para alterações de risco use VM/container isolado ou worktree descartável, e revisão humana antes de integrar.

## Visualizar conversas AI-to-AI

O CLI imprime encaminhamentos e decisões do Master. Em outro terminal, use a pasta de estado exibida pela execução:

    node monitor.mjs --state "CAMINHO-DO-ESTADO" --port 4860

Abra http://127.0.0.1:4860.

O monitor somente leitura escuta em loopback, exibindo threads, perguntas, respostas, decisões e resultados. Ainda é separado do Command Center e do escritório pixel art.

## Memória

Estado local em ~/.korum-agents/<hash-do-workspace>:

    snapshot.json
    events.jsonl
    brains/master.md
    brains/tyson.md
    ...

- Identidade: agents.json versionado.
- Memória episódica: brains/*.md local.
- Conversas e decisões: events.jsonl local.
- Contexto da própria thread: sessões persistidas pelo Codex.
- PIE/MCP verificável: integração nativa futura.

O conteúdo das mensagens fica no computador. Não inclua credenciais em prompts: a máscara de tokens conhecidos não cobre todas as chaves.

## Limites e critérios de conclusão

- Até 24 turnos Codex por missão e 5 rodadas do Master por padrão.
- Até 3 saltos de perguntas entre agentes e 12 mensagens peer-to-peer.
- Se o Master não conseguir concluir dentro do orçamento: needs_review.
- Implementação verified exige diff Git, comando de teste verde, QA Nora e governança Vera aprovados.
- Aprovação verbal do Master não desativa os gates.
- As threads individuais podem ser retomadas pelo SDK. A fila de uma missão interrompida ainda NÃO retoma automaticamente.

## Validação e limitações

Há testes unitários/simulados para perguntas de Tyson a Iris, reincorporação de respostas, devolutiva do Master, iterações, bloqueios, qualidade, branch e limites. Eles não autenticam nem executam modelos reais. É necessária prova end-to-end com Codex no Windows.

A rede Korum cria threads próprias. Não adota automaticamente a sessão que já está aberta no Codex Desktop; o monitor herdado pode observá-la. Anexar mensagens à sessão existente exigirá integração explícita ao Codex app-server.

## Próximos incrementos

1. Conversas no Korum Command Center e personagens.
2. Fila persistente transacional com recuperação após crash.
3. Integração opcional à sessão Codex Desktop após autorização.
4. PIE/MCP com proveniência, hash e freshness.
5. Execução concorrente em worktrees, limite de custos e integração Git supervisionada.
