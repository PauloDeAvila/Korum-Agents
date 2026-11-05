# Korum Agents

**Centro de operações para equipes colaborativas de agentes de IA.**

Korum Agents nasceu de um fork do [Habblaud](https://github.com/marmottajr/habblaud) e está sendo transformado em um produto independente, com marca, interface e motor de colaboração próprios. A base reutilizada continua sujeita à licença MIT e às atribuições originais.

## Entrega atual

- **Korum Command Center:** nova interface na rota principal, com métricas, projetos, equipes, atividades e governança. Dados vêm da API de snapshot e eventos SSE já existentes.
- **Escritório visual legado:** disponível em /legacy.html, preservado enquanto ocorre a migração de funcionalidades.
- **AI Office:** módulo experimental em ai-office/ com oito agentes, coordenador, pedidos de ajuda, memória por agente, testes e gate de qualidade.
- **CI:** testes do Habblaud e do motor colaborativo, checagem de tipos e build.

O painel ainda não mostra sessões OpenCode nativamente: isso depende do adaptador de eventos planejado. Agentes desconectados não são apresentados como ativos.

## Executar

Requisitos: Node.js 22.12+ e npm.

    npm ci
    npm run dev

Abra http://localhost:4747/ para o Command Center ou http://localhost:4747/legacy.html para o escritório pixel art.

Frontend isolado para desenvolvimento: npm run dev:client (Vite, com proxy da API).

Consulte [ai-office/README.md](ai-office/README.md) para usar o motor colaborativo OpenCode.

## Estrutura

| Caminho | Papel |
| --- | --- |
| client/index.html e client/src/korum.* | Korum Command Center |
| client/legacy.html e client/src/app.ts | UI pixel art original preservada |
| server/ e shared/ | Backend e contrato de eventos herdados |
| ai-office/ | Núcleo experimental de colaboração OpenCode |
| docs/KORUM-INDEPENDENCE.md | Procedimento e riscos para desvincular o fork |
| docs/KORUM-ROADMAP.md | Etapas de integração |

## Restrições

O módulo AI Office não foi validado com modelos reais. O painel novo ainda é somente leitura e não inicia tarefas; use o escritório legado para as operações interativas existentes. Não existe execução agendada nem envio automático de relatórios.

O repositório continua formalmente vinculado à rede de forks até o procedimento manual de separação no GitHub; rebranding não equivale a detach.

## Créditos e licença

Base original: **Habblaud**, de marmottajr e colaboradores. Consulte [LICENSE](LICENSE) para os termos MIT. Os arquivos derivados continuam sujeitos à atribuição dos autores, mesmo após a desvinculação.
