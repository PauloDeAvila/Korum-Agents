# Korum Agents Mini

Korum é um escritório **local e compacto**, com monitoramento do Codex, detecção do OpenCode e delegação segura de tarefas. Também dispõe de um gateway MCP para clientes de IA compatíveis, incluindo agentes especializados que desejem solicitar análises a um OpenCode local.

A base visual foi derivada do [Habblaud](https://github.com/marmottajr/habblaud). Consulte [LICENSE](LICENSE) e mantenha os créditos da licença MIT. O repositório continua tecnicamente um fork até a operação manual de desvinculação.

## Acesso sem login

O **escritório local** não solicita cadastro, e-mail ou senha. O Habblaud World (cidade online de terceiros) fica **desligado por padrão** neste Korum; os recursos de conta e login do serviço externo não são usados nem contornados. A interface original de escritório fica em /legacy.html, sem a seção World online.

A autenticação remota continua protegida, quando ativada explicitamente. O gateway /api/korum/* só atende ao loopback do próprio computador e respeita a proteção de Origin/Host da API.

## Iniciar no Windows

Pré-requisitos: Node.js 22.12+, Git e Codex configurado. OpenCode é opcional.

No PowerShell, dentro da pasta Korum:

    npm ci
    $env:KORUM_WORKSPACE = (Resolve-Path "C:\CAMINHO\DO\MEU-PROJETO").Path
    npm run build
    npm start

Abra http://127.0.0.1:4747/ e escolha **Delegações**. O painel exibirá se o OpenCode foi detectado.

Em outro PowerShell:

    cd "C:\CAMINHO\DO\MEU-PROJETO"
    opencode serve --hostname 127.0.0.1 --port 4096

O OpenCode precisa estar no **mesmo projeto** de KORUM_WORKSPACE para receber tarefas, e deve estar autenticado no próprio provedor de modelo conforme sua configuração existente. Não há login adicional do prédio Korum.

Para usar outra porta local:

    $env:KORUM_OPENCODE_URL = "http://127.0.0.1:4097"

O servidor Korum lê essa variável ao iniciar. Não aceita endpoints remotos, caminhos arbitrários ou URLs com credenciais. Se seu OpenCode serve exige autenticação HTTP Basic, configure as variáveis de ambiente KORUM_OPENCODE_USERNAME e KORUM_OPENCODE_PASSWORD no processo local Korum. Nunca salve senhas no repositório.

## O que o Korum faz

- **Codex:** monitora sessões abertas e mantém o núcleo AI-to-AI de Agent Master e especialistas em korum-runtime/.
- **OpenCode:** verifica /global/health e o diretório /path; cria sessões próprias para tarefas de análise por /session e /session/{id}/message.
- **Uma interface:** Dashboard local principal em :4747, com projetos, agentes, delegações, histórico e escritório.
- **MCP local:** stdio, com ferramentas de descoberta e delegação (instruções abaixo).
- **Persistência:** tarefas locais em dataDir/korum-gateway/tasks.json, sem upload ao GitHub.

Nesta etapa, **delegações OpenCode são somente leitura**, mesmo quando o pedido menciona edição. O gateway usa o agente plan e desabilita ferramentas de shell/edição conhecidas. Isso é defesa em profundidade, mas não substitui isolamento de sistema operacional ou revisão de plugins de terceiros. Não há execução automática de merge, push ou deploy.

## Configuração MCP

O gateway usa **MCP em stdio**, não um servidor aberto na internet.

Ferramentas disponibilizadas:

| Nome | Ação |
| --- | --- |
| korum_list_agents | Lista agentes Codex/Korum e o executor OpenCode |
| korum_list_providers | Verifica a conexão do OpenCode |
| korum_delegate_opencode | Cria tarefa OpenCode de análise sem edição |
| korum_get_task | Busca resultado/erro por taskId |
| korum_list_tasks | Lista tarefas recentes e seus estados |

Teste inicial no computador:

    cd korum-runtime
    node mcp.mjs

O processo fala JSON-RPC pelo stdin/stdout, portanto não há interface interativa nem mensagens de log em stdout. Ele deve ser iniciado por um **cliente MCP** configurado para executar Node.

Exemplo de registro no Codex (ajuste o caminho absoluto em config.toml):

    [mcp_servers.korum]
    command = "node"
    args = ["C:\\caminho\\Korum-Agents\\korum-runtime\\mcp.mjs"]

Depois de configurar o cliente MCP e iniciar o Korum local, um agente Codex poderá pedir ao OpenCode uma análise por korum_delegate_opencode e consultar o resultado por korum_get_task.

**ChatGPT e modelos mini:** MCP fornece o contrato técnico para um agente com cliente MCP chamar o Korum. Uma conversa ChatGPT comum não consegue acessar automaticamente o seu localhost. Será necessário conectar um cliente/ambiente compatível ou instalar uma integração personalizada autorizada. Não configuramos uma conexão de conta ChatGPT no GitHub, não expomos uma porta pública e não usamos a API do ChatGPT de maneira implícita.

## Testes e desenvolvimento

    npm run typecheck
    npm test
    npm run build
    cd korum-runtime
    npm run check
    npm test

Os testes de gateway são simulados (sem OpenCode autenticado); devem ser complementados por um teste de ponta a ponta no Windows. O Codex AI-to-AI atual também depende dessa validação real. PR em branch isolada, sem merge automático.

## Status de maturidade

- Implementado: monitor Codex herdado, UI Korum Mini, gateway OpenCode local, API local de tarefas, MCP stdio, histórico local e núcleo Codex AI-to-AI.
- Testado automaticamente: contratos locais, gates e roteamento simulado; o GitHub Actions registra o resultado.
- Pendente: autenticação real com modelos OpenCode no PC, integração de threads OpenCode diretamente nos personagens pixel art, controle transacional de missões, segurança de plugins de terceiros, coordenação multiagente entre Codex e OpenCode e MCP remoto seguro.

Acompanhe [KORUM.md](KORUM.md) e [roadmap](docs/KORUM-ROADMAP.md).
