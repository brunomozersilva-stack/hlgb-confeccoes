const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of ['release-hub-editor-v9270.js','release-assistant-draft-v9270.js','release-safety-gate-v9269.js','hlgb-canonical-sw.js'])assert.doesNotThrow(()=>new vm.Script(src(f),{filename:f}),f+' deve compilar');
const loader=src('app-stable3.html'),manifest=JSON.parse(src('release.json'));
assert(Number(manifest.version)>=93.72);assert(Number(manifest.minimum_version)>=93.11);assert.equal(manifest.entry,'abrir.html');
assert(loader.includes("navigator.serviceWorker.register('./hlgb-canonical-sw.js'"),'loader deve registrar o SW canônico atual');
assert(loader.includes("'release-hub-editor-v9270.js'"),'editor atual do Hub deve carregar');
assert(loader.includes("'release-assistant-fresh-query.js'"),'Assistente de precisão atual deve carregar');
assert(loader.includes("'release-safety-gate-v9269.js'"),'Safety Gate atual deve carregar');
assert(!loader.includes("'release-hub-editor-v9267.js','release-assistant-ui-v9269.js','release-assistant-draft-v9270.js'"),'sequência histórica antiga não pode voltar a ser a autoridade combinada');

const hub=src('release-hub-editor-v9270.js');
assert(hub.includes("const V='92.86'"));
assert(hub.includes('out===true||out?.applied===true||out?.ok===true||out?.success===true||out?.saved===true'),'editor deve aceitar confirmações válidas do salvamento');
assert(hub.includes('window.hlgbHubSaveConfirmed'),'editor deve usar a autoridade confirmada do Hub quando disponível');
assert(hub.includes('window.editHubFinanceEntry=open'));assert(hub.includes('window.quickEditHub9185=open'));

const draft=src('release-assistant-draft-v9270.js');
assert(!draft.includes('new MutationObserver'),'rascunho histórico deve continuar sem observer');
assert(draft.includes('__hlgbDraft9270'),'wrapper deve ser idempotente');
assert(draft.includes('Nada foi salvo no pedido real'),'rascunho nunca pode gravar pedido automaticamente');
const store=new Map();const ctx={console,setTimeout:()=>0,sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},document:{getElementById:()=>null,addEventListener:()=>{}},window:{db:{clients:[],orders:[],products:[]}}};ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext(draft,ctx);const api=ctx.window.hlgbAssistantDraft9270;assert(api,'API histórica do rascunho deve permanecer segura se carregada');assert.equal(api.handle('Bom dia, vou somando um pedido'),true);assert.equal(api.handle('Preto P10, 30M vermelho, 30P vermelho'),true);const d=api.read();assert(d&&d.active);assert.equal(d.items.reduce((a,x)=>a+x.qty,0),70);

const sw=src('hlgb-canonical-sw.js');assert(sw.includes("const CANONICAL='abrir.html'"));assert(sw.includes('Response.redirect(target.href,302)'));
const gate=src('release-safety-gate-v9269.js');assert(gate.includes('HLGB_AUDIT_READ_ONLY_ACTIVE'));assert(gate.includes('HLGB_PAID_AI_DISABLED=true'));
console.log('PASS compat atual: Hub editor único, rascunho histórico seguro e entrada canônica abrir.html validados.');
