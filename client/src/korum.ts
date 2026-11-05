import type { AgentInfo, AgentStatus, FeedItem, OfficeSnapshot } from '../../shared/types';
import './korum.css';

type View = 'overview' | 'teams' | 'activity' | 'governance';

type Squad = {
  id: string;
  title: string;
  description: string;
  members: readonly string[];
  color: string;
};

const SQUADS: readonly Squad[] = [
  { id: 'direcao', title: 'Diretoria técnica', description: 'Estratégia, priorização, delegação e reuniões.', members: ['Atlas'], color: 'violet' },
  { id: 'engenharia', title: 'Engenharia e arquitetura', description: 'Implementação, contratos e decisões arquiteturais.', members: ['Tyson', 'Iris'], color: 'cyan' },
  { id: 'qualidade', title: 'Qualidade e governança', description: 'Revisão independente, testes e aprovações.', members: ['Nora', 'Vera'], color: 'amber' },
  { id: 'operacoes', title: 'Operações e suporte', description: 'CI/CD, incidentes, manutenção e atendimento.', members: ['Igor', 'Davi', 'Bia'], color: 'mint' },
];

const STATUS: Record<AgentStatus, string> = {
  working: 'Em execução',
  waiting: 'Precisa de decisão',
  shell: 'Executando comando',
  idle: 'Disponível',
  done: 'Concluído',
  offline: 'Desconectado',
};

const byId = <T extends HTMLElement = HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error('Korum: elemento obrigatório ausente: ' + id);
  return el as T;
};

const agentMap = new Map<string, AgentInfo>();
const feedMap = new Map<string, FeedItem>();
let currentView: View = 'overview';
let snap: OfficeSnapshot | null = null;
let search = '';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, value?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}

function renderEmpty(parent: HTMLElement, title: string, body: string) {
  const el = element('div', 'empty-state');
  el.append(element('strong', '', title), element('p', '', body));
  parent.replaceChildren(el);
}

function statusOf(agent: AgentInfo) {
  return STATUS[agent.status] ?? 'Desconhecido';
}

function chip(label: string, style = '') {
  const span = element('span', 'chip' + (style ? ' chip--' + style : ''), label);
  return span;
}

function displayTime(at: number): string {
  if (!Number.isFinite(at)) return '—';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(at);
}

function makeAgentRow(agent: AgentInfo): HTMLElement {
  const row = element('article', 'agent-item');
  const avatar = element('span', 'agent-avatar', agent.name.slice(0, 1).toUpperCase());
  avatar.setAttribute('aria-hidden', 'true');
  const detail = element('div', 'agent-item__body');
  detail.append(element('strong', '', agent.name), element('small', '', agent.role || 'Agente'));
  const label = chip(statusOf(agent), agent.status === 'working' ? 'good' : agent.status === 'waiting' ? 'warn' : 'quiet');
  row.append(avatar, detail, label);
  return row;
}

function renderOverview() {
  const agents = snap?.agents ?? [];
  const rooms = snap?.rooms ?? [];
  const active = agents.filter(a => a.status === 'working' || a.status === 'shell').length;
  const waiting = agents.filter(a => a.status === 'waiting').length;

  byId('metric-agents').textContent = snap ? String(agents.length) : '—';
  byId('metric-active').textContent = snap ? String(active) : '—';
  byId('metric-projects').textContent = snap ? String(rooms.length) : '—';
  byId('metric-waiting').textContent = snap ? String(waiting) : '—';

  const projects = byId('projects-list');
  projects.replaceChildren();
  if (rooms.length === 0) {
    renderEmpty(projects, 'Nenhum projeto em execução', 'O escritório mostrará salas quando houver sessões detectadas.');
  } else {
    for (const room of rooms.slice(0, 8)) {
      const item = element('article', 'project-item');
      const main = element('div', 'project-item__main');
      const count = agents.filter(a => a.roomId === room.id).length;
      main.append(element('strong', '', room.name), element('small', '', room.path));
      item.append(main, chip(count + (count === 1 ? ' agente' : ' agentes'), 'quiet'));
      projects.append(item);
    }
  }

  const agentsBox = byId('live-agents');
  agentsBox.replaceChildren();
  if (!agents.length) {
    renderEmpty(agentsBox, 'Nenhuma sessão observada', 'Os oito papéis da equipe foram configurados, mas a integração de sessões OpenCode ao escritório está em desenvolvimento.');
  } else {
    for (const agent of agents.slice(0, 8)) agentsBox.append(makeAgentRow(agent));
  }
}

function renderTeams() {
  const target = byId('teams-grid');
  target.replaceChildren();
  for (const squad of SQUADS) {
    const connected = (snap?.agents ?? []).filter(a =>
      squad.members.some(name => name.toLowerCase() === a.name.toLowerCase()));
    const card = element('article', 'squad-card squad-card--' + squad.color);
    const head = element('div', 'squad-card__head');
    head.append(element('span', 'squad-icon', squad.title.slice(0, 2).toUpperCase()), chip(connected.length ? connected.length + ' conectado(s)' : 'Não conectado', connected.length ? 'good' : 'quiet'));
    card.append(head, element('h3', '', squad.title), element('p', '', squad.description));
    const members = element('div', 'squad-members');
    for (const name of squad.members) {
      const item = element('div', 'squad-member');
      const seen = connected.some(a => a.name.toLowerCase() === name.toLowerCase());
      item.append(element('span', 'member-indicator' + (seen ? ' member-indicator--online' : '')), element('span', '', name));
      members.append(item);
    }
    card.append(members);
    target.append(card);
  }
  const note = byId('teams-note');
  note.textContent = 'As identidades são definidas em ai-office/agents/*.md. A conexão aparecerá quando a fonte OpenCode for integrada ao servidor do escritório.';
}

function renderActivity() {
  const target = byId('activity-stream');
  target.replaceChildren();
  const events = [...feedMap.values()].sort((a, b) => b.activity.at - a.activity.at);
  const filtered = search ? events.filter(e =>
    [e.agentName, e.roomName, e.activity.text, e.activity.detail ?? ''].join(' ').toLowerCase().includes(search))
    : events;
  if (!filtered.length) {
    renderEmpty(target, 'Sem eventos por enquanto', search ? 'Nenhum evento corresponde à pesquisa.' : 'A atividade registrada pelos agentes aparecerá aqui assim que o servidor publicar eventos.');
    return;
  }
  for (const evt of filtered.slice(0, 80)) {
    const row = element('article', 'event-row');
    const circle = element('span', 'event-mark', evt.agentName.slice(0, 1).toUpperCase());
    circle.setAttribute('aria-hidden', 'true');
    const body = element('div', 'event-body');
    const title = element('div', 'event-title');
    title.append(element('strong', '', evt.agentName), chip(evt.activity.kind, 'quiet'));
    body.append(title, element('p', '', evt.activity.text || 'Atividade registrada'), element('small', '', evt.roomName));
    row.append(circle, body, element('time', '', displayTime(evt.activity.at)));
    target.append(row);
  }
}

function renderGovernance() {
  const reviews = byId('governance-checks');
  reviews.replaceChildren();
  for (const [title, description, state] of [
    ['CI / integração contínua', 'O GitHub Actions deve validar a branch antes de qualquer merge.', 'Planejado'],
    ['Revisão independente', 'Nora e Vera avaliam evidências e riscos de cada mudança.', 'MVP no AI Office'],
    ['Memória persistente', 'Cada agente possui perfil próprio e memória episódica local.', 'MVP no AI Office'],
    ['PIE / contexto verificável', 'Conexão MCP e freshness do índice ainda não foram validadas.', 'Pendente'],
    ['Integração visual OpenCode', 'Representar os agentes reais e suas reuniões nesta interface.', 'Pendente'],
  ] as const) {
    const row = element('div', 'governance-row');
    const content = element('div');
    content.append(element('strong', '', title), element('p', '', description));
    row.append(content, chip(state, state === 'MVP no AI Office' ? 'good' : 'quiet'));
    reviews.append(row);
  }
}

function render() {
  renderOverview();
  renderTeams();
  renderActivity();
  renderGovernance();
  byId('connection-status').textContent = snap ? 'Servidor conectado' : 'Aguardando conexão';
  byId('connection-status').dataset.connected = String(Boolean(snap));
  byId('current-revision').textContent = snap ? 'Revisão do snapshot: ' + snap.rev : 'Sem snapshot';
  byId('last-updated').textContent = snap ? 'Atualizado às ' + displayTime(snap.serverTime) : 'Conecte o servidor local';
}

function switchView(view: View) {
  currentView = view;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  }
  for (const panel of document.querySelectorAll<HTMLElement>('[data-panel]')) {
    panel.hidden = panel.dataset.panel !== view;
  }
  byId('page-title').textContent = ({
    overview: 'Visão geral',
    teams: 'Equipes e responsabilidades',
    activity: 'Fluxo de atividade',
    governance: 'Governança e memória',
  })[view];
}

function readSnapshot(obj: OfficeSnapshot) {
  if (!obj || !Array.isArray(obj.rooms) || !Array.isArray(obj.agents) || !obj.meta) return;
  snap = obj;
  agentMap.clear();
  for (const agent of obj.agents) agentMap.set(agent.id, agent);
  render();
}

async function initialLoad() {
  try {
    const response = await fetch('/api/snapshot', { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    readSnapshot(await response.json() as OfficeSnapshot);
  } catch {
    byId('connection-status').textContent = 'Servidor indisponível';
    byId('connection-status').dataset.connected = 'false';
  }
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
  button.addEventListener('click', () => switchView(button.dataset.view as View));
}
byId<HTMLInputElement>('activity-search').addEventListener('input', event => {
  search = (event.target as HTMLInputElement).value.trim().toLowerCase();
  renderActivity();
});
byId<HTMLButtonElement>('refresh-button').addEventListener('click', () => { void initialLoad(); });
document.querySelectorAll<HTMLElement>('[data-year]').forEach(e => { e.textContent = String(new Date().getFullYear()); });

switchView(currentView);
render();
void initialLoad();

const stream = new EventSource('/api/stream');
stream.addEventListener('snapshot', event => {
  try { readSnapshot(JSON.parse((event as MessageEvent).data) as OfficeSnapshot); } catch { /* Ignore malformed event */ }
});
stream.addEventListener('feed', event => {
  try {
    const items = JSON.parse((event as MessageEvent).data) as FeedItem[];
    if (!Array.isArray(items)) return;
    for (const item of items) if (item && typeof item.id === 'string' && item.activity) feedMap.set(item.id, item);
    if (feedMap.size > 250) {
      const recent = [...feedMap.values()].sort((a, b) => b.activity.at - a.activity.at).slice(0, 150);
      feedMap.clear(); for (const item of recent) feedMap.set(item.id, item);
    }
    renderActivity();
  } catch { /* Ignore malformed event */ }
});
stream.onerror = () => {
  byId('connection-status').textContent = 'Reconectando ao servidor';
  byId('connection-status').dataset.connected = 'false';
};
stream.onopen = () => { if (snap) { byId('connection-status').textContent = 'Servidor conectado'; byId('connection-status').dataset.connected = 'true'; } };
