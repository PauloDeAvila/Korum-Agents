import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KorumGateway } from './gateway';

const dirs:string[]=[];
afterEach(()=>{for(const d of dirs.splice(0))rmSync(d,{recursive:true,force:true});});
function fixture(){
  const root=mkdtempSync(join(tmpdir(),'korum-gateway-'));dirs.push(root);
  return {workspace:root,dataDir:join(root,'state')};
}
function response(data:unknown,status=200):Response {
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
}
function fakeApi(directory:string,options:{wrongPath?:boolean;error?:boolean}={}){
  const calls:{path:string;body:Record<string,unknown>|null}[]=[];
  const request=vi.fn(async (resource: RequestInfo|URL,init?:RequestInit)=>{
    const u=new URL(String(resource));const body=init?.body?JSON.parse(String(init.body)) as Record<string,unknown>:null;
    calls.push({path:u.pathname,body});
    if(u.pathname==='/global/health')return response({healthy:true,version:'1.0.0'});
    if(u.pathname==='/path')return response({directory:options.wrongPath?'/not-the-workspace':directory});
    if(u.pathname==='/session')return response({id:'ses_korum_mini_1234'});
    if(u.pathname.endsWith('/message')){
      if(options.error)return response({error:'bad request'},500);
      return response({parts:[{type:'text',text:'Análise concluída sem editar arquivos'}]});
    }
    throw Error('Unexpected route '+u.pathname);
  }) as unknown as typeof fetch;
  return {request,calls};
}
async function waitUntil(condition:()=>boolean):Promise<void>{
  for(let i=0;i<60;i++){if(condition())return;await new Promise(r=>setTimeout(r,5));}
  throw Error('Gateway did not complete within test budget');
}
describe('Korum local OpenCode gateway',()=>{
  it('rejeita endpoints externos e URLs com credenciais, protegendo contra SSRF',()=>{
    const d=fixture();
    expect(()=>new KorumGateway({...d,url:'https://example.com'})).toThrow();
    expect(()=>new KorumGateway({...d,url:'http://evil.example:4096'})).toThrow();
    expect(()=>new KorumGateway({...d,url:'http://127.0.0.1:4096/admin'})).toThrow();
  });
  it('descobre OpenCode sem depender de login no prédio',async()=>{
    const d=fixture(),stub=fakeApi(d.workspace);
    const gateway=new KorumGateway({...d,request:stub.request});
    expect(await gateway.provider()).toMatchObject({connected:true,enabled:true,workspace:d.workspace});
    expect(stub.calls[0].path).toBe('/global/health');
  });
  it('delega análise somente leitura ao workspace correto e persiste resultado',async()=>{
    const d=fixture(),stub=fakeApi(d.workspace);
    const gateway=new KorumGateway({...d,request:stub.request});
    const task=await gateway.submit({instruction:'Analise riscos arquiteturais do módulo',title:'Revisão'});
    expect(task.status).toBe('queued');
    await waitUntil(()=>gateway.get(task.id)?.status==='completed');
    expect(gateway.get(task.id)?.result).toContain('Análise concluída');
    const sent=stub.calls.find(c=>c.path.endsWith('/message'))?.body;
    expect(sent?.agent).toBe('plan');
    expect((sent?.tools as Record<string,boolean>).bash).toBe(false);
    expect((sent?.tools as Record<string,boolean>).edit).toBe(false);
    expect(readFileSync(join(d.dataDir,'tasks.json'),'utf8')).toContain(task.id);
  });
  it('não delega se a instância OpenCode estiver em outro projeto',async()=>{
    const d=fixture(),stub=fakeApi(d.workspace,{wrongPath:true});
    const gateway=new KorumGateway({...d,request:stub.request});
    const task=await gateway.submit({instruction:'Investigue o projeto sem editar'});
    await waitUntil(()=>gateway.get(task.id)?.status==='failed');
    expect(gateway.get(task.id)?.error).toContain('Projeto diferente');
    expect(stub.calls.some(c=>c.path==='/session')).toBe(false);
  });
  it('uma falha externa nunca vira sucesso',async()=>{
    const d=fixture(),stub=fakeApi(d.workspace,{error:true});
    const gateway=new KorumGateway({...d,request:stub.request});
    const task=await gateway.submit({instruction:'Pesquise os contratos da arquitetura'});
    await waitUntil(()=>gateway.get(task.id)?.status==='failed');
    expect(gateway.get(task.id)?.error).toContain('HTTP 500');
  });
  it('exige workspace e recusa prompts excessivos',async()=>{
    const d=fixture(),stub=fakeApi(d.workspace);
    const gateway=new KorumGateway({dataDir:d.dataDir,request:stub.request});
    await expect(gateway.submit({instruction:'Analise os módulos atuais'})).rejects.toThrow(/KORUM_WORKSPACE/);
    await expect(gateway.submit({instruction:'a'.repeat(2201)})).rejects.toThrow();
  });
  it('marca tarefas interrompidas após reiniciar sem repetir execução silenciosamente',()=>{
    const d=fixture();const gateway=new KorumGateway(d);
    writeFileSync(join(d.dataDir,'tasks.json'),JSON.stringify([{
      id:'c326e08d-0b18-4d10-ae2d-e0c6b00b77a2',provider:'opencode',status:'running',title:'T',
      instruction:'Analisar',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
    }]));
    const restored=new KorumGateway(d);
    expect(restored.list()[0].status).toBe('interrupted');
    expect(restored.list()[0].error).toContain('reiniciado');
    expect(gateway.list()).toHaveLength(0);
  });
});
