import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args=process.argv.slice(2),ix=args.indexOf('--state');
if(ix<0 || !args[ix+1]){console.error('Uso: node monitor.mjs --state CAMINHO [--port 4860]');process.exit(2);}
const dir=resolve(args[ix+1]),pi=args.indexOf('--port');
const port=pi<0?4860:Number(args[pi+1]);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Porta inválida');
function read(name){try{return readFileSync(join(dir,name),'utf8');}catch{return null;}}
const page=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'monitor.html'),'utf8');
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'};
  if(req.method!=='GET'){res.writeHead(405,headers);res.end();return;}
  if(pathname==='/'){res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'});res.end(page);return;}
  if(pathname==='/api/state'){const s=read('snapshot.json');res.writeHead(s?200:404,{...headers,'Content-Type':'application/json'});res.end(s||'{"error":"no state"}');return;}
  if(pathname==='/api/events'){
    const lines=(read('events.jsonl')||'').trim().split('\n').filter(Boolean).slice(-250);
    const list=lines.flatMap(l=>{try{return [JSON.parse(l)]}catch{return []}});
    res.writeHead(200,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify(list));return;
  }
  res.writeHead(404,headers);res.end();
});
server.listen(port,'127.0.0.1',()=>console.log('Painel AI-to-AI: http://127.0.0.1:'+port+' | estado: '+dir));
