// Adaptador oficial Codex SDK: uma sessão (thread) por agente, retomada entre as mensagens.
// Os testes simulados injetam um driver sem precisar de autenticação ou modelos.
export class CodexDriver {
  constructor({model=null}={}) {
    this.model=model;
    this.client=null;
  }
  async run({agent,prompt,threadId,workspace,write=false,onEvent=()=>{},signal}) {
    if(!this.client) {
      let Codex;
      try { ({Codex}=await import('@openai/codex-sdk')); }
      catch {throw Error('Codex SDK ausente. Execute npm install na pasta korum-runtime e autentique o Codex.');}
      this.client=new Codex();
    }
    const opts={
      workingDirectory:workspace,
      sandboxMode:write && agent.canEdit?'workspace-write':'read-only',
      approvalPolicy:'never',
      networkAccessEnabled:false,
      webSearchMode:'disabled',
      skipGitRepoCheck:false
    };
    if(this.model)opts.model=this.model;
    const thread=threadId?this.client.resumeThread(threadId,opts):this.client.startThread(opts);
    const {events}=await thread.runStreamed(prompt,{signal});
    let text='',usage=null,completed=false;
    for await(const event of events) {
      if(event.type==='item.completed') {
        if(event.item?.type==='agent_message')text=event.item.text??text;
        onEvent({type:'item',agentId:agent.id,itemType:event.item?.type||'unknown'});
      } else if(event.type==='turn.completed') {
        completed=true;usage=event.usage;
        onEvent({type:'usage',agentId:agent.id,usage});
      } else if(event.type==='turn.failed') {
        throw Error('Codex falhou: '+(event.error?.message||'erro desconhecido'));
      } else if(event.type==='thread.started') {
        onEvent({type:'session',agentId:agent.id,threadId:event.thread_id});
      }
    }
    if(!completed || !thread.id || !text.trim())throw Error('Turno Codex incompleto; resposta descartada');
    return {text,threadId:thread.id,usage};
  }
}
