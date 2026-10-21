const fs=require('fs');
const vm=require('vm');
const code=fs.readFileSync('release-auditor-shell-v9382.js','utf8');
const timers=[];const listeners={};
function node(id=''){return {id,hidden:false,onclick:null,textContent:'',style:{setProperty(){}},classList:{contains(){return false}},setAttribute(){},removeAttribute(){},appendChild(){},querySelectorAll(){return[]},closest(){return null}}}
const styleNode=node('hlgbAuditorShellStyle9382');const nav=node('hlgbAuditorNavBtn');const open=node('hlgbAuditorOpenBtn');
const byId={hlgbAuditorNavBtn:nav,hlgbAuditorOpenBtn:open};
const document={
 head:{appendChild(){}},documentElement:{appendChild(){}},
 getElementById(id){return byId[id]||null},
 createElement(tag){if(tag==='style'){byId.hlgbAuditorShellStyle9382=styleNode;return styleNode}return node()},
 addEventListener(type,fn){listeners['doc:'+type]=fn}
};
const window={document,openModal(){},closeModal(){},addEventListener(type,fn){listeners[type]=fn}};
const context={window,document,console,setTimeout(fn,ms){timers.push({fn,ms});return timers.length},clearTimeout(){}};
vm.createContext(context);vm.runInContext(code,context,{filename:'release-auditor-shell-v9382.js'});
if(window.openHlgbAuditor)throw new Error('shell não deveria assumir autoridade antes das dependências smart');
window.hlgbAuditorSmartRun=()=>{};window.hlgbAuditorSmartProblem=()=>{};
const late=timers.find(x=>x.ms===6000);if(!late)throw new Error('retry de 6s não foi agendado');late.fn();
if(window.openHlgbAuditor!==window.hlgbAuditorShell9382.open)throw new Error('shell atual não assumiu autoridade após dependências tardias');
if(window.HLGB_AUDITOR_SHELL_AUTHORITY!=='93.82')throw new Error('autoridade atual não foi marcada');
if(nav.onclick!==window.hlgbAuditorShell9382.open||open.onclick!==window.hlgbAuditorShell9382.open)throw new Error('entradas não apontam para o shell atual');
console.log('OK shell atual assume autoridade mesmo quando smart fica pronto depois de 3s');
