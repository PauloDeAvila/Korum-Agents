import { spawn } from 'node:child_process';

export const ROLES = Object.freeze({
  COORDENADOR: 'plan',
  DEV_READONLY: 'plan',
  DEV_WRITE: 'build',
  REVISOR: 'plan',
});

// Configuração transitória: não altera opencode.json global nem do projeto.
// NÃO substitui isolamento em contêiner: um processo shell tem os privilégios do usuário.
export function roleEnvironment(role, write, base = process.env) {
  let userConfig = {};
  if (base.OPENCODE_CONFIG_CONTENT) {
    try {
      userConfig = JSON.parse(base.OPENCODE_CONFIG_CONTENT);
      if (!userConfig || Array.isArray(userConfig) || typeof userConfig !== 'object') throw new Error();
    } catch { throw new Error('OPENCODE_CONFIG_CONTENT deve conter um objeto JSON válido'); }
  }
  const canEdit = role === 'DEV' && write;
  const basePermission = userConfig.permission && typeof userConfig.permission === 'object' ? userConfig.permission : {};
  const permission = {
    ...basePermission,
    external_directory: 'deny',
    task: 'deny',
    question: 'deny',
    edit: canEdit ? 'allow' : 'deny',
    bash: canEdit ? { '*': 'allow', 'git commit*': 'deny', 'git push*': 'deny', 'git reset*': 'deny', 'git clean*': 'deny' } : 'deny',
    read: { '*': 'allow', '*.env': 'deny', '*.env.*': 'deny', '*.env.example': 'allow' },
  };
  const v2Permissions = [
    { action: 'external_directory', resource: '*', effect: 'deny' },
    { action: 'subagent', resource: '*', effect: 'deny' },
    { action: 'question', resource: '*', effect: 'deny' },
    { action: 'execute', resource: '*', effect: 'deny' },
    { action: 'read', resource: '*.env', effect: 'deny' },
    { action: 'read', resource: '*.env.*', effect: 'deny' },
    { action: 'read', resource: '*.env.example', effect: 'allow' },
    { action: 'edit', resource: '*', effect: canEdit ? 'allow' : 'deny' },
    { action: 'shell', resource: '*', effect: canEdit ? 'allow' : 'deny' },
  ];
  if (canEdit) {
    for (const cmd of ['git commit*', 'git push*', 'git reset*', 'git clean*']) {
      v2Permissions.push({ action: 'shell', resource: cmd, effect: 'deny' });
    }
  }
  const config = {
    ...userConfig,
    permission,
    permissions: [...(Array.isArray(userConfig.permissions) ? userConfig.permissions : []), ...v2Permissions],
    tools: {
      ...userConfig.tools,
      write: canEdit,
      edit: canEdit,
      apply_patch: canEdit,
      bash: canEdit,
      task: false,
    },
  };
  return { ...base, OPENCODE_CONFIG_CONTENT: JSON.stringify(config), OPENCODE_DISABLE_AUTOUPDATE: 'true' };
}

export function buildRunArgs({ directory, role, write = false, model, sessionId, prompt }) {
  if (!directory || !['COORDENADOR', 'DEV', 'REVISOR'].includes(role)) throw new Error('Argumentos inválidos para OpenCode');
  if (sessionId && !/^ses_[a-zA-Z0-9_-]+$/.test(sessionId)) throw new Error('sessionId inválido');
  const agent = role === 'DEV' ? (write ? ROLES.DEV_WRITE : ROLES.DEV_READONLY) : ROLES[role];
  // cwd já aponta para a worktree: evita depender de --dir, que varia entre versões.
  const args = ['run', '--format', 'json', '--agent', agent];
  if (model) args.push('--model', model);
  if (sessionId) args.push('--session', sessionId);
  args.push(prompt);
  return args;
}

export function parseEvent(line) {
  let event;
  try { event = JSON.parse(line); } catch { return { type: 'invalid' }; }
  if (!event || typeof event !== 'object') return { type: 'invalid' };
  const part = event.part ?? {};
  const sessionId = event.sessionID ?? event.sessionId ?? part.sessionID ?? null;
  if (event.type === 'text' || (event.type === 'message.part.updated' && part.type === 'text')) {
    return { type: 'text', text: String(part.text ?? event.text ?? ''), sessionId };
  }
  if (event.type === 'tool_use' || (event.type === 'message.part.updated' && part.type === 'tool')) {
    return { type: 'tool', name: String(part.tool ?? event.tool ?? 'ferramenta'), sessionId };
  }
  if (event.type === 'step_finish' || (event.type === 'message.part.updated' && part.type === 'step-finish')) {
    const tokens = part.tokens ?? event.tokens ?? {};
    return { type: 'usage', input: tokens.input ?? 0, output: tokens.output ?? 0, sessionId };
  }
  if (event.type === 'error' || event.type === 'session.error') {
    const error = event.error ?? part.error ?? event;
    return { type: 'error', message: String(error.message ?? error.name ?? 'Erro no OpenCode'), sessionId };
  }
  return { type: 'other', sessionId };
}

export async function runOpenCodeTurn({ directory, role, write = false, model, sessionId, prompt,
  binary = 'opencode', signal, onEvent = () => {}, spawnProcess = spawn }) {
  const args = buildRunArgs({ directory, role, write, model, sessionId, prompt });
  const child = spawnProcess(binary, args, {
    cwd: directory,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    windowsHide: true,
    env: roleEnvironment(role, write),
  });
  let currentSession = sessionId ?? null;
  let output = '';
  let stderr = '';
  let failure = '';
  let buffer = '';
  let seenError = false;
  let killed = false;
  const maxMessage = 120000;
  const handle = (line) => {
    if (!line.trim()) return;
    const event = parseEvent(line);
    if (event.sessionId) currentSession = event.sessionId;
    if (event.type === 'text' && event.text) {
      output += event.text;
      if (output.length > maxMessage) {
        failure = 'Resposta OpenCode excedeu limite de 120.000 caracteres';
        child.kill();
      } else onEvent({ type: 'text', text: event.text });
    } else if (event.type === 'tool') onEvent(event);
    else if (event.type === 'usage') onEvent(event);
    else if (event.type === 'error') {
      failure = event.message;
      seenError = true;
      onEvent(event);
    }
  };
  child.stdout?.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    if (buffer.length > 4_000_000) { failure = 'Evento JSON excessivamente grande'; child.kill(); return; }
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      handle(line);
    }
  });
  child.stderr?.on('data', (chunk) => { stderr = (stderr + chunk.toString('utf8')).slice(-4000); });
  const abort = () => { killed = true; child.kill(); };
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (exitCode) => resolve(exitCode));
    });
    if (buffer.trim()) handle(buffer);
    if (killed || signal?.aborted) throw new Error('MISSÃO_INTERROMPIDA');
    if (failure || seenError) throw new Error(failure || 'OpenCode retornou evento de erro');
    if (code !== 0) throw new Error(`OpenCode terminou com código ${code}: ${stderr.trim().slice(-1500)}`);
    if (!output.trim()) throw new Error(`OpenCode (${role}) não retornou uma resposta textual`);
    if (!currentSession) throw new Error('OpenCode não retornou sessionID: não é possível continuar o contexto com segurança');
    return { text: output, sessionId: currentSession };
  } finally {
    signal?.removeEventListener('abort', abort);
  }
}
