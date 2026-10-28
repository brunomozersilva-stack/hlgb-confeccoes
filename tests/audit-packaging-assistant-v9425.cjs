'use strict';
const fs=require('fs');
const path=require('path');
function read(p){return fs.readFileSync(path.join(process.cwd(),p),'utf8')}
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1}else console.log('PASS:',msg)}
const patch=read('release-packaging-assistant-stability-v9425.js');
const loader=read('release-auditor-restore-v9263.js');
ok(patch.includes("packagingType==='internal'"),'contagem mensal usa somente embalagem interna');
ok(patch.includes("sid(x.date).slice(0,7)===key"),'contagem mensal respeita o mês do registro');
ok(patch.includes('rows.reduce((a,x)=>a+q(x.doneQty),0)'),'peças feitas usam quantidade pronta, sem contador paralelo');
ok(patch.includes('packagingRole===true')&&patch.includes("includes('embalad')"),'seletor reconhece somente função de embaladeira');
ok(patch.includes("arr('employees').filter(employeeIsPacker)"),'modal de embalagem filtra embaladeiras cadastradas');
ok(patch.includes("packagingRole:desired"),'gerenciador grava a marca no cadastro real do funcionário');
ok(patch.includes("<option value=\"internal\"")&&patch.includes('>Interno</option>'),'modal oferece opção Interno');
ok(patch.includes("cur&&!oldType")&&patch.includes('Não informado (registro antigo)'),'registro antigo não vira interno automaticamente');
ok(patch.includes("id='hlgbAssistantSend9425'")||patch.includes("id='hlgbAssistantSend9425'"),'assistente define botão canônico único');
ok(patch.includes("buttons.forEach(b=>b.remove())"),'assistente remove botões de envio duplicados');
ok(!patch.includes('setInterval('),'patch v94.25 não usa polling por setInterval');
ok(!patch.includes('MutationObserver'),'patch v94.25 não adiciona MutationObserver');
ok(loader.includes('release-packaging-assistant-stability-v9425.js'),'carregador estável ativa v94.25');
ok(loader.includes('load9425()'),'carregador chama v94.25 no boot/ensure');
if(process.exitCode)process.exit(process.exitCode);
console.log('v94.25 static audit OK');
