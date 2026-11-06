import type { AgentInfo, AgentStatus, FeedItem, OfficeSnapshot } from '../../shared/types';
import './korum.css';

type View = 'overview' | 'teams' | 'activity' | 'governance' | 'delegations';

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

type KorumTask = { id:string; title:string; status:string; instruction:string; result?:string; error?:string; createdAt:string };
type OpenCodeProvider = { name:'opencode';connected:boolean;workspace:string|null;enabled:boolean;detail:string;version?:string };
let localTasks: KorumTask[] = [];
let opencodeProvider: OpenCodeProvider | null = null;
let submitting = false;

function renderDelegations() {
  const status=byId('opencode-status');
  status.textContent=opencodeProvider?.connected?'Conectado':'Desconectado';
  status.className='chip '+(opencodeProvider?.connected?'chip--good':'chip--quiet');
  byId('opencode-detail').textContent=opencodeProvider?.detail||'Verificando disponibilidade do servidor local';
  byId('opencode-workspace').textContent=opencodeProvider?.workspace?'Projeto: '+opencodeProvider.workspace:'Configure KORUM_WORKSPACE no servidor Korum';
  byId<HTMLButtonElement>('delegate-button').disabled=submitting||!(opencodeProvider?.connected&&opencodeProvider.enabled);
  const target=byId('delegated-list');target.replaceChildren();
  if(!localTasks.length){renderEmpty(target,'Nenhuma tarefa delegada','As análises enviadas pelo painel ou por ferramentas MCP aparecerão aqui.');return;}
  for(const task of localTasks.slice(0,15)){
    const entry=element('article','delegation-item');
    const header=element('div','delegation-item__top');
    header.append(element('strong','',task.title),chip(task.status,task.status==='completed'?'good':task.status==='failed'?'warn':'quiet'));
    entry.append(header,element('small','',task.createdAt));
    if(task.result)entry.append(element('p','delegation-result',task.result.slice(0,1700)));
    else if(task.error)entry.append(element('p','delegation-error',task.error));
    else entry.append(element('p','delegation-result',task.status==='running'?'OpenCode está trabalhando...':'Aguardando execução.'));
    target.append(entry);
  }
}
async function refreshDelegations(){
  try{
    const [providers,tasks]=await Promise.all([
      fetch('/api/korum/providers',{cache:'no-store'}),
      fetch('/api/korum/tasks',{cache:'no-store'})
    ]);
    if(!providers.ok||!tasks.ok)throw new Error('Gateway local não disponível');
    const a=await providers.json() as {providers:OpenCodeProvider[]};
    const b=await tasks.json() as {tasks:KorumTask[]};
    opencodeProvider=a.providers.find(p=>p.name==='opencode')??null;
    localTasks=Array.isArray(b.tasks)?b.tasks:[];
    renderDelegations();
  }catch{
    opencodeProvider=null;
    byId('opencode-detail').textContent='Gateway de delegação indisponível';
    byId<HTMLButtonElement>('delegate-button').disabled=true;
  }
}


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
    renderEmpty(agentsBox, 'Nenhuma sessão observada', 'Os oito papéis da equipe foram configurados, mas a integração de sessões Codex ao escritório está em desenvolvimento.');
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
  note.textContent = 'As identidades são definidas em ai-office/agents/*.md. A conexão aparecerá quando a fonte Codex for integrada ao servidor do escritório.';
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
    ['Revisão independente', 'Nora e Vera avaliam evidências e riscos de cada mudança.', 'MVP no runtime'],
    ['Memória persistente', 'Cada agente possui perfil próprio e memória episódica local.', 'MVP no runtime'],
    ['PIE / contexto verificável', 'Conexão MCP e freshness do índice ainda não foram validadas.', 'Pendente'],
    ['Integração visual Codex', 'Representar os agentes reais e suas reuniões nesta interface.', 'Pendente'],
  ] as const) {
    const row = element('div', 'governance-row');
    const content = element('div');
    content.append(element('strong', '', title), element('p', '', description));
    row.append(content, chip(state, state === 'MVP no runtime' ? 'good' : 'quiet'));
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
    delegations: 'Delegações OpenCode',
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
byId<HTMLFormElement>('delegation-form').addEventListener('submit', event=>{
  event.preventDefault();
  if(submitting||!(opencodeProvider?.connected&&opencodeProvider.enabled))return;
  const instruction=byId<HTMLTextAreaElement>('delegation-instruction').value.trim();
  const title=byId<HTMLInputElement>('delegation-title').value.trim();
  if(instruction.length<8)return;
  submitting=true;renderDelegations();
  void (async()=>{
    try{
      const response=await fetch('/api/korum/tasks',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({instruction,title})
      });
      const result=await response.json() as {task?:KorumTask;error?:string};
      if(!response.ok)throw new Error(result.error||'Falha no gateway');
      byId('delegation-message').textContent='Tarefa enviada: '+(result.task?.id||'');
      byId<HTMLTextAreaElement>('delegation-instruction').value='';
      await refreshDelegations();
    }catch(error){
      byId('delegation-message').textContent=error instanceof Error?error.message:'Erro de delegação';
    }finally{submitting=false;renderDelegations();}
  })();
});
void refreshDelegations();
setInterval(()=>{void refreshDelegations();},3500);

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
