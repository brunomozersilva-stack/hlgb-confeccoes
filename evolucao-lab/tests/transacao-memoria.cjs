'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const tx=require('../simulador-transacao-memoria.js');
const moduleCode=fs.readFileSync(path.resolve(__dirname,'../simulador-transacao-memoria.js'),'utf8');
const html=fs.readFileSync(path.resolve(__dirname,'../transacoes-simuladas.html'),'utf8');
function comp(id='CMD-C-001',rev=3,sourceRev=7,cents=300){
 return {commandId:id,moduleId:'acertos',kind:'compensate',actorId:'FIN-TEST',expectedRevision:rev,payloadSchemaVersion:1,
 payload:{groupId:'AC-101',sourceGroupId:'AC-099',expectedSourceRevision:sourceRev,correctionId:'CORR-099',cents}};
}
function pay(id='CMD-P-001',rev=4,receipt=true){
 return {commandId:id,moduleId:'acertos',kind:'pay',actorId:'FIN-TEST',expectedRevision:rev,payloadSchemaVersion:1,
 payload:{groupId:'AC-101',date:'2026-11-14',method:'PIX',receipt:receipt?{id:'PDF-DEMO',name:'comprovante-ficticio.pdf',mime:'application/pdf',size:2048}:undefined}};
}
test('estado inicial fictício possui pendente, pago, saldo e comprovante histórico',()=>{
 const lab=tx.createLab(),s=lab.snapshot();
 assert.equal(s.groups['AC-101'].status,'Pendente');
 assert.equal(s.groups['AC-101'].revision,3);
 assert.equal(tx.total(s.groups['AC-101']),2800);
 assert.equal(s.groups['AC-099'].receipts[0].id,'PDF-ANTERIOR');
 assert.equal(s.hub.length,1);
 assert.equal(s.events.length,0);
});
test('transação de compensação atualiza origem e destino no mesmo commit',()=>{
 const lab=tx.createLab();
 const outcome=lab.submit(comp());
 assert.equal(outcome.status,'readback_confirmed');
 const s=lab.snapshot();
 assert.equal(s.groups['AC-099'].revision,8);
 assert.equal(s.groups['AC-101'].revision,4);
 assert.equal(s.groups['AC-099'].corrections[0].applications.length,2);
 assert.equal(s.groups['AC-101'].applications.length,1);
 assert.equal(tx.total(s.groups['AC-101']),2500);
 assert.equal(s.events.length,1);
 assert.equal(s.hub.length,1);
});
test('falha antes da transação não altera uma única linha',()=>{
 const lab=tx.createLab(),before=lab.snapshot();
 const r=lab.submit(comp(),{failureAt:'before_commit'});
 assert.equal(r.status,'rejected');
 assert.deepEqual(lab.snapshot(),before);
 assert.equal(lab.reconcile('CMD-C-001').status,'not_found');
});
test('perda de ACK após commit tem resultado inconclusivo e confirmação por releitura',()=>{
 const lab=tx.createLab();
 const first=lab.submit(comp(),{failureAt:'after_commit_before_ack'});
 assert.equal(first.status,'uncertain');
 const recorded=lab.snapshot();assert.equal(recorded.events.length,1);
 assert.equal(lab.reconcile('CMD-C-001').status,'readback_confirmed');
 const replay=lab.submit(comp());
 assert.equal(replay.status,'already_committed');
 assert.deepEqual(lab.snapshot(),recorded,'replay com mesmo ID não duplica');
});
test('mesmo ID com dados diferentes é rejeitado e não modifica histórico',()=>{
 const lab=tx.createLab();lab.submit(comp());const old=lab.snapshot();
 const r=lab.submit(comp('CMD-C-001',3,7,200));
 assert.equal(r.status,'rejected');assert.deepEqual(lab.snapshot(),old);
});
test('concorrência de revisão obsoleta é rejeitada sem sobrescrever valores',()=>{
 const lab=tx.createLab();lab.submit(comp());const old=lab.snapshot();
 const stale=lab.submit(comp('CMD-STALE',3,7,100));
 assert.equal(stale.status,'conflict');assert.deepEqual(lab.snapshot(),old);
 const other=lab.submit(comp('CMD-ANOTHER',4,7,100));
 assert.equal(other.status,'conflict');assert.deepEqual(lab.snapshot(),old);
});
test('crédito já aplicado em um destino não pode ser aplicado novamente',()=>{
 const lab=tx.createLab();lab.submit(comp());const old=lab.snapshot();
 const duplicate=lab.submit(comp('CMD-NEW',4,8,100));
 assert.equal(duplicate.status,'rejected');assert.deepEqual(lab.snapshot(),old);
});
test('compensação não pode ultrapassar saldo nem zerar total do acerto',()=>{
 for(const value of [301,2800,9999]){
 const lab=tx.createLab(),old=lab.snapshot(),r=lab.submit(comp('CMD-C-'+value,3,7,value));
 assert.equal(r.status,'rejected');assert.deepEqual(lab.snapshot(),old);
 }
});
test('pagamento gera apenas um Hub, baixa todas as linhas e preserva histórico',()=>{
 const lab=tx.createLab();lab.submit(comp());const before=lab.snapshot();
 const result=lab.submit(pay());
 assert.equal(result.status,'readback_confirmed');
 const after=lab.snapshot(),group=after.groups['AC-101'];
 assert.equal(after.hub.length,2);
 assert.equal(after.hub[1].valueCents,2500);
 assert.equal(group.status,'Pago');
 assert.equal(group.revision,5);
 assert.equal(group.lines.reduce((sum,x)=>sum+x.paidCents,0),2500);
 assert.ok(group.lines.every(x=>x.status==='Pago'&&x.paymentHistory.length===1));
 assert.equal(group.receipts[0].id,'PDF-DEMO');
 assert.deepEqual(after.groups['AC-099'].receipts,before.groups['AC-099'].receipts);
 assert.equal(after.events.length,2);
 assert.equal(lab.submit(pay()).status,'already_committed');
 assert.deepEqual(lab.snapshot(),after);
});
test('pagamento parcial na memória nunca deixa Hub sem baixa de linhas',()=>{
 const lab=tx.createLab();lab.submit(comp());
 const before=lab.snapshot(),outcome=lab.submit(pay('CMD-P-FAULT',4),{failureAt:'before_commit'});
 assert.equal(outcome.status,'rejected');assert.deepEqual(lab.snapshot(),before);
 const unknown=lab.submit(pay('CMD-P-UNCERTAIN',4),{failureAt:'after_commit_before_ack'});
 assert.equal(unknown.status,'uncertain');
 const after=lab.snapshot();
 assert.equal(after.hub.length,2);
 assert.ok(after.groups['AC-101'].lines.every(x=>x.status==='Pago'));
 assert.equal(lab.reconcile('CMD-P-UNCERTAIN').status,'readback_confirmed');
 assert.deepEqual(lab.snapshot(),after);
});
test('pagamento já concluído não gera saída financeira duplicada',()=>{
 const lab=tx.createLab();lab.submit(comp());lab.submit(pay());
 const before=lab.snapshot(),r=lab.submit(pay('CMD-P-SECOND',5));
 assert.equal(r.status,'rejected');assert.deepEqual(lab.snapshot(),before);
});
test('comprovante de tipo ou formato inválido não causa mutação',()=>{
 const lab=tx.createLab();lab.submit(comp());const before=lab.snapshot();
 const cmd=pay('CMD-P-INVALID',4);
 cmd.payload.receipt.mime='text/plain';
 assert.equal(lab.submit(cmd).status,'rejected');assert.deepEqual(lab.snapshot(),before);
});
test('estado devolvido ao navegador é cópia e não permite modificar a fonte',()=>{
 const lab=tx.createLab(),copy=lab.snapshot();
 copy.groups['AC-101'].revision=10000;copy.groups['AC-099'].receipts.length=0;copy.events.push({id:'fake'});
 assert.equal(lab.snapshot().groups['AC-101'].revision,3);
 assert.equal(lab.snapshot().groups['AC-099'].receipts.length,1);
 assert.equal(lab.snapshot().events.length,0);
});
test('o simulador não permite banco, rede ou armazenamento e a página embute o mesmo código',()=>{
 assert.match(html,/<!doctype html>/);
 const embedded=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1].trim());
 assert.equal(embedded.length,2);
 assert.equal(embedded[0],moduleCode.trim());
 assert.doesNotThrow(()=>new vm.Script(embedded[0]));
 assert.doesNotThrow(()=>new vm.Script(embedded[1]));
 for(const re of [/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/\bindexedDB\b/,
    /\blocalStorage\b/,/\bsessionStorage\b/,/\bsupabase\b/i,/\bcloudRequest\b/,/<script\b[^>]*\bsrc=/i,/<link\b[^>]*\bhref=/i])
   assert.equal(re.test(html),false,'acesso externo detectado: '+String(re));
 assert.match(html,/@media\(max-width:600px\)/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/Nenhum pagamento real/);
});
