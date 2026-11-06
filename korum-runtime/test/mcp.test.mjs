import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatch,executeTool,TOOL_DEFINITIONS} from '../mcp.mjs';

test('MCP responde initialize com ferramentas descobríveis',async()=>{
  const r=await dispatch({jsonrpc:'2.0',id:1,method:'initialize',
    params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'test',version:'1'}}});
  assert.equal(r.result.serverInfo.name,'korum-local');
  const tools=await dispatch({jsonrpc:'2.0',id:2,method:'tools/list'});
  assert.equal(tools.result.tools.length,5);
  assert.ok(TOOL_DEFINITIONS.some(t=>t.name==='korum_delegate_opencode'));
});
test('MCP permite delegação somente ao endpoint fixo e não escolhe arquivos ou diretórios arbitrários',async()=>{
  let path,options;
  const call=async(p,opts)=>{path=p;options=opts;return {task:{id:'example'}}};
  const result=await executeTool('korum_delegate_opencode',{instruction:'Analise a arquitetura do projeto',title:'Revisão',workspace:'/etc'},call);
  assert.equal(path,'/api/korum/tasks');
  assert.deepEqual(options.body,{instruction:'Analise a arquitetura do projeto',title:'Revisão'});
  assert.equal(options.method,'POST');
});
test('IDs inválidos e payloads perigosos falham',async()=>{
  await assert.rejects(()=>executeTool('korum_get_task',{taskId:'../../outside'}),/inválido/);
  await assert.rejects(()=>executeTool('korum_delegate_opencode',{instruction:'x'}),/8 a 2200/);
  await assert.rejects(()=>executeTool('open_shell',{cmd:'rm'}),/desconhecida/);
});
test('MCP trata erro de ferramenta e não omite falha',async()=>{
  const r=await dispatch({jsonrpc:'2.0',id:3,method:'tools/call',
    params:{name:'korum_delegate_opencode',arguments:{instruction:'Investigue o contrato do sistema'}}},
    async()=>{throw Error('OpenCode indisponível')});
  assert.equal(r.result.isError,true);
  assert.match(r.result.content[0].text,/indisponível/);
});
test('MCP respeita notificações sem gerar resposta e rejeita método estranho',async()=>{
  const n=await dispatch({jsonrpc:'2.0',method:'notifications/initialized'});
  assert.equal(n,null);
  const m=await dispatch({jsonrpc:'2.0',id:8,method:'private_method'});
  assert.equal(m.error.code,-32601);
});
