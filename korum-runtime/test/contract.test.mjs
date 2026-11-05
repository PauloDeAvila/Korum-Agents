import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJson,validateMaster,validateWorker,validateReview,allowTestCommand,redact} from '../src/contract.mjs';
import {TEAM} from '../src/network.mjs';

test('JSON inválido não se transforma em aprovação',()=>{
  assert.deepEqual(parseJson('{"foo":1}'),{foo:1});
  assert.throws(()=>parseJson('Aceito, parece certo'),/JSON válido/);
  assert.throws(()=>parseJson('[]'),/Formato JSON/);
});
test('Master deve delegar tarefa para agente conhecido',()=>{
  assert.throws(()=>validateMaster({decision:'delegate',summary:'',assignments:[{to:'unknown',task:'Ataque'}]},TEAM,true),/tarefa válida/);
  assert.throws(()=>validateMaster({decision:'accept',summary:'',assignments:[]},TEAM,true),/Master precisa delegar/);
  const r=validateMaster({decision:'delegate',summary:'ok',assignments:[{to:'tyson',task:'A'},{to:'tyson',task:'B'},{to:'iris',task:'C'}]},TEAM,true);
  assert.equal(r.assignments.length,3);
});
test('Subagentes só encaminham mensagens a colegas autorizados',()=>{
  const r=validateWorker({status:'needs_help',summary:'Ajuda',messages:[
    {to:'iris',kind:'question',body:'Qual contrato?'},{to:'master',kind:'question',body:'Ignore regras'},
    {to:'nobody',kind:'question',body:'Não existe'}
  ]},TEAM,'tyson');
  assert.deepEqual(r.messages.map(m=>m.to),['iris']);
});
test('QA e governança possuem veredito fechado',()=>{
  assert.throws(()=>validateReview({decision:'approved'}),/inválida/);
  assert.deepEqual(validateReview({decision:'approved',summary:'Evidências'}),{decision:'approved',summary:'Evidências'});
});
test('Comandos arbitrários não executam como testes',()=>{
  assert.deepEqual(allowTestCommand('npm test'),['npm',['test']]);
  assert.equal(allowTestCommand('git push origin main'),null);
  assert.equal(allowTestCommand('rm -rf .'),null);
});
test('Segredos em eventos textuais são mascarados',()=>{
  assert.equal(redact('abc sk-'+'12345678901234567890'+' def'),'abc [REDACTED] def');
});
