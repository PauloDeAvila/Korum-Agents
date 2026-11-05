import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {AgentNetwork} from '../src/network.mjs';

function setup(withGit=false){
  const workspace=mkdtempSync(join(tmpdir(),'korum-w-')),stateDir=mkdtempSync(join(tmpdir(),'korum-s-'));
  if(withGit)execFileSync('git',['init','-q','-b','feature/korum-test',workspace]);
  return {workspace,stateDir};
}
function scripted(plan,calls=[],onCall=()=>{}){
  const byAgent=new Map(Object.entries(plan).map(([id,entries])=>[id,[...entries]]));
  return {async run(args){
    calls.push({id:args.agent.id,threadId:args.threadId??null,write:args.write,prompt:args.prompt});
    onCall(args);
    const next=byAgent.get(args.agent.id)?.shift();
    if(!next)throw Error('Resposta de mock inexistente: '+args.agent.id);
    return {text:JSON.stringify(next),threadId:args.threadId||'thread-'+args.agent.id,usage:{input_tokens:8,output_tokens:6}};
  }};
}
const delegation=(to='tyson')=>({decision:'delegate',summary:'Reunião: delegar uma tarefa',assignments:[{to,task:'Verificar contrato do módulo'}],criteria:'Código e relatório verificáveis'});
const delivery=(summary='Conclusão fundamentada')=>({status:'delivered',summary,messages:[],evidence:{files:[],tests:[]}});
const accept=()=>({decision:'accept',summary:'Trabalho revisado, sem dispensa dos testes'});
test('A2A: worker pergunta a colega, incorpora resposta, Master revisa e solicita correção',async()=>{
  const {workspace,stateDir}=setup();
  const calls=[],driver=scripted({
    master:[delegation(),{decision:'revise',summary:'Ajustar contrato',assignments:[{to:'tyson',task:'Refinar contrato'}]},accept()],
    tyson:[{status:'needs_help',summary:'Preciso da interface',messages:[{to:'iris',kind:'question',body:'Qual contrato usar?'}]},delivery('Agora tenho contrato: A'),delivery('Contrato refinado')],
    iris:[delivery('Use contrato A')]
  },calls);
  const network=new AgentNetwork({workspace,stateDir,driver,skipGit:true,maxTurns:20,maxMasterRounds:4});
  const result=await network.run('Melhorar um módulo');
  assert.equal(result.status,'reviewed');
  assert.equal(network.masterRounds,2);
  assert.equal(network.sessionIds.tyson,'thread-tyson');
  assert.equal(calls.filter(x=>x.id==='tyson').length,3);
  assert.ok(calls.filter(x=>x.id==='tyson').slice(1).every(x=>x.threadId==='thread-tyson'));
  assert.ok(calls.some(x=>x.id==='iris'&&x.prompt.includes('Qual contrato usar?')));
  assert.ok(calls.some(x=>x.id==='tyson'&&x.prompt.includes('Use contrato A')));
  const events=readFileSync(join(stateDir,'events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(events.some(x=>x.type==='message'&&x.from==='tyson'&&x.to==='iris'&&x.kind==='question'));
  assert.ok(events.some(x=>x.type==='message'&&x.from==='iris'&&x.to==='tyson'&&x.kind==='answer'&&x.replyTo));
  assert.equal(events.filter(x=>x.type==='master.decision').length,2);
  assert.ok(existsSync(join(stateDir,'brains','tyson.md')));
});
test('Master nunca declara implementação pronta em modo leitura',async()=>{
 const {workspace,stateDir}=setup();
 const network=new AgentNetwork({workspace,stateDir,driver:scripted({master:[delegation(),accept()],tyson:[delivery()]}),skipGit:true});
 const result=await network.run('Revisar escopo');
 assert.equal(result.status,'reviewed');assert.match(result.reason,/SOMENTE|leitura/i);
});
test('Master não pode aceitar resposta ainda bloqueada',async()=>{
 const {workspace,stateDir}=setup();
 const network=new AgentNetwork({workspace,stateDir,driver:scripted({
   master:[delegation(),accept()],
   tyson:[{status:'blocked',summary:'Erro impeditivo',messages:[]}]
 }),skipGit:true});
 const result=await network.run('Corrigir bug');
 assert.equal(result.status,'needs_review');
 const events=readFileSync(join(stateDir,'events.jsonl'),'utf8');
 assert.match(events,/Master aceitou sem entrega completa/);
});
test('Limites impedem feedback infinito',async()=>{
 const {workspace,stateDir}=setup();
 const revise=()=>({decision:'revise',summary:'Mais uma rodada',assignments:[{to:'tyson',task:'Verificar de novo'}]});
 const network=new AgentNetwork({workspace,stateDir,driver:scripted({
 master:[delegation(),revise(),revise(),revise()],
 tyson:[delivery(),delivery(),delivery()]
 }),skipGit:true,maxMasterRounds:2,maxTurns:15});
 const result=await network.run('Revisão iterativa');
 assert.equal(result.status,'needs_review');assert.equal(network.masterRounds,2);
});
test('Qualidade: testes + diff + QA + governança são obrigatórios para entrega verificada',async()=>{
 const {workspace,stateDir}=setup(true);
 const driver=scripted({master:[delegation(),accept()],tyson:[delivery('Arquivo criado')],
 nora:[{decision:'approved',summary:'Validado em mock'}],vera:[{decision:'approved',summary:'Políticas avaliadas em mock'}]},[],({agent})=>{
   if(agent.id==='tyson')writeFileSync(join(workspace,'feature.js'),'export const ok = true;\n');
 });
 const network=new AgentNetwork({workspace,stateDir,write:true,testCommand:'npm test',driver,testRunner:async()=>({code:0,timedOut:false,output:'passou'}),maxTurns:9});
 const result=await network.run('Adicionar módulo');
 assert.equal(result.status,'verified');
 assert.equal(result.gate.test.code,0);
 assert.equal(result.gate.changes.changed,true);
});
test('Falha de testes impede certificação apesar de aprovação textual dos agentes',async()=>{
 const {workspace,stateDir}=setup(true);
 const driver=scripted({master:[delegation(),accept()],tyson:[delivery()],
 nora:[{decision:'approved',summary:'Sem falhas aparentes'}],vera:[{decision:'approved',summary:'Risco baixo'}]},[],({agent})=>{
 if(agent.id==='tyson')writeFileSync(join(workspace,'bug.txt'),'alteração');
 });
 const network=new AgentNetwork({workspace,stateDir,write:true,testCommand:'npm test',driver,testRunner:async()=>({code:1,timedOut:false,output:'assertion failed'})});
 const result=await network.run('Ajustar bug');assert.equal(result.status,'needs_review');assert.equal(result.gate.approved,false);
});
test('Escrita em main/master é proibida e não se inicia em workspace suja',()=>{
 const {workspace,stateDir}=setup(true);
 execFileSync('git',['checkout','-q','-b','main'],{cwd:workspace});
 assert.throws(()=>new AgentNetwork({workspace,stateDir,write:true,testCommand:'npm test',driver:scripted({})}),/main\/master/);
 const {workspace:other,stateDir:otherState}=setup(true);
 writeFileSync(join(other,'dirty.txt'),'alterações existentes');
 assert.throws(()=>new AgentNetwork({workspace:other,stateDir:otherState,write:true,testCommand:'npm test',driver:scripted({})}),/limpa/);
});
