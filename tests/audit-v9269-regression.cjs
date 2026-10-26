const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of ['release-assistant-ui-v9269.js','release-assistant-ui-light-v9277.js','release-safety-gate-v9269.js'])assert.doesNotThrow(()=>new vm.Script(src(f),{filename:f}),f+' deve compilar');

const compat=src('release-assistant-ui-v9269.js');
assert(compat.includes("version:'92.78'"),'stub de compatibilidade deve declarar a versão atual do arquivo');
assert(compat.includes('HLGB_PAID_AI_DISABLED=true'));
assert(compat.includes("disabled:true,replacedBy:'release-assistant-ui-light-v9277.js'"),'Studio antigo deve permanecer desativado e apontar para UI leve');
assert(!compat.includes('new MutationObserver'),'stub de compatibilidade não deve observar/reconstruir a janela');

const light=src('release-assistant-ui-light-v9277.js');
assert(light.includes("const V='92.77'"));
assert(light.includes('Assistente compacto e leve para Safari'));
assert(light.includes('backdrop-filter:none!important'),'UI leve deve evitar filtros pesados no Safari');
assert(light.includes('@media(max-width:900px)'),'UI leve deve preservar adaptação mobile');
assert(!light.includes('new MutationObserver'),'UI leve não deve criar observer permanente');

const gate=src('release-safety-gate-v9269.js');
assert(gate.includes("s.src='./release-assistant-ui-light-v9277.js?fresh='"),'Safety Gate deve carregar a substituta leve');
assert(gate.includes('loadAssistantCanonical()'),'Assistente canônico deve continuar sendo a autoridade lógica');

const loader=src('app-stable3.html');
assert(loader.includes("'release-assistant-ui-v9269.js'"),'stub compatível pode permanecer no loader');
assert(loader.includes("'release-safety-gate-v9269.js'"),'gate atual deve estar no loader');
assert(!loader.includes("'release-assistant-ui-v9267.js'"));
assert(!loader.includes("'release-assistant-studio-v9268.js'"));
assert(!loader.includes("'release-assistant-server-v9266.js'"));
const manifest=JSON.parse(src('release.json'));assert(Number(manifest.version)>=93.72);assert.equal(manifest.entry,'abrir.html');
console.log('PASS compat atual: Studio pesado desativado, stub sem observers e UI leve/canônica assume o Assistente.');
