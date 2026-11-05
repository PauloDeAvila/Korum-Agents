# Korum Agents — Plano para independência do fork

## Situação

PauloDeAvila/Korum-Agents ainda pertence à rede de forks do repositório marmottajr/habblaud. Rebranding e alterações de interface não alteram essa associação.

Documentação oficial: https://docs.github.com/en/pull-requests/how-tos/work-with-forks/detaching-a-fork

## Leave fork network

O GitHub permite converter o fork em repositório independente pela interface Settings → General → Danger Zone → Leave fork network, se:
- o fork for público;
- o tamanho estiver abaixo de 1 GB;
- não houver forks filhos.

A ação é permanente. Preserva commits Git, mas metadados associados ao fork — incluindo PRs, issues, comentários, estrelas, watchers, wikis e forks filhos — não são preservados, segundo a documentação oficial.

## Sequência segura

1. Finalizar e registrar em documentação os PRs do Korum Runtime e Command Center antes da separação.
2. Confirmar CI verde, testes de integração, branches importantes e backup de metadados necessários.
3. O administrador revisa os avisos e confirma o Leave fork network pela interface do GitHub.
4. Conferir se o repositório passou a fork=false e deixou de ter parent.
5. Validar CI, permissões, branches, tags, conteúdo e build novamente.
6. Manter a licença MIT e os créditos dos componentes derivados.

A integração do GitHub conectada ao Korum Runtime atualmente não oferece a operação Leave fork network; a decisão final fica com o proprietário. Não usar exclusão e recriação automática como atalho.

## Repaginação

- Fase 1: novo Command Center, navegação, equipe, branding e PWA.
- Fase 2: Codex nativo no servidor e integração visual dos agentes.
- Fase 3: mensagens, reuniões, memória PIE e governança visíveis e interativas.
- Fase 4: substituição progressiva dos módulos legados, testes E2E e acessibilidade.
- Fase 5: auditoria de segurança, release e operação do repositório já independente.

O portal atual é uma primeira etapa, não a conclusão de toda a repaginação.
