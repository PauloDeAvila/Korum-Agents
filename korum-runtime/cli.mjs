#!/usr/bin/env node
import { resolve } from 'node:path';
import { AgentNetwork } from './src/network.mjs';

function readArgs(argv) {
  const v={workspace:null,goal:null,write:false,testCommand:null,maxTurns:24,maxMasterRounds:5,stateDir:null,model:null};
  const aliases={'--workspace':'workspace','--goal':'goal','--test':'testCommand','--state':'stateDir','--model':'model','--max-turns':'maxTurns','--max-rounds':'maxMasterRounds'};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--write'){v.write=true;continue;}
    const key=aliases[argv[i]];
    if(!key || !argv[i+1])throw Error('Argumento desconhecido ou incompleto: '+argv[i]);
    v[key]=argv[++i];
  }
  if(!v.workspace||!v.goal)throw Error('Informe --workspace e --goal');
  return v;
}
const usage=[
  'Korum Agents — Codex AI-to-AI',
  'node cli.mjs --workspace CAMINHO --goal "Objetivo detalhado"',
  'Opcional: --write --test "npm test" --model NOME --max-rounds 5 --max-turns 24 --state CAMINHO',
  'Padrão: SOMENTE LEITURA. Edite apenas worktrees de feature com testes configurados.',
].join('\n');
let opts;
try{opts=readArgs(process.argv.slice(2));}
catch(e){console.error(e.message+'\n'+usage);process.exit(2);}
const print=e=>{
  if(e.type==='codex.event'&&e.type!=='mission.finished')return;
  if(e.type==='message')console.log('['+e.from+' → '+e.to+'] '+e.kind+': '+String(e.body).slice(0,600));
  else if(['master.decision','mission.finished','mission.error','verification.gate'].includes(e.type))
    console.log('['+e.type+'] '+JSON.stringify(e).slice(0,1200));
};
const network=new AgentNetwork({workspace:resolve(opts.workspace),stateDir:opts.stateDir,write:opts.write,
  testCommand:opts.testCommand,maxTurns:Number(opts.maxTurns),maxMasterRounds:Number(opts.maxMasterRounds),
  model:opts.model,notify:print});
process.once('SIGINT',()=>{network.stop();console.error('Missão interrompida.');});
try{
  const result=await network.run(opts.goal);
  console.log('Resultado: '+JSON.stringify(result,null,2));
  console.log('Eventos e memórias: '+network.store.directory);
  if(result.status==='needs_review')process.exitCode=1;
}catch(e){console.error('Falha: '+e.message);process.exitCode=1;}
