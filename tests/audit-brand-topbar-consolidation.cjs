'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const brand=fs.readFileSync('release-brand-theme-v9402.js','utf8');
const topbar=fs.readFileSync('release-night-ui-fixes.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');

assert.doesNotThrow(()=>new vm.Script(brand,{filename:'release-brand-theme-v9402.js'}),'tema ByHagatha deve compilar');
assert.doesNotThrow(()=>new vm.Script(topbar,{filename:'release-night-ui-fixes.js'}),'topbar clean deve compilar');

assert(brand.includes("const V='94.05'"),'tema deve declarar v94.05');
assert(brand.includes('#appShell::before{content:"";position:fixed;z-index:0;inset:0;'),'fundo deve cobrir o shell inteiro');
assert(!brand.includes('top:68px;left:250px;right:0;bottom:0'),'fundo não pode voltar a ser recortado por cabeçalho/sidebar');
assert(!brand.includes('@media(max-width:900px){#appShell::before{left:0;'),'mobile não deve precisar corrigir recorte lateral legado');
assert(brand.includes('ByHagatha'),'marca oficial deve permanecer ByHagatha');

assert(topbar.includes("const V='2026.10.26-topbar-clean-v3'"),'topbar deve declarar v3 consolidado');
assert(!topbar.includes('if(!host||host===header)return false'),'topbar não pode desistir quando cloudStatus é filho direto do header');
assert(topbar.includes('const candidate=cloud.parentElement;'),'topbar deve avaliar o host atual');
assert(topbar.includes("host=document.createElement('div');header.appendChild(host)"),'topbar deve criar host quando status vem direto no header');
assert(topbar.includes('else if(status.parentElement!==host)host.insertBefore(status,host.firstChild)'),'status existente deve ser reconciliado com o host único');
assert(topbar.includes('#appShell>header #cloudStatus,#appShell>header #currentUserLabel{position:static!important;'),'status e usuário não podem flutuar sobre controles');
assert(topbar.includes("const ids=['cloudSaveBtn','backupBtn','importBackupBtn']"),'ações técnicas devem continuar agrupadas no menu Ações');
assert(!/cloud\.textContent\s*=/.test(topbar),'autoridade visual do topbar não pode mudar o significado/texto do status da nuvem');

assert(loader.includes("'release-night-ui-fixes.js'"),'loader oficial deve carregar a autoridade de topbar');
assert(loader.includes('release-brand-theme-v9402.js'),'loader oficial deve carregar a autoridade de marca/fundo');
console.log('PASS consolidação visual: fundo global ByHagatha e status da nuvem encaixado no topbar sem nova autoridade.');
