import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { buildRunArgs, roleEnvironment, parseEvent, runOpenCodeTurn } from '../src/opencode-runner.mjs';

test('OpenCode CLI: argumentos separados, agente read-only ou build, sessão e modelo', () => {
  assert.deepEqual(buildRunArgs({ directory: '/repo', role: 'DEV', write: true, model: 'openai/gpt-5', sessionId: 'ses_123', prompt: 'foo; echo danger' }),
    ['run', '--format', 'json', '--agent', 'build', '--model', 'openai/gpt-5', '--session', 'ses_123', 'foo; echo danger']);
  assert.equal(buildRunArgs({ directory: '/repo', role: 'DEV', prompt: 'tarefa' })[4], 'plan');
  assert.equal(buildRunArgs({ directory: '/repo', role: 'REVISOR', write: true, prompt: 'tarefa' })[4], 'plan');
  assert.throws(() => buildRunArgs({ directory: '/repo', role: 'DEV', sessionId: 'bad; rm', prompt: 't' }));
});

test('Configuração impõe acesso de leitura ao revisor e escrita apenas ao dev', () => {
  const env = roleEnvironment('REVISOR', true, { OPENCODE_CONFIG_CONTENT: '{"model":"openai/gpt-5"}' });
  const config = JSON.parse(env.OPENCODE_CONFIG_CONTENT);
  assert.equal(config.model, 'openai/gpt-5');
  assert.equal(config.permission.edit, 'deny');
  assert.equal(config.permission.bash, 'deny');
  assert.equal(config.permissions.findLast(e => e.action === 'shell').effect, 'deny');
  assert.equal(config.permission.external_directory, 'deny');
  assert.equal(config.tools.bash, false);
  const dev = JSON.parse(roleEnvironment('DEV', true, {}).OPENCODE_CONFIG_CONTENT);
  assert.equal(dev.permission.edit, 'allow');
  assert.equal(dev.permissions.some(e => e.action === 'shell' && e.resource === 'git push*' && e.effect === 'deny'), true);
  assert.equal(dev.tools.write, true);
  assert.throws(() => roleEnvironment('DEV', true, { OPENCODE_CONFIG_CONTENT: '{' }));
});

test('Decodifica eventos CLI: texto, ferramentas, custo e erro', () => {
  assert.deepEqual(parseEvent('{"type":"text","sessionID":"ses_123","part":{"text":"Olá"}}'),
    { type: 'text', sessionId: 'ses_123', text: 'Olá' });
  assert.equal(parseEvent('{"type":"tool_use","part":{"tool":"read"}}').name, 'read');
  assert.equal(parseEvent('{"type":"step_finish","part":{"tokens":{"input":24,"output":7}}}').input, 24);
  assert.equal(parseEvent('{"type":"error","error":{"message":"modelo indisponível"}}').message, 'modelo indisponível');
  assert.equal(parseEvent('não-json').type, 'invalid');
});

test('Streaming preserva eventos fracionados e sessão; não duplica output', async () => {
  const events = [];
  const spawnProcess = (_binary, args, settings) => {
    assert.equal(settings.shell, false);
    assert.equal(args.at(-1), 'revisar');
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.kill = () => { child.emit('close', null); };
    setImmediate(() => {
      child.stdout.write('{"type":"text","sessionID":"ses_reviewer","part":{"text":"parte "}}\n{"type":"te');
      child.stdout.write('xt","part":{"text":"final"}}\n');
      child.stdout.write('{"type":"step_finish","part":{"tokens":{"input":14,"output":2}}}\n');
      child.emit('close', 0);
    });
    return child;
  };
  const result = await runOpenCodeTurn({ directory: '/repo', role: 'REVISOR', prompt: 'revisar',
    spawnProcess, onEvent: event => events.push(event) });
  assert.equal(result.text, 'parte final');
  assert.equal(result.sessionId, 'ses_reviewer');
  assert.deepEqual(events.map(e => e.type), ['text', 'text', 'usage']);
});

test('Falha em evento de erro mesmo com exit code 0', async () => {
  const spawnProcess = () => {
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.kill = () => {};
    setImmediate(() => { child.stdout.write('{"type":"error","error":{"message":"Sem créditos"}}\n'); child.emit('close', 0); });
    return child;
  };
  await assert.rejects(() => runOpenCodeTurn({ directory: '/repo', role: 'DEV', prompt: 'go', spawnProcess }), /Sem créditos/);
});
