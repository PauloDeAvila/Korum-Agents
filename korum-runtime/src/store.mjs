import { mkdirSync, readFileSync, existsSync, writeFileSync, appendFileSync, renameSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { redact, maxText } from './contract.mjs';

export function defaultStateDir(workspace) {
  const token=createHash('sha256').update(resolve(workspace)).digest('hex').slice(0,18);
  return join(homedir(),'.korum-agents',token);
}
const redacted = x => JSON.parse(JSON.stringify(x, (key,value)=>typeof value==='string'?redact(value):value));
export class KorumStore {
  constructor(directory,agents) {
    this.directory=resolve(directory);
    this.agents=agents;
    mkdirSync(join(this.directory,'brains'),{recursive:true});
    for(const a of agents) {
      const path=join(this.directory,'brains',a.id+'.md');
      if(!existsSync(path))writeFileSync(path,'# '+a.name+'\n\nPapel: '+a.role+'\n\n## Histórico de participação\n');
    }
    this.snapshot=this.load();
  }
  load() {
    try {
      const s=JSON.parse(readFileSync(join(this.directory,'snapshot.json'),'utf8'));
      if(!s||typeof s!=='object')return {};
      return s;
    } catch {return {};}
  }
  update(patch) {
    this.snapshot={...this.snapshot,...patch,updatedAt:new Date().toISOString()};
    const tmp=join(this.directory,'snapshot.json.tmp');
    writeFileSync(tmp,JSON.stringify(this.snapshot,null,2));
    renameSync(tmp,join(this.directory,'snapshot.json'));
    return this.snapshot;
  }
  append(type, data={}) {
    const event=redacted({id:randomUUID(),at:new Date().toISOString(),type,...data});
    appendFileSync(join(this.directory,'events.jsonl'),JSON.stringify(event)+'\n');
    return event;
  }
  memory(agentId) {
    if(!this.agents.some(a=>a.id===agentId))throw Error('Agente não encontrado');
    return readFileSync(join(this.directory,'brains',agentId+'.md'),'utf8').slice(-4500);
  }
  remember(agentId,kind,summary) {
    if(!this.agents.some(a=>a.id===agentId))throw Error('Agente não encontrado');
    const path=join(this.directory,'brains',agentId+'.md');
    let old=readFileSync(path,'utf8');
    const entry='- '+new Date().toISOString()+' | '+maxText(kind,60)+' | '+redact(maxText(summary,360).replace(/[\r\n]+/g,' '))+'\n';
    old=(old+entry).slice(-15000);
    writeFileSync(path,old);
  }
}
