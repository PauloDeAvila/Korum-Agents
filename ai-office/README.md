# Korum Agents — módulo OpenCode (MVP 0.1)

Este diretório implementa um **orquestrador multiagente experimental** para o fork do [Habblaud](https://github.com/marmottajr/habblaud), exclusivamente com **OpenCode** como executor. O fork preserva a base upstream e a licença MIT.

> **Escopo validado:** funcionamento do motor de estado, roteamento, memória e testes com OpenCode **simulado**. **Não validado:** execução com modelos reais, integração de personagens pixel art, paralelismo e conector PIE em tempo real.

## Organização dos agentes

- **Atlas:** coordenador e reuniões de abertura/fechamento
- **Iris:** arquitetura e contratos
- **Tyson:** implementação (único agente autorizável para edição)
- **Nora:** QA e revisão independente
- **Vera:** governança e segurança
- **Igor:** infraestrutura, SRE e CI/CD
- **Davi:** manutenção e regressões
- **Bia:** suporte, diagnóstico e documentação

Perfis persistentes em `agents/*.md`, catálogo em `team.json`. Cada função utiliza uma sessão separada do OpenCode, com histórico de `sessionId` no estado. O agente pode pedir apoio por `requests`: o coordenador entrega a solicitação a outro especialista no próximo turno disponível. A colaboração é **sequencial e limitada por turnos**, não uma reunião multiagente paralela ou livre.

## Instalação e testes

Node.js 22+ (preferencialmente 24+) e Git. O motor não precisa de dependências npm extras.

```bash
cd ai-office
npm run check
npm test
opencode --version
opencode models
```

Uma missão deve usar um **repositório Git em branch não principal**, preferencialmente uma worktree de testes. Não execute em `main` ou `master`.

**Somente análise, sem escrita**:

```bash
node cli.mjs --workspace /caminho/da/worktree --objective "Analise o projeto e proponha melhorias" --model provider/model
```

**Implementação experimental** (somente em workspace de teste limpo):

```bash
node cli.mjs --workspace /caminho/da/worktree --write --test "npm test" --rounds 2 --report-every 3 --objective "Corrija um bug pequeno e crie testes"
```

Exemplo no PowerShell:

```powershell
node .\cli.mjs --workspace "C:\\dev\\meu-projeto-lab" --write --test "npm test" --objective "Implemente uma melhoria pequena"
```

O parâmetro `--model` é opcional e deve corresponder a uma saída de `opencode models`. Se a execução real falhar no seu provedor ou versão, revise o protocolo em `src/opencode-runner.mjs`.

## Comandos do diretor

`/start <objetivo>`, `/to <agente> <mensagem>`, `/meeting <tema>`, `/status`, `/report`, `/memory <agente>`, `/pause`, `/resume`, `/stop` e `/quit`.

O orquestrador pode emitir atualizações em intervalos de turnos e relatório final, **enquanto o processo estiver rodando**. Não há serviço de execução automática ou notificação periódica instalada.

## Memória persistente e contexto

Os perfis de identidade são versionados no Git. Memória de acontecimentos e decisões, ainda sem verificação semântica, é mantida em:

`~/.ai-office/<hash-da-worktree>/brains/<agente>.md`

A mesma pasta contém `events.jsonl`, `snapshot.json` e `report.md`. Evite versionar esses arquivos gerados, pois podem incluir conteúdo de repositório e respostas dos modelos.

O PIE pode ser utilizado se o MCP já estiver configurado no OpenCode, ou por snapshot local `--context-file`. O orquestrador **não confirma freshness**, hashes ou disponibilidade do PIE nesta versão.

## Visualização experimental

Em outro terminal:

```bash
node bridge.mjs --state "/caminho/.ai-office/hash" --port 4857
```

Abra `http://127.0.0.1:4857`. O bridge fornece `/api/ai-office/snapshot` e `/api/ai-office/events` somente leitura e escuta em `127.0.0.1`. Não é a interface integrada do Habblaud. Não exponha dados do bridge em rede.

## Critérios de conclusão

O verificador só retorna **aprovado** quando há, simultaneamente:
1. `--write` ativo e alterações reais detectadas no Git.
2. Comando de testes permitido com retorno 0 e sem timeout.
3. Revisão independente de QA aprovada.
4. Revisão de governança aprovada.

Essas exigências **não garantem cobertura suficiente nem sandbox de segurança**. Logs e aprovações de modelos não equivalem a CI remoto. Não são executados pushes, merges ou deploys intencionais pelo módulo.

## Evolução

1. Fonte OpenCode compatível com `AgentSource` do Habblaud e representação dos oito agentes no escritório pixel art.
2. SDK/event stream nativo do OpenCode, conversas mais fluidas, controle de fila e sessões persistentes.
3. Integração MCP do PIE com consulta de contexto, referências verificadas, hashes e freshness.
4. Trabalho paralelo em worktrees isoladas, controle de propriedade de arquivos e merging supervisionado.
5. Rotina de manutenção agendada, relatórios de saúde e notificações com consentimento do diretor.
6. Gates de integração ampliados por impacto, cobertura, segurança e CI.

**Segurança:** prompts e configurações de ferramentas não equivalem a isolamento de SO. Rode em VM/container sem credenciais para tarefas de risco. Nunca forneça chaves nos prompts.
