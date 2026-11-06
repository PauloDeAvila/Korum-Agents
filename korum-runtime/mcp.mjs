#!/usr/bin/env node
// Korum MCP over stdio. The host client launches this process locally.
// It delegates read-only tasks to the Korum HTTP API on loopback. No public MCP endpoint.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

function baseUrl(value=process.env.KORUM_LOCAL_URL??'http://127.0.0.1:4747') {
  const u=new URL(value);
  if(u.protocol!=='http:' || !['localhost','127.0.0.1','[::1]'].includes(u.hostname) ||
    u.username || u.password || u.search || u.hash || (u.pathname!=='/'&&u.pathname!==''))
      throw Error('KORUM_LOCAL_URL deve apontar somente para o Korum em localhost');
  return u.origin;
}
const apiBase=baseUrl();
export const TOOL_DEFINITIONS=[
 {name:'korum_list_agents',description:'Lista agentes do Korum e os executores disponíveis. Apenas consulta.',
  inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'korum_list_providers',description:'Verifica se OpenCode está detectado e conectado ao projeto local. Apenas consulta.',
  inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'korum_delegate_opencode',description:'Envia tarefa de ANÁLISE SOMENTE LEITURA ao OpenCode local. Retorna ID para consulta. Sem execução arbitrária, edição, push, merge ou deploy.',
  inputSchema:{type:'object',properties:{
    instruction:{type:'string',minLength:8,maxLength:2200,description:'Pedido de investigação, revisão ou explicação do projeto'},
    title:{type:'string',maxLength:100,description:'Título legível da tarefa'}},
    required:['instruction'],additionalProperties:false}},
 {name:'korum_get_task',description:'Obtém estado, relatório e eventual erro de uma tarefa delegada.',
  inputSchema:{type:'object',properties:{taskId:{type:'string',pattern:'^[0-9a-f-]{36}$'}},required:['taskId'],additionalProperties:false}},
 {name:'korum_list_tasks',description:'Lista tarefas recentes do Korum, com estados e resultados disponíveis. Apenas consulta.',
  inputSchema:{type:'object',properties:{},additionalProperties:false}}
];
const NAMES=new Set(TOOL_DEFINITIONS.map(t=>t.name));
export async function callApi(path,{method='GET',body,request=fetch}={}){
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),10000);
  try{
    const r=await request(apiBase+path,{method,headers:{Accept:'application/json',
      ...(body===undefined?{}:{'Content-Type':'application/json'})},
      body:body===undefined?undefined:JSON.stringify(body),signal:ac.signal});
    let data;
    try {data=await r.json();}catch{data={error:'Korum retornou JSON inválido'};}
    if(!r.ok)throw Error(String(data.error||'Korum HTTP '+r.status));
    return data;
  }finally{clearTimeout(timer);}
}
export async function executeTool(name,args={},call=callApi){
  if(!NAMES.has(name))throw Error('Ferramenta desconhecida');
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Argumentos inválidos');
  if(name==='korum_list_agents')return call('/api/korum/agents');
  if(name==='korum_list_providers')return call('/api/korum/providers');
  if(name==='korum_list_tasks')return call('/api/korum/tasks');
  if(name==='korum_get_task'){
    if(typeof args.taskId!=='string'||!/^[0-9a-f-]{36}$/i.test(args.taskId))throw Error('taskId inválido');
    return call('/api/korum/tasks/'+args.taskId);
  }
  if(typeof args.instruction!=='string'||args.instruction.trim().length<8||args.instruction.length>2200)
    throw Error('instruction precisa ter de 8 a 2200 caracteres');
  if(args.title!==undefined&&(typeof args.title!=='string'||args.title.length>100))throw Error('title inválido');
  return call('/api/korum/tasks',{method:'POST',body:{instruction:args.instruction,title:args.title}});
}
const jsonRpcError=(id,code,message)=>({jsonrpc:'2.0',id,error:{code,message}});
export async function dispatch(msg,call=callApi){
  if(!msg||typeof msg!=='object'||Array.isArray(msg)||msg.jsonrpc!=='2.0'||
    typeof msg.method!=='string')return jsonRpcError(msg?.id??null,-32600,'Requisição JSON-RPC inválida');
  const id=Object.hasOwn(msg,'id')?msg.id:null;
  if(msg.method==='notifications/initialized'||msg.method==='notifications/cancelled')return null;
  if(id===null)return null;
  if(msg.method==='initialize')return {jsonrpc:'2.0',id,result:{
    protocolVersion:['2025-11-25','2025-06-18'].includes(msg.params?.protocolVersion)
      ? msg.params.protocolVersion:'2025-11-25',
    capabilities:{tools:{}},serverInfo:{name:'korum-local',version:'0.3.0'}}};
  if(msg.method==='ping')return {jsonrpc:'2.0',id,result:{}};
  if(msg.method==='tools/list')return {jsonrpc:'2.0',id,result:{tools:TOOL_DEFINITIONS}};
  if(msg.method==='tools/call'){
    const name=msg.params?.name;
    try{
      const result=await executeTool(name,msg.params?.arguments??{},call);
      return {jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}],isError:false}};
    }catch(error){
      return {jsonrpc:'2.0',id,result:{content:[{type:'text',text:error instanceof Error?error.message:'Falha'}],isError:true}};
    }
  }
  return jsonRpcError(id,-32601,'Método MCP desconhecido');
}
function startStdio(){
  let buffer='';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data',chunk=>{
    buffer+=chunk;
    if(buffer.length>65536){buffer='';process.stdout.write(JSON.stringify(jsonRpcError(null,-32700,'Mensagem excessiva'))+'\n');return;}
    let i;
    while((i=buffer.indexOf('\n'))>=0){
      const line=buffer.slice(0,i).trim();buffer=buffer.slice(i+1);
      if(!line)continue;
      let message;
      try{message=JSON.parse(line);}catch{process.stdout.write(JSON.stringify(jsonRpcError(null,-32700,'JSON inválido'))+'\n');continue;}
      void dispatch(message).then(output=>{
        if(output)process.stdout.write(JSON.stringify(output)+'\n');
      }).catch(()=>process.stdout.write(JSON.stringify(jsonRpcError(message?.id??null,-32603,'Falha interna'))+'\n'));
    }
  });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))startStdio();
