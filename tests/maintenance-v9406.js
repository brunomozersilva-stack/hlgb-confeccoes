const fs=require('fs');
const vm=require('vm');
function ok(v,msg){if(!v)throw new Error(msg)}

// 1) O gate v94.07 é estrutural: carrega no <head> antes do app e não depende
//    de localizar uma sequência exata do fluxo de sessão restaurada.
const loader=fs.readFileSync('app-stable3.html','utf8');
const base=fs.readFileSync('app9240.html','utf8');
const gate=fs.readFileSync('release-login-confirm-gate-v9407.js','utf8');
ok(base.includes('function doLogin(){'),'Função doLogin não encontrada no app base');
ok(loader.includes("window.HLGB_LOGIN_CONFIRM_GATE='94.07'"),'Marker do gate de login v94.07 ausente');
ok(loader.includes("const earlyLogin='<script src=\"./release-login-confirm-gate-v9407.js?fresh='"),'Gate v94.07 não está sendo injetado cedo no head');
ok(loader.indexOf('earlyLogin+earlyBrand+earlyBoot')>=0,'Ordem de carregamento não garante gate antes de tema/diagnóstico');
ok(loader.includes("'release-login-3d-baseline-v9407.js'"),'Base fresca da Impressora 3D v94.07 não está carregada');
ok(loader.includes("'release-diagnostics-maintenance-v9406.js'"),'Manutenção da Central v94.06 não está carregada');
ok(gate.includes("#appShell{display:none!important}"),'Gate v94.07 não bloqueia visualmente o painel antes da confirmação');
ok(gate.includes("#loginScreen{display:flex!important}"),'Gate v94.07 não mantém a tela de login visível');
ok(gate.includes("document.addEventListener('click',onAction,true)"),'Gate v94.07 não captura clique explícito de entrada');
ok(gate.includes("document.addEventListener('keydown',onAction,true)"),'Gate v94.07 não captura Enter explícito');
ok(!/MutationObserver/.test(gate),'Gate de login não deve adicionar MutationObserver ao boot');

// 2) Metadado automático não pode virar conflito; campo de negócio concorrente continua bloqueado.
const storage=new Map();
const localStorage={
 getItem:k=>storage.has(k)?storage.get(k):null,
 setItem:(k,v)=>storage.set(k,String(v)),
 removeItem:k=>storage.delete(k)
};
const context={
 console,
 localStorage,
 db:{cuts:[],production:[]},
 hlgbRecordSnapshots:{},
 window:{},
 setTimeout,clearTimeout,setInterval,clearInterval,
};
context.window.window=context.window;
context.window.localStorage=localStorage;
context.window.db=context.db;
context.window.cloudMergeThreeWay=(base,local,remote)=>({...remote,...local});
context.window.hlgbRecordSaveWithRetry=async(module,id,data)=>({applied:true,data,revision:1,updated_at:new Date().toISOString()});
context.hlgbRecordSnapshots=context.hlgbRecordSnapshots;
vm.createContext(context);
vm.runInContext(fs.readFileSync('release-record-integrity.js','utf8'),context,{filename:'release-record-integrity.js'});
const paths=context.window.hlgbRecordConflictPaths;
ok(typeof paths==='function','hlgbRecordConflictPaths indisponível');
const technical=paths(
 {filamentPriceKg:100,updatedAt:'A'},
 {filamentPriceKg:119,updatedAt:'B'},
 {filamentPriceKg:100,updatedAt:'C'}
);
ok(Array.isArray(technical)&&technical.length===0,'updatedAt ainda cria conflito falso: '+JSON.stringify(technical));
const real=paths(
 {filamentPriceKg:100,updatedAt:'A'},
 {filamentPriceKg:119,updatedAt:'B'},
 {filamentPriceKg:125,updatedAt:'C'}
);
ok(real.includes('filamentPriceKg'),'Conflito real de filamentPriceKg deixou de ser protegido: '+JSON.stringify(real));
const photoReal=paths(
 {photos:[{id:'a',data:'1'}],updatedAt:'A'},
 {photos:[{id:'a',data:'1'},{id:'b',data:'2'}],updatedAt:'B'},
 {photos:[{id:'a',data:'3'}],updatedAt:'C'}
);
ok(photoReal.some(x=>String(x).startsWith('photos')),'Conflito real de photos deixou de ser protegido: '+JSON.stringify(photoReal));
ok(context.window.HLGB_RECORD_CONFLICT_METADATA_GUARD==='v1','Marker do guard de metadados ausente');

// 3) A Central nova é somente leitura e não instala wrapper de save.
const diag=fs.readFileSync('release-diagnostics-maintenance-v9406.js','utf8');
new Function(diag);
ok(!/hlgbRecordSaveWithRetry\s*=/.test(diag),'Central v94.06 não pode substituir autoridade de save');
ok(!/persistDb\s*=/.test(diag),'Central v94.06 não pode substituir persistência');

// 4) O refresh da base 3D não pode assumir autoridade de save.
const three=fs.readFileSync('release-login-3d-baseline-v9407.js','utf8');
new Function(three);
ok(three.includes("load({preserveLocal:true,since:null})"),'3D v94.07 não atualiza a base preservando a edição local');
ok(!/window\.hlgbRecordSaveWithRetry\s*=/.test(three),'3D v94.07 não pode substituir autoridade de save');
ok(!/window\.cloudRequest\s*=/.test(three),'3D v94.07 não pode substituir transporte de nuvem');
ok(!/persistDb\s*=/.test(three),'3D v94.07 não pode criar persistência concorrente');

console.log(JSON.stringify({ok:true,loginGate:'94.07-structural',technicalConflict:technical,realConflict:real,photoConflict:photoReal,central:'read-only',printer3d:'fresh-base-delegated-save'}));