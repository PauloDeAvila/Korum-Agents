export function parseObject(input) {
  const s = String(input ?? '').trim();
  const raw = s.startsWith('```') ? s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '') : s;
  let x;
  try { x = JSON.parse(raw); } catch { throw new Error('Agente não retornou JSON válido; execução interrompida para evitar interpretação insegura'); }
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('Resposta do agente não é objeto JSON');
  return x;
}
export function clampText(s, max = 2400) { return String(s ?? '').slice(0, max); }
export function validId(s) { return typeof s === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(s); }
export function validatePlan(obj, agents) {
  if (!obj || typeof obj.summary !== 'string' || !Array.isArray(obj.participants)) throw new Error('Plano do coordenador inválido');
  const ids = new Set(agents.map(a => a.id));
  const participants = [...new Set(obj.participants.filter(v=>ids.has(v) && v!=='atlas'))].slice(0, 5);
  return { summary: clampText(obj.summary), participants, instructions: obj.instructions && typeof obj.instructions === 'object' && !Array.isArray(obj.instructions) ? obj.instructions : {} };
}
export function validateTurn(obj, ids) {
  if (!obj || typeof obj.message !== 'string' || !['answered', 'needs_help', 'blocked'].includes(obj.status)) throw new Error('Resposta de colaborador inválida');
  let requests = Array.isArray(obj.requests) ? obj.requests : [];
  requests = requests.filter(r => r && typeof r === 'object' && ids.has(r.to) && typeof r.question === 'string' && r.question.trim()).slice(0, 2).map(r=>({to:r.to,question:clampText(r.question,1200)}));
  return {message:clampText(obj.message,5000),status:obj.status,requests};
}
export function validateReview(obj) {
  if (!obj || !['approved','changes_requested'].includes(obj.status) || typeof obj.summary !== 'string') throw new Error('Revisão inválida');
  return {status:obj.status,summary:clampText(obj.summary,3000)};
}
export function gate({test,quality,governance,write,changed=true}) {
  if (!write) return {approved:false,reason:'Modo leitura; nenhuma implementação certificada'};
  if (!test || test.code !== 0 || test.timeout) return {approved:false,reason:'Teste inexistente, falhou ou expirou'};
  if (!changed) return {approved:false,reason:'Nenhuma alteração de código identificada nesta worktree'};
  if (quality?.status !== 'approved' || governance?.status !== 'approved') return {approved:false,reason:'Revisão de QA e governança não aprovada'};
  return {approved:true,reason:'Teste passou e duas revisões independentes aprovaram (escopo do gate configurado)'};
}
export function testCommand(label) {
  const s=String(label??'').trim();
  if (/^npm test$/.test(s)) return ['npm',['test']];
  if (/^npm run (test|check|lint|typecheck)$/.test(s)) return ['npm',['run',s.slice(8)]];
  if (/^(python|py) -m pytest(?: -q)?$/.test(s)) { const p=s.split(' '); return [p[0],p.slice(1)]; }
  if (/^pytest(?: -q)?$/.test(s)) return ['pytest',s==='pytest'?[]:['-q']];
  return null;
}
export function redact(s) {
  return String(s).replace(/\b(gsk_[A-Za-z0-9_-]{15,}|sk-[A-Za-z0-9_-]{15,}|gh[ps]_[A-Za-z0-9_]{15,})\b/g,'[REDACTED]').slice(0, 14000);
}
