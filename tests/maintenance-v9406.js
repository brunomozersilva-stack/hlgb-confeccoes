const fs=require('fs');
const vm=require('vm');
function ok(v,msg){if(!v)throw new Error(msg)}

// 1) O gate de login precisa continuar apontando para trechos reais do app base.
const loader=fs.readFileSync('app-stable3.html','utf8');
const base=fs.readFileSync('app9240.html','utf8');
const autoOpenOld='loginScreen.style.display="none";sessionLoader.style.display="none";appShell.style.display="block";setTimeout(()=>window.hlgbMarkAuthenticated?.(),0);applyAccess();restoreNavGroups();';
ok(base.includes(autoOpenOld),'Trecho de autoabertura mudou no app base; gate v94.06 deixaria de funcionar');
ok(base.includes('function doLogin(){'),'Função doLogin não encontrada no app base');
ok(loader.includes("window.HLGB_LOGIN_CONFIRM_GATE='94.06'"),'Marker do gate de login v94.06 ausente');
ok(loader.includes('__HLGB_RESTORED_SESSION_READY'),'Sessão restaurada não está sendo mantida atrás do login');
ok(loader.includes('__HLGB_RESTORED_SESSION_ENTER'),'Ação explícita de Entrar não está ligada à sessão restaurada');
ok(loader.includes("'release-diagnostics-maintenance-v9406.js'"),'Manutenção da Central v94.06 não está carregada');

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

console.log(JSON.stringify({ok:true,loginGate:'94.06',technicalConflict:technical,realConflict:real,photoConflict:photoReal,central:'read-only'}));