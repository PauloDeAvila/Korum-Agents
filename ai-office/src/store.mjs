import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { clampText, redact } from './protocol.mjs';
export function defaultStateDir(workspace) {return join(homedir(), '.ai-office', createHash('sha256').update(resolve(workspace)).digest('hex').slice(0,16));}
export class Store {
  constructor(dir, agents) { this.dir=resolve(dir);this.agents=agents; mkdirSync(join(this.dir,'brains'),{recursive:true}); mkdirSync(join(this.dir,'runs'),{recursive:true});for(const a of agents) this.seedMemory(a); }
  path(...parts){return join(this.dir,...parts)}
  seedMemory(a) {const f=this.path('brains',`${a.id}.md`);if(!existsSync(f))writeFileSync(f,`# Memória persistente — ${a.name}\n\nEquipe: ${a.team}.\n\n## Episódios (eventos registrados pelo orquestrador; não são provas de qualidade)\n`);}
  memory(id){return readFileSync(this.path('brains',`${id}.md`),'utf8').slice(-6000);}
  episode(id, label, detail){let f=this.path('brains',`${id}.md`),old=readFileSync(f,'utf8');const ln=`\n- ${new Date().toISOString()} | ${redact(clampText(label,100))} | ${redact(clampText(detail,350).replace(/[\r\n]+/g,' '))}`;old=(old+ln).slice(-13000);writeFileSync(f,old);}
  event(kind, data={}){const value={at:new Date().toISOString(),kind,...data};appendFileSync(this.path('events.jsonl'),JSON.stringify(value)+'\n'); return value;}
  snapshot(data){const f=this.path('snapshot.json');const tmp=f+'.tmp';writeFileSync(tmp,JSON.stringify({updatedAt:new Date().toISOString(),...data},null,2));renameSync(tmp,f);}
  previousSnapshot(){try{return JSON.parse(readFileSync(this.path('snapshot.json'),'utf8'));}catch{return null;}}
  report(text){writeFileSync(this.path('report.md'),text);}
}

