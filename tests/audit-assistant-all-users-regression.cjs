const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-query.js'),'utf8');

const created=[];
const body={appendChild(el){created.push(el)}};
const context={
  console,
  db:{orders:[],clients:[],products:[],cuts:[],production:[],missingPieces:[],hubFinanceEntries:[],systemIssues:[],systemAuditRuns:[]},
  window:{},
  document:{
    readyState:'complete',
    head:{appendChild(){}},
    body,
    documentElement:body,
    getElementById(){return null},
    querySelectorAll(sel){ if(sel==='#nav .nav-group') return []; return []; },
    createElement(tag){ return {tagName:tag.toUpperCase(),style:{},setAttribute(){}}; }
  },
  localStorage:{getItem(){return null},setItem(){}},
  setTimeout(fn){ if(typeof fn==='function') fn(); return 0; },
  openModal(){},closeModal(){},
  money:v=>'R$ '+Number(v||0).toFixed(2),
  fmtDate:v=>v
};
vm.createContext(context);
vm.runInContext(src,context);
const btn=created.find(x=>x.id==='hlgbAssistantFloatingBtn');
assert(btn,'assistant must create a fallback button when Sistema menu is not visible');
assert.equal(btn.textContent,'🤖 Assistente HLGB');
assert.equal(typeof btn.onclick,'function');
assert.equal(context.window.hlgbAssistant.version,'2026.10.01-assistant-all-users-v2');
console.log('PASS assistant visibility: fallback button is available without Sistema menu.');
