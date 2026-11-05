# Korum-Agents — evolução do fork do Habblaud

Fork independente de `marmottajr/habblaud` para experimentar um **escritório de agentes colaborativos operado por OpenCode**.

### Primeiro incremento

Consulte [ai-office/README.md](ai-office/README.md).

O módulo `ai-office/` adiciona:
- oito identidades e papéis especializados;
- coordenador, reuniões e pedidos de ajuda entre agentes;
- sessões separadas de OpenCode, memória episódica por agente;
- logs JSONL e relatórios de andamento;
- gate de testes, QA e governança;
- painel web experimental no localhost;
- testes automatizados e workflow de CI.

Esta branch **não altera o Habblaud original**, nem a integração pixel art existente. O motor colaborativo é um módulo independente até que se conclua sua adaptação ao protocolo `AgentSource`.

### Fluxo de entrega

Desenvolvimento em branches de feature; testes automáticos; PR para revisão; integração à `main` somente após verificação humana dos critérios de aceitação. Nenhuma alteração automática no upstream.

A licença MIT e os direitos autorais originais permanecem preservados.
