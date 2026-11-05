#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { Office, TEAM } from './src/core.mjs';
const usage=`AI Office (OpenCode)\nnode cli.mjs --workspace CAMINHO [--objective TEXTO] [--write --test "npm test"] [--model provider/model] [--state CAMINHO] [--context-file EXPORT_PIE.md] [--report-every 3]\nComandos: /start, /to <id> <mensagem>, /status, /report, /memory <id>, /pause, /resume, /stop, /quit`;
function args(argv) {
  const out={workspace:null,write:false,test:null,objective:null,model:null,stateDir:null,contextFile:null,reportEvery:3,maxTurns:14,rounds:2};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--write')out.write=true;
    else {const map={'--workspace':'workspace','--test':'test','--objective':'objective','--model':'model','--state':'stateDir','--context-file':'contextFile','--report-every':'reportEvery','--max-turns':'maxTurns','--rounds':'rounds'};
      if(!map[argv[i]] || !argv[i+1] || argv[i+1].startsWith('--'))throw Error(`Opção inválida: ${argv[i]}`);
      out[map[argv[i]]]=argv[++i];
    }
  }
  if(!out.workspace)throw Error('Informe --workspace');
  if(out.write&&!out.test)throw Error('Para --write configure --test com comando permitido');
  return out;
}
function format(ev){if(ev.kind==='stream')return;const parts=[];if(ev.from)parts.push(`${ev.from} → ${ev.to}`);if(ev.id)parts.push(ev.id);if(ev.text)parts.push(ev.text);if(ev.message)parts.push(ev.message);if(ev.objective)parts.push(ev.objective);if(ev.error)parts.push(ev.error);if(ev.state)parts.push(ev.state);if(ev.path && ev.kind==='report')parts.push(`Relatório: ${ev.path}`);console.log(`[${new Date(ev.at).toLocaleTimeString('pt-BR')}] ${ev.kind}: ${parts.join(' | ').slice(0,1800)}`);}
let conf;
try{conf=args(process.argv.slice(2));}catch(e){console.error(e.message+'\n'+usage);process.exit(2)}
let office;
try {office=new Office({workspace:resolve(conf.workspace),write:conf.write,test:conf.test,rounds:conf.rounds,maxTurns:conf.maxTurns,reportEvery:conf.reportEvery,stateDir:conf.stateDir,contextFile:conf.contextFile,models:{default:conf.model},notify:format})}
catch(e){console.error('Não foi possível iniciar: '+e.message);process.exit(2)}
console.log(`AI Office | branch ${office.git.branch} | ${TEAM.agents.length} agentes | escrita ${conf.write} | memória ${office.store.dir}`);
console.log(usage);
let running=null;
function startMission(s){if(running){console.log('Já existe missão em curso');return}
  running=office.run(s).then(r=>console.log(`MISSÃO: ${r.status} — relatório ${r.report}`)).catch(e=>console.error('MISSÃO: '+e.message)).finally(()=>{running=null;});
}
if(conf.objective)startMission(conf.objective);
const rl=createInterface({input:process.stdin,output:process.stdout,terminal:!!process.stdin.isTTY});
rl.on('line',line=>{
  const s=line.trim();if(!s)return;
  try{
    if(s==='/quit'){if(running){console.log('Use /stop antes de sair');return}rl.close();return}
    if(s==='/status')return console.log(JSON.stringify(office.getSnapshot(),null,2));
    if(s==='/report'){office.saveReport();return console.log(readFileSync(office.store.path('report.md'),'utf8'))}
    if(s==='/pause')return office.pause();
    if(s==='/resume')return office.resumeWork();
    if(s==='/stop')return office.stop();
    if(s.startsWith('/memory ')){const id=s.split(' ')[1];if(!TEAM.agents.some(a=>a.id===id))throw Error('Agente não encontrado');return console.log(office.store.memory(id));}
    if(s.startsWith('/start '))return startMission(s.slice(7));
    if(s.startsWith('/meeting '))return startMission('Reunião consultiva: '+s.slice(9));
    const m=s.match(/^\/to\s+([a-z][a-z0-9-]*)\s+(.+)$/i);if(m)return office.inject(m[1],m[2]);
    console.log('Comando desconhecido. '+usage);
  }catch(e){console.error('Erro: '+e.message)}
});
process.on('SIGINT',()=>{office.stop();console.log('Cancelamento solicitado.');});
