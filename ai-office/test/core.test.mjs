import test from 'node:test';import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync,existsSync,writeFileSync } from 'node:fs';import { tmpdir } from 'node:os';import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Office } from '../src/core.mjs';
function setup(){const workspace=mkdtempSync(join(tmpdir(),'office-w-'));execFileSync('git',['init','-q','-b','feature/office',workspace]);const stateDir=mkdtempSync(join(tmpdir(),'office-s-'));return{workspace,stateDir}}
function mockedRunner(outputs,events=[]){return async ({role,prompt,sessionId,onEvent})=>{events.push({role,prompt,sessionId});const m=prompt.match(/# ([^\n]+)/);if(!outputs.length)throw Error('Faltou resposta do mock');let out=outputs.shift();onEvent({type:'usage',input:10,output:20});return{text:JSON.stringify(out),sessionId:sessionId||`ses_${events.length}`}}}
test('fluxo colaborativo: reunião, mensagens, QA, governança e relatório',async()=>{
 const {workspace,stateDir}=setup();const observed=[];
 const replies=[
  {summary:'Criar um endpoint de teste',participants:['tyson','iris'],instructions:{tyson:'Crie o endpoint',iris:'Analise contrato'}},
  {message:'Implementei o endpoint',status:'needs_help',requests:[{to:'igor',question:'Revise integração CI'}]},
  {message:'Interface é compatível',status:'answered',requests:[]},
  {message:'CI deve rodar testes',status:'answered',requests:[]},
  {status:'approved',summary:'QA verificou testes simulados'},
  {status:'approved',summary:'Governança verificou revisão'},
  {summary:'Revisão concluída',next_step:'Monitorar dívida técnica'}
 ];
 const mockedOnce=mockedRunner(replies,observed);
 const office=new Office({workspace,stateDir,write:true,test:'npm test',skipGit:true,runner:async(args)=>{const out=await mockedOnce(args);if(args.role==='DEV')writeFileSync(join(workspace,'new-feature.txt'),'implementation');return out},testRunner:async()=>({code:0,timeout:false,output:'pass'}),maxTurns:10,reportEvery:2});
 const result=await office.run('Criar API');
 assert.equal(result.status,'approved');assert.equal(observed.length,7);
 assert.match(readFileSync(join(stateDir,'events.jsonl'),'utf8'),/"to":"igor"/);
 assert.match(readFileSync(join(stateDir,'report.md'),'utf8'),/QA approved/);
 assert.ok(existsSync(join(stateDir,'brains','tyson.md')));
 assert.match(office.store.memory('tyson'),/Turno executado/);
});
test('sem escrita/testes uma reunião pode analisar, mas não concluir implementação',async()=>{
 const {workspace,stateDir}=setup();const replies=[
 {summary:'Diagnóstico',participants:['davi']},
 {message:'Problema identificado',status:'answered',requests:[]},
 {message:'Sugeri correção, sem editar',status:'answered',requests:[]},
 {status:'changes_requested',summary:'faltam testes'},
 {status:'changes_requested',summary:'faltam evidências'},
 {summary:'Nada implementado',next_step:'Solicitar ambiente de teste'}];
 const office=new Office({workspace,stateDir,write:false,skipGit:true,runner:mockedRunner(replies),maxTurns:5});
 const r=await office.run('Investigar erro');assert.equal(r.status,'needs_review');assert.equal(r.gate.approved,false);
});
test('worktree principal e diretório sujo são bloqueados',async()=>{
 const {workspace,stateDir}=setup();execFileSync('git',['checkout','-b','main'],{cwd:workspace});
 assert.throws(()=>new Office({workspace,stateDir,write:true,test:'npm test'}),/main/);
});
