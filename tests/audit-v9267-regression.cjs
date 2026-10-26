const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of ['release-hub-editor-v9267.js','release-hub-editor-v9270.js','release-assistant-ui-v9269.js','release-assistant-ui-light-v9277.js','release-safety-gate-v9269.js'])assert.doesNotThrow(()=>new vm.Script(src(f),{filename:f}),f+' deve compilar');

const guard=src('release-hub-editor-v9267.js');
assert(guard.includes("const V='92.83'"),'arquivo histórico agora deve atuar como guarda de desempenho v92.83');
assert(guard.includes("disabled:true,replacedBy:'release-hub-editor-v9270.js',guardActive:true"),'guarda antiga deve declarar explicitamente o editor substituto');
assert(guard.includes('function editing()'),'guarda deve respeitar edição em andamento');
assert(guard.includes('if(editing())return false'),'organização do Hub não pode disputar com o editor');

const hub=src('release-hub-editor-v9270.js');
assert(hub.includes("const V='92.86'"),'editor atual deve declarar v92.86');
assert(hub.includes('window.hlgbHubSaveConfirmed'),'editor deve preferir autoridade confirmada do Hub');
assert(hub.includes('window.editHubFinanceEntry=open'));assert(hub.includes('window.quickEditHub9185=open'));
assert(hub.includes('out===true||out?.applied===true||out?.ok===true||out?.success===true||out?.saved===true'),'editor deve aceitar respostas válidas de confirmação');

const compat=src('release-assistant-ui-v9269.js');
assert(compat.includes("version:'92.78',disabled:true,replacedBy:'release-assistant-ui-light-v9277.js'"),'UI pesada antiga deve ser somente compatibilidade');
const light=src('release-assistant-ui-light-v9277.js');assert(light.includes("const V='92.77'"));assert(light.includes('Assistente compacto e leve para Safari'));

const loader=src('app-stable3.html');
assert(loader.includes("'release-hub-editor-v9267.js','release-hub-editor-v9270.js'"),'guarda deve carregar antes do editor atual');
assert(loader.includes("'release-assistant-ui-v9269.js'"),'stub de compatibilidade pode permanecer no loader');
assert(!loader.includes("'release-assistant-server-v9266.js'"),'IA paga opcional não deve carregar');
assert(loader.lastIndexOf("'release-hub-editor-v9270.js'")>loader.lastIndexOf("'release-hub-master-v9258.js'"),'editor atual deve carregar depois do master do Hub');
const manifest=JSON.parse(src('release.json'));assert(Number(manifest.version)>=93.72);assert.equal(manifest.entry,'abrir.html');
console.log('PASS compat atual: v9267 é guarda sem edição; v9270 é editor único e UI pesada do Assistente está desativada.');
