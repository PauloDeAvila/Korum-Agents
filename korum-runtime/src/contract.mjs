const TYPES = new Set(['question','answer','suggestion','handoff','blocker']);
const WORKER_STATES = new Set(['in_progress','needs_help','delivered','blocked']);
const MASTER_STATES = new Set(['delegate','revise','accept','blocked']);
const REVIEW_STATES = new Set(['approved','changes_requested']);
export const maxText = (v,n=2400) => String(v??'').slice(0,n);
export const redact = v => maxText(String(v??'').replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|gsk_[A-Za-z0-9_-]{16,}|gh[ps]_[A-Za-z0-9_]{16,})\b/g,'[REDACTED]'),12000);
export function parseJson(raw) {
  if (typeof raw!=='string') throw Error('Resposta do Codex ausente');
  const t=raw.trim();
  let data;
  try { data=JSON.parse(t); } catch { throw Error('Codex não respondeu JSON válido; sem aprovação automática'); }
  if (!data || Array.isArray(data) || typeof data!=='object') throw Error('Formato JSON inválido');
  return data;
}
export function validateMaster(r,agents,initial=false) {
  if (!r || !MASTER_STATES.has(r.decision) || typeof r.summary!=='string') throw Error('Decisão do Master inválida');
  const assignments=Array.isArray(r.assignments)?r.assignments:[];
  const allowed=new Set(agents.map(a=>a.id).filter(id=>id!=='master'&&id!=='nora'&&id!=='vera'));
  const normalized=assignments.filter(x=>x&&allowed.has(x.to)&&typeof x.task==='string'&&x.task.trim()).slice(0,3).map(x=>({to:x.to,task:maxText(x.task,1500)}));
  if (initial&&r.decision!=='delegate') throw Error('Master precisa delegar o objetivo inicial');
  if ((initial || r.decision==='delegate'||r.decision==='revise') && r.decision!=='blocked' && !normalized.length) throw Error('Master não forneceu tarefa válida');
  return {decision:r.decision,summary:redact(r.summary),assignments:normalized,criteria:maxText(r.criteria||'',1800)};
}
export function validateWorker(r,agents,self) {
  if(!r || typeof r.summary!=='string'||!WORKER_STATES.has(r.status))throw Error('Resposta de agente inválida');
  const allowed=new Set(agents.map(a=>a.id).filter(id=>id!=='master'&&id!==self));
  const messages=(Array.isArray(r.messages)?r.messages:[]).filter(x=>x&&allowed.has(x.to)&&TYPES.has(x.kind)&&typeof x.body==='string'&&x.body.trim()).slice(0,3).map(x=>({to:x.to,kind:x.kind,body:redact(maxText(x.body,1800))}));
  return {status:r.status,summary:redact(maxText(r.summary,5000)),messages,evidence:maxText(JSON.stringify(r.evidence??{}),2500)};
}
export function validateReview(r) {
  if(!r || !REVIEW_STATES.has(r.decision)||typeof r.summary!=='string')throw Error('Resposta de revisão inválida');
  return {decision:r.decision,summary:redact(r.summary)};
}
export function allowTestCommand(v) {
  const s=String(v??'').trim();
  if(s==='npm test')return ['npm',['test']];
  if(/^npm run (test|check|lint|typecheck)$/.test(s))return ['npm',['run',s.substring(8)]];
  if(s==='pytest'||s==='pytest -q')return ['pytest',s.endsWith('-q')?['-q']:[]];
  return null;
}
