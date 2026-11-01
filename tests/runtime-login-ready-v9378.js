const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync('release-runtime-profiler-v9292.js','utf8');
let stored=null,ran=0,nextId=1;
const timers=new Map(),diagScripts=[];
const window={
  __HLGB_AUTH_READY:false,
  HLGB_RELEASE_VERSION:'93.0',
  hlgbAfterLogin(fn){stored=fn;return 'registered'},
  addEventListener(){},
  setInterval(fn){const id=nextId++;timers.set(id,fn);return id},
  clearInterval(id){timers.delete(id)},
  setTimeout(fn){fn();return nextId++},
  clearTimeout(){},
  console
};
window.window=window;
const app={querySelector(sel){return sel==='.page.active'?{}:null},getClientRects(){return []},style:{display:'none'}};
const appendDiag=s=>{diagScripts.push(s);return s};
const document={
  hidden:false,
  head:{appendChild:appendDiag},
  documentElement:{appendChild:appendDiag},
  createElement(tag){if(tag!=='script')return {tagName:String(tag||'').toUpperCase(),style:{},dataset:{}};return {tagName:'SCRIPT',src:'',async:true,dataset:{},onerror:null}},
  getElementById(id){return id==='appShell'?app:id==='loginScreen'?{}:null},
  querySelector(sel){if(sel==='#appShell .logo small')return {textContent:''};if(/^script\[data-hlgb-diag=/.test(sel))return null;return null},
  addEventListener(){}
};
const context={window,document,console,performance:{now:()=>0},Date,Error,Map,Set,String,Number,Math,Array,JSON,Object,Promise,setTimeout:window.setTimeout,setInterval:window.setInterval,clearInterval:window.clearInterval,getComputedStyle(){return {display:'none',visibility:'visible',opacity:'1'}}};
vm.createContext(context);vm.runInContext(src,context);
assert.strictEqual(diagScripts.length,2,'harness deve aceitar os dois scripts diagnósticos sem gerar exceção');
assert.strictEqual(window.hlgbLateLoginBridge9337.ready(),false,'dashboard .page.active não pode significar login concluído');
window.hlgbAfterLogin(()=>{ran++},0);
assert.strictEqual(ran,0,'callback não pode rodar antes da autenticação');
assert.strictEqual(typeof stored,'function','callback deve permanecer registrado no mecanismo legado');
window.hlgbLateLoginBridge9337.flush();
assert.strictEqual(ran,0,'flush não pode antecipar pós-login');
window.__HLGB_AUTH_READY=true;
window.hlgbLateLoginBridge9337.flush();
assert.strictEqual(ran,1,'callback deve rodar após a autoridade explícita de autenticação');
stored();
assert.strictEqual(ran,1,'callback deve continuar idempotente se o mecanismo legado disparar depois');
assert.strictEqual(window.hlgbLateLoginBridge9337.authority,'__HLGB_AUTH_READY');
console.log('runtime login ready v93.78: OK');
