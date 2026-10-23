const fs=require('fs');
const assert=require('assert');

const shell=fs.readFileSync('release-auditor-shell-v9382.js','utf8');
const intelligence=fs.readFileSync('release-auditor-intelligence-v9396.js','utf8');

const buttonId='hlgbAuditorIntelligenceBtn9396';
const downloadId='hlgbAuditorIntelligenceDownload9396';

assert(intelligence.includes(`b.id='${buttonId}'`),'Inteligência deve continuar compatível com criação tardia');
assert(intelligence.includes(`id="${downloadId}"`),'Inteligência deve criar o botão de download');

const keepMatch=shell.match(/const KEEP=new Set\(\[([\s\S]*?)\]\);/);
assert(keepMatch,'Auditor Shell deve possuir a lista KEEP');
assert(keepMatch[1].includes(`'${buttonId}'`),'Shell deve permitir o botão Inteligência');
assert(keepMatch[1].includes(`'${downloadId}'`),'Shell deve permitir o download da Inteligência');

const styleMatch=shell.match(/st\.textContent=\[([\s\S]*?)\]\.map/);
assert(styleMatch,'Auditor Shell deve possuir a lista visual de ações');
assert(styleMatch[1].includes(`#${buttonId}`),'CSS do Shell deve manter o botão Inteligência visível');
assert(styleMatch[1].includes(`#${downloadId}`),'CSS do Shell deve manter o download da Inteligência visível');

assert(shell.includes(`<button id="${buttonId}" class="secondary" type="button">🧠 Inteligência</button>`),'Inteligência deve nascer na barra oficial do Shell');
assert(!shell.includes(`<button id="${buttonId}" class="secondary" type="button" onclick=`),'Botão oficial não deve usar onclick inline, pois o filtro antigo o classificava como legado');
assert(shell.includes("function retireLegacyActionFilter()"),'Shell deve aposentar o filtro genérico antigo ao assumir a interface');
assert(shell.includes("document.getElementById('hlgbAuditorLegacyHide9368')"),'Shell deve localizar a regra antiga responsável pelo conflito');
assert(shell.includes("b.removeAttribute?.('onclick')"),'Binding da Inteligência deve retirar onclick inline legado');
assert(shell.includes("b.style.setProperty?.('display','inline-block','important')"),'Binding oficial deve preservar visibilidade contra CSS legado');
assert(shell.includes('bindIntelligence();\n return true;'),'Normalização oficial deve reafirmar a ação sem criar novo timer/observer');
assert(shell.includes('el.hidden=!keep'),'Teste pressupõe que o Shell controla visibilidade pelo KEEP');

console.log('AUDITOR_INTELLIGENCE_BUTTON_V9396_OK',JSON.stringify({buttonId,downloadId,officialShellAction:true,legacyFilterRetired:true}));
