/* HLGB v92.50 — simulador de permissões do futuro bot de WhatsApp */
(function(){
'use strict';
const V='2026.10.03-whatsapp-pilot-v9250';
const sid=v=>String(v??''),escSafe=v=>typeof esc==='function'?esc(v):sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])),clone=v=>{try{return structuredClone(v)}catch(e){return JSON.parse(JSON.stringify(v))}};
function arr(n){try{db[n]=Array.isArray(db[n])?db[n]:[];return db[n]}catch(e){return []}}
function upsert(module,row){const a=arr(module),i=a.findIndex(x=>sid(x.id)===sid(row.id));if(i>=0)a[i]=clone(row);else a.push(clone(row));try{localSaveOnly()}catch(e){}}
async function saveRow(module,row){
 if(typeof cloudEnsureFreshSession==='function')await cloudEnsureFreshSession(false);
 if(typeof window.hlgbRecordSaveWithRetry!=='function')throw new Error('Gravação multiusuário indisponível.');
 const r=await window.hlgbRecordSaveWithRetry(module,sid(row.id),clone(row),false);if(!r||r.applied!==true)throw new Error(r?.reason||'A nuvem não confirmou.');const v=r.data||row;upsert(module,v);return v;
}
function ensure(){
 const page=document.getElementById('config');if(!page||document.getElementById('whatsappPilot9250'))return;
 const p=document.createElement('div');p.id='whatsappPilot9250';p.className='panel';
 p.innerHTML='<h2>🧪 WhatsApp HLGB — piloto interno</h2><div class="sub"><b>Sem conexão com o WhatsApp real.</b> Este simulador serve para definir identidade e permissões antes de qualquer implantação.</div><div class="toolbar" style="margin-top:10px"><button class="primary" onclick="newWhatsappRule9250()">+ Regra de contato</button><button class="secondary" onclick="simulateWhatsapp9250()">Simular mensagem</button></div><div id="whatsappRules9250"></div>';
 page.appendChild(p);render();
}
window.newWhatsappRule9250=function(){
 openModal('Regra do piloto WhatsApp','<div class="grid"><div class="field"><label>Nome do contato</label><input id="waName9250"></div><div class="field"><label>Telefone/número</label><input id="waPhone9250"></div><div class="field"><label>Tipo</label><select id="waType9250"><option>Facção</option><option>Fornecedor</option><option>Cliente</option><option>Funcionário</option><option>Outro</option></select></div></div><div class="field"><label>Cadastro vinculado</label><input id="waEntity9250" placeholder="Ex.: Roseli / Fornecedor X"></div><div class="field"><label>Perguntas permitidas</label><textarea id="waAllow9250" placeholder="Ex.: próprios pagamentos; próprios serviços; próprio saldo"></textarea></div><div class="field"><label>Sempre exigir aprovação humana</label><textarea id="waApprove9250" placeholder="Ex.: negociação, divergência, cobrança"></textarea></div><button class="primary modalSave">Salvar regra</button>',async()=>{
   const name=document.getElementById('waName9250')?.value?.trim(),phone=document.getElementById('waPhone9250')?.value?.trim();if(!name||!phone)return alert('Informe nome e telefone.');
   const row={id:'wa-'+Date.now(),name,phone,type:document.getElementById('waType9250')?.value||'Outro',entity:document.getElementById('waEntity9250')?.value?.trim()||'',allowed:document.getElementById('waAllow9250')?.value?.trim()||'',approval:document.getElementById('waApprove9250')?.value?.trim()||'',mode:'pilot',createdAt:new Date().toISOString()};
   try{await saveRow('whatsappPilotRules',row);closeModal();render()}catch(e){alert('Falha ao salvar: '+(e?.message||e))}
 });
};
function render(){
 const box=document.getElementById('whatsappRules9250');if(!box)return;const rs=arr('whatsappPilotRules').map(x=>[escSafe(x.name),escSafe(x.phone),escSafe(x.type),escSafe(x.entity||'-'),escSafe(x.allowed||'-'),escSafe(x.approval||'-')]);box.innerHTML=rs.length?table(['Contato','Número','Tipo','Vínculo','Permitido','Exige aprovação'],rs):'<div class="empty">Nenhuma regra piloto cadastrada.</div>';
}
window.simulateWhatsapp9250=function(){
 const rules=arr('whatsappPilotRules');if(!rules.length)return alert('Cadastre uma regra primeiro.');
 openModal('Simular mensagem recebida','<div class="grid"><div class="field"><label>Contato</label><select id="waSimRule9250">'+rules.map(x=>'<option value="'+escSafe(x.id)+'">'+escSafe(x.name)+' — '+escSafe(x.type)+'</option>').join('')+'</select></div><div class="field"><label>Mensagem</label><input id="waSimMsg9250" placeholder="Ex.: quanto deu meu pagamento?"></div></div><div id="waSimOut9250" class="panel"></div><button class="primary" onclick="runWhatsappSim9250()">Analisar</button><button class="secondary modalSave">Fechar</button>',()=>closeModal());
};
window.runWhatsappSim9250=function(){
 const r=arr('whatsappPilotRules').find(x=>sid(x.id)===sid(document.getElementById('waSimRule9250')?.value)),msg=document.getElementById('waSimMsg9250')?.value||'',out=document.getElementById('waSimOut9250');if(!r||!out)return;
 const sensitive=/outra fac[cç][aã]o|outro fornecedor|salario|salário|margem|lucro|senha|divida|dívida|dados de outro|outro cliente/i.test(msg);
 out.innerHTML=sensitive?'<b>⛔ Bloqueado no piloto</b><br>Esta pergunta pode expor informação sensível ou de terceiros. Encaminhar para atendimento humano.':'<b>🟡 Resposta assistida</b><br>Contato identificado como '+escSafe(r.type)+' — '+escSafe(r.name)+'.<br><br>Pergunta: '+escSafe(msg)+'<br><br>No piloto, a resposta precisa de aprovação humana antes de qualquer envio.';
};
setTimeout(ensure,2200);setInterval(ensure,5000);
window.renderWhatsappRules9250=render;
window.hlgbWhatsappPilot9250={render};
console.info('[HLGB] '+V+' ativo');
})();