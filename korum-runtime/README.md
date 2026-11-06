# Korum Runtime — Codex AI-to-AI + Gateway MCP

O runtime possui dois fluxos complementares:

1. **Codex AgentNetwork:** Agent Master (Atlas) conversa com especialistas, solicita feedback e verifica testes.
2. **OpenCode via gateway:** agentes externos e agentes Codex com suporte MCP podem solicitar análises ao OpenCode local, usando as mesmas tarefas que aparecem no Korum Mini em :4747.

## Fluxo Codex AI-to-AI

Os agentes Codex usam sessões próprias via @openai/codex-sdk. Em modo leitura:

    node cli.mjs --workspace "C:\dev\meu-projeto" --goal "Avalie a arquitetura"

Escrita requer worktree limpa e não principal, opção --write e testes explícitos:

    node cli.mjs --workspace "C:\dev\worktree-experimental" --write --test "npm test" --goal "Corrija um bug"

O Agent Master pode devolver tarefas para correção, e Nora/Vera revisam as evidências; aprovação do Master não dispensa testes.

## OpenCode / MCP

A interface principal da delegação está integrada ao servidor Korum: http://127.0.0.1:4747/.

Instale o projeto com npm ci na raiz. Configure no PowerShell:

    $env:KORUM_WORKSPACE = "C:\dev\meu-projeto"
    npm start

Abra outra janela no diretório do MESMO projeto:

    opencode serve --hostname 127.0.0.1 --port 4096

As tarefas são enfileiradas no próprio servidor Korum e executadas sequencialmente em **plan (somente leitura)**. Se o servidor OpenCode estiver em outro projeto, o Korum falhará sem executar a análise. Tasks interrompidas por reinício não são repetidas automaticamente.

MCP stdio:

    node mcp.mjs

Use um cliente MCP configurado com Node e o caminho absoluto deste arquivo. O cliente precisa executar no seu computador ou ter acesso autorizado a ele; um ChatGPT hospedado remotamente não acessa o seu localhost por padrão.

O processo MCP expõe ferramentas para listar agentes/provedores, delegar tarefa de leitura e consultar status. Ele não aceita diretório arbitrário e não fornece shell, edição ou deploy.

## Logs e memória

- Missões Codex: ~/.korum-agents/<hash-do-projeto>/
- Fila OpenCode: diretório de dados do aplicativo Korum, subpasta korum-gateway/tasks.json

Não versione tokens, memórias de agentes ou logs de projetos privados.

## Segurança

- Somente interface local e gateway protegido por loopback e Origin/Host;
- World externo desligado por padrão, acesso remoto existente preservado;
- Gateway OpenCode reconhece apenas URL HTTP de loopback e workspace configurado previamente;
- MCP delegado: apenas análise sem edição (não há ferramenta de escrita);
- OpenCode não tem sandbox garantido pelo Korum; execute em ambiente de testes para repositórios sensíveis;
- Identidades e modelos ChatGPT mini não são automaticamente conectados: MCP é a porta de integração a um cliente compatível.

Leia também [README principal](../README.md).
