# Korum Agents

**Agentes Codex que conversam, trabalham e recebem feedback do Agent Master.**

O Korum evolui a partir de uma base visual do [Habblaud](https://github.com/marmottajr/habblaud) para uma camada própria de orquestração Codex-only, marca e interface independente. O fork ainda pertence à rede do upstream; componentes derivados mantêm licença MIT e créditos pertinentes.

## Componentes

- **Codex Agent Network:** pasta korum-runtime/ — Master, especialistas, troca AI-to-AI, threads persistentes e ciclos de revisão.
- **Korum Command Center:** novo dashboard com projetos, sessões e atividades detectadas pelo backend legado.
- **Conversas AI-to-AI:** visualizador local em http://127.0.0.1:4860, quando o monitor é iniciado.
- **Escritório pixel art:** disponível em /legacy.html durante a migração.

## Executar um experimento

Valide o Codex autenticado em seu computador e utilize Node.js 22+, Git e npm:

    cd korum-runtime
    npm install
    npm run check
    npm test
    node cli.mjs --workspace "C:\dev\meu-projeto" --goal "Avalie o projeto e peça ajuda aos especialistas"

O padrão é somente leitura. Para implementar: --write --test "npm test" somente em worktree limpa e de feature. Consulte [documentação do runtime](korum-runtime/README.md).

## Estado

- Implementado: protocolo P2P, delegação e revisão, memória episódica, adaptador Codex SDK, gates locais e monitor.
- Testado: fluxo determinístico com driver Codex simulado e Git, via testes automatizados.
- Pendente: integração end-to-end com Codex real no Windows, vínculo ao Codex Desktop já aberto, visualização nativa na UI principal, retomada da fila após crash, PIE/MCP e concorrência com isolamento.

O monitor legado pode observar uma sessão Codex existente, mas a rede Korum cria threads próprias. Não assume automaticamente o controle da sua conversa atual.

## Atribuição

A base original do Habblaud continua sob licença MIT. Consulte [LICENSE](LICENSE) e preserve os avisos de direitos autorais. Para desvincular o fork formalmente, consulte [docs/KORUM-INDEPENDENCE.md](docs/KORUM-INDEPENDENCE.md).
