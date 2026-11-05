#!/usr/bin/env node
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const argv=process.argv.slice(2);const ix=argv.indexOf('--state');if(ix<0||!argv[ix+1]){console.error('Uso: node bridge.mjs --state CAMINHO [--port 4857]');process.exit(2)}
const stateDir=resolve(argv[ix+1]);const pi=argv.indexOf('--port');const port=pi>=0?Number(argv[pi+1]):4857;if(!Number.isInteger(port)||port<1||port>65535)throw Error('Porta inválida');
const template=`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>AI Office — OpenCode</title><style>
:root{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color-scheme:dark;background:#0e1320;color:#e2e8f0}*{box-sizing:border-box}body{margin:0;padding:24px;max-width:1300px;margin:auto}h1{color:#a5b4fc}h2{font-size:1rem}a{color:#93c5fd}.lead{color:#94a3b8}.status{border:1px solid #334155;border-radius:12px;padding:14px;margin:18px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:10px}.agent{border:1px solid #334155;border-radius:12px;padding:14px;background:#182236}.agent b{display:block;color:#bbf7d0}.agent small{display:block;color:#94a3b8;margin-top:8px}.feed{max-height:520px;overflow:auto;border:1px solid #334155;border-radius:12px;padding:12px;background:#111827}.event{padding:9px 0;border-bottom:1px solid #1e293b;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}.event .meta{color:#93c5fd;font-size:11px}.error{color:#fca5a5}button{padding:6px 12px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;border-radius:6px;cursor:pointer}</style><body><h1>AI Office · OpenCode</h1><p class="lead">Painel local experimental. Não é a interface pixel art do Habblaud — a conexão visual nativa ainda está no roadmap.</p><section class="status"><b id="state">Aguardando execução...</b><p id="objective"></p><small id="branch"></small></section><h2>Equipes e agentes</h2><section id="agents" class="grid"></section><h2>Comunicações recentes</h2><div class="feed" id="feed"></div><script>
const E=id=>document.getElementById(id);
function t(parent,tag,value,cls){const e=document.createElement(tag);e.textContent=String(value??'');if(cls)e.className=cls;parent.append(e);return e}
async function sync(){try{const [a,b]=await Promise.all([fetch('/api/ai-office/snapshot'),fetch('/api/ai-office/events')]);if(!a.ok)return;const s=await a.json(),ev=await b.json();E('state').textContent='Estado: '+s.state+' · Turnos: '+s.turnCount;E('objective').textContent=s.objective;E('branch').textContent='Branch: '+s.branch+' · escrita: '+s.write;E('agents').replaceChildren();for(const a of s.agents||[]){const n=document.createElement('div');n.className='agent';t(n,'b',a.name);t(n,'small',a.team);t(n,'small',a.role);t(n,'small',a.session?'Sessão ativa':'Sem sessão');E('agents').append(n)}E('feed').replaceChildren();for(const x of ev.slice(-100).reverse()){const n=document.createElement('div');n.className='event';t(n,'div',x.at+' · '+x.kind,'meta');t(n,'div',[x.from,x.to].filter(Boolean).join(' → ')+' '+(x.text||x.message||x.error||'').slice(0,1500));E('feed').append(n)}}catch(e){E('state').textContent='Sem conexão com o bridge: '+e.message}}sync();setInterval(sync,1500)
</script></body></html>`;
export function handler(req,res){
  const url=new URL(req.url,'http://localhost');
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  const read=(f)=>{try{return readFileSync(join(stateDir,f),'utf8')}catch{return null}};
  if(req.method!=='GET'){res.writeHead(405,headers);return res.end(JSON.stringify({error:'method not allowed'}))}
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});return res.end(template)}
  if(url.pathname==='/api/ai-office/snapshot'){const s=read('snapshot.json');res.writeHead(s?200:404,headers);return res.end(s||'{"error":"no snapshot"}')}
  if(url.pathname==='/api/ai-office/events'){const s=read('events.jsonl');const events=(s||'').split('\n').filter(Boolean).slice(-150).flatMap(line=>{try{return[JSON.parse(line)]}catch{return[]}});res.writeHead(200,headers);return res.end(JSON.stringify(events))}
  res.writeHead(404,headers);return res.end('{"error":"not found"}');
}
if(process.argv[1] && import.meta.url.endsWith('/bridge.mjs')){
  const server=http.createServer(handler);server.listen(port,'127.0.0.1',()=>console.log(`AI Office bridge: http://127.0.0.1:${port} | State: ${stateDir}`));
}
