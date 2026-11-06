// Korum Local Task Gateway: no account, remote access, or permissions to edit.
// Requests are accepted only by the loopback route in server/index.ts.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError, readJson, sendJson } from '../http/app';

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'interrupted';
export interface KorumTask {
  id: string;
  provider: 'opencode';
  status: TaskStatus;
  title: string;
  instruction: string;
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
  result?: string;
  error?: string;
}
export interface KorumProviderState {
  name: 'opencode';
  connected: boolean;
  version?: string;
  workspace: string | null;
  enabled: boolean;
  detail: string;
}
type JsonObject = Record<string, unknown>;
function object(value: unknown): JsonObject {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as JsonObject;
  return {};
}
function safePath(path: string): string {
  try { return realpathSync(path); } catch { return resolve(path); }
}
function samePath(a: string,b: string): boolean {
  const x=safePath(a),y=safePath(b);
  return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y;
}
function localOpenCodeUrl(value: string): string {
  const url=new URL(value);
  if (url.protocol !== 'http:' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/')
    throw new Error('KORUM_OPENCODE_URL deve apontar somente para http://127.0.0.1:<porta>/');
  return url.origin;
}
function redact(text: unknown): string {
  return String(text??'').replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|gsk_[A-Za-z0-9_-]{16,}|gh[ps]_[A-Za-z0-9_-]{16,})\b/g,'[REDACTED]').slice(0,6000);
}
function now(): string { return new Date().toISOString(); }
function validateInstruction(x: unknown): { title: string; instruction: string } {
  const value=object(x);
  if (typeof value.instruction !== 'string' || value.instruction.trim().length < 8 ||
      value.instruction.length > 2200) throw new HttpError(400,'Informe uma instrução entre 8 e 2200 caracteres');
  const title=typeof value.title === 'string' && value.title.trim()
    ? value.title.trim().slice(0,100) : value.instruction.trim().slice(0,70);
  return {title:redact(title),instruction:redact(value.instruction.trim())};
}
export class KorumGateway {
  readonly workspace: string | null;
  readonly url: string;
  readonly dataDir: string;
  private tasks: KorumTask[] = [];
  private fetching: typeof fetch;
  private processing=false;
  private cached: {at: number; info: KorumProviderState} | null = null;
  private password: string;
  private username: string;
  constructor({workspace=process.env.KORUM_WORKSPACE,
    url=process.env.KORUM_OPENCODE_URL??'http://127.0.0.1:4096',
    dataDir=join(homedir(),'.korum-agents','gateway'),
    request=fetch, password=process.env.KORUM_OPENCODE_PASSWORD??'',
    username=process.env.KORUM_OPENCODE_USERNAME??'opencode'}: {
    workspace?: string; url?: string; dataDir?: string;
    request?: typeof fetch; password?: string; username?: string
  }={}) {
    this.workspace=workspace && isAbsolute(workspace) && existsSync(workspace)?safePath(workspace):null;
    this.url=localOpenCodeUrl(url.endsWith('/')?url:url+'/');
    this.dataDir=resolve(dataDir);
    this.fetching=request;
    this.password=password; this.username=username;
    mkdirSync(this.dataDir,{recursive:true});
    try { const value=JSON.parse(readFileSync(join(this.dataDir,'tasks.json'),'utf8'));
      this.tasks=Array.isArray(value) ? value.filter(t=>t&&typeof t.id==='string').slice(-60) as KorumTask[] : [];
    } catch { this.tasks=[]; }
    let changed=false;
    for(const task of this.tasks) if(task.status==='running'||task.status==='queued'){
      task.status='interrupted';task.error='Korum foi reiniciado. Reenvie conscientemente se necessário.';
      task.updatedAt=now();changed=true;
    }
    if(changed)this.save();
  }
  private save(): void {
    this.tasks=this.tasks.slice(-60);
    const target=join(this.dataDir,'tasks.json');
    const temp=target+'.tmp';
    writeFileSync(temp,JSON.stringify(this.tasks,null,2),{mode:0o600});
    renameSync(temp,target);
  }
  private async requestApi(path: string, {method='GET',body,timeoutMs=2500}: {
    method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number
  }={}): Promise<unknown> {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      const headers: Record<string,string>={Accept:'application/json'};
      if(body!==undefined)headers['Content-Type']='application/json';
      if(this.password)headers.Authorization='Basic '+Buffer.from(this.username+':'+this.password).toString('base64');
      const response=await this.fetching(this.url+path,{method,headers,
        body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
      if(!response.ok)throw new Error('OpenCode HTTP '+response.status);
      return response.status===204?null:await response.json();
    } finally {clearTimeout(timer);}
  }
  async provider(force=false): Promise<KorumProviderState> {
    if (!force && this.cached && Date.now()-this.cached.at < 3500) return this.cached.info;
    let info: KorumProviderState={name:'opencode',connected:false,workspace:this.workspace,
      enabled:!!this.workspace,detail:'OpenCode não encontrado na porta configurada'};
    try {
      const result=object(await this.requestApi('/global/health'));
      if(result.healthy===true)info={...info,connected:true,
        version:typeof result.version==='string'?result.version:undefined,
        detail:this.workspace?'Disponível para análises locais, sem edição':'Defina KORUM_WORKSPACE para delegar tarefas'};
    } catch { /* Provider is optional; the rest of the office stays functional. */ }
    this.cached={at:Date.now(),info};
    return info;
  }
  list(): KorumTask[] {return this.tasks.slice().reverse().map(t=>({...t}));}
  get(id: string): KorumTask | null {
    const item=this.tasks.find(t=>t.id===id);
    return item?{...item}:null;
  }
  async submit(value: unknown): Promise<KorumTask> {
    const {title,instruction}=validateInstruction(value);
    if(!this.workspace)throw new HttpError(409,'Defina KORUM_WORKSPACE com a raiz do projeto antes de delegar');
    if(this.tasks.filter(t=>t.status==='queued'||t.status==='running').length>=8)
      throw new HttpError(429,'Fila de tarefas cheia');
    const provider=await this.provider(true);
    if(!provider.connected)throw new HttpError(409,'OpenCode indisponível; inicie opencode serve no projeto');
    // For a safe MVP, a delegated task is ALWAYS read-only regardless of the prompt.
    const task: KorumTask={id:randomUUID(),provider:'opencode',title,instruction,
      createdAt:now(),updatedAt:now(),status:'queued'};
    this.tasks.push(task);this.save();
    const accepted={...task}; // resposta 202 deve refletir o estado aceito, antes da fila avançar
    void this.work().catch(()=>undefined);
    return accepted;
  }
  private async work(): Promise<void> {
    if(this.processing)return;
    this.processing=true;
    try {
      while(true){
        const task=this.tasks.find(t=>t.status==='queued');
        if(!task)break;
        task.status='running';task.updatedAt=now();this.save();
        try {
          const pathInfo=object(await this.requestApi('/path',{timeoutMs:3000}));
          const directory=typeof pathInfo.directory==='string'?pathInfo.directory:'';
          if(!directory||!samePath(directory,this.workspace!))
            throw new Error('Projeto diferente: inicie opencode serve a partir de KORUM_WORKSPACE');
          const created=object(await this.requestApi('/session',{method:'POST',timeoutMs:9000,
            body:{title:'Korum · '+task.title}}));
          const id=created.id;
          if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{4,120}$/.test(id))
            throw new Error('OpenCode não forneceu uma sessão válida');
          task.sessionId=id;task.updatedAt=now();this.save();
          const result=object(await this.requestApi('/session/'+encodeURIComponent(id)+'/message',{
            method:'POST',timeoutMs:120000,
            body:{agent:'plan',
              tools:{bash:false,edit:false,write:false,apply_patch:false,task:false,webfetch:false},
              parts:[{type:'text',text:'TAREFA DE ANÁLISE SOMENTE LEITURA DO KORUM. Não modifique arquivos, não execute comandos e não faça push/merge/deploy. Responda com a análise e evidências verificáveis.\n\n'+task.instruction}]}
          }));
          const parts=Array.isArray(result.parts)?result.parts:[];
          const answer=parts.filter(p=>object(p).type==='text').map(p=>object(p).text).filter(x=>typeof x==='string').join('\n').trim();
          if(!answer)throw new Error('OpenCode terminou sem resposta textual verificável');
          task.result=redact(answer);task.status='completed';task.updatedAt=now();this.save();
        } catch(error){
          task.status='failed';task.error=redact(error instanceof Error?error.message:'Falha inesperada');
          task.updatedAt=now();this.save();
        }
      }
    } finally{this.processing=false;}
  }
  async handle(req:IncomingMessage,res:ServerResponse,url:URL): Promise<void> {
    try {
      if(url.pathname==='/api/korum/providers' && req.method==='GET')
        return sendJson(res,200,{providers:[await this.provider()]});
      if(url.pathname==='/api/korum/agents' && req.method==='GET')
        return sendJson(res,200,{agents:[
          {id:'atlas',role:'Agent Master',provider:'codex'},
          {id:'tyson',role:'Engenharia',provider:'codex'},
          {id:'mini-opencode',role:'Análise delegada somente leitura',provider:'opencode'}
        ]});
      if(url.pathname==='/api/korum/tasks'&&req.method==='GET')
        return sendJson(res,200,{tasks:this.list()});
      if(url.pathname==='/api/korum/tasks'&&req.method==='POST'){
        const task=await this.submit(await readJson(req,8192));
        return sendJson(res,202,{task});
      }
      const match=/^\/api\/korum\/tasks\/([0-9a-f-]{36})$/i.exec(url.pathname);
      if(match&&req.method==='GET'){
        const task=this.get(match[1]);
        return task?sendJson(res,200,{task}):sendJson(res,404,{error:'Tarefa não encontrada'});
      }
      return sendJson(res,404,{error:'Rota Korum desconhecida'});
    } catch(error) {
      if(error instanceof HttpError)return sendJson(res,error.status,{error:error.message});
      return sendJson(res,500,{error:'Falha interna do Korum'});
    }
  }
}
