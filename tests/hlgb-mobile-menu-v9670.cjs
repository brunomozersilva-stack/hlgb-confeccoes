'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
const src=fs.readFileSync('release-mobile-friendly-v9512.js','utf8');
(async()=>{const browser=await(process.env.HLGB_BROWSER==='webkit'?webkit:chromium).launch();try{
 for(const width of [320,390,700]){
  const p=await browser.newPage({viewport:{width,height:800}});await p.route('**/*',r=>r.abort());
  await p.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="appShell"><nav id="nav"><div class="nav-group"><div class="nav-group-title">Produção</div><button id="cut">Corte Conjunto</button><button id="faction">Facções</button><div style="display:none"><button id="hidden">Financeiro restrito</button></div></div></nav><main><section class="page active"><article class="panel"><div class="toolbar"><label>Consulta longa<input type="text"></label><button>Consultar histórico detalhado de todos os acertos</button></div></article></section></main></div><div id="hlgbMobileNav9250"></div>');
  await p.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.__clicks=[];for(const id of ['cut','faction','hidden'])document.getElementById(id).onclick=()=>__clicks.push(id)});
  await p.addScriptTag({content:src});await p.getByRole('button',{name:'Abrir menu completo'}).click();const sheet=p.getByRole('dialog',{name:'Menu do HLGB'}),search=sheet.getByRole('searchbox',{name:'Buscar área do sistema'});
  await search.fill('producao faccoes');assert.equal(await sheet.getByRole('button',{name:'Facções',exact:true}).count(),1);assert.equal(await sheet.getByRole('button',{name:'Corte Conjunto',exact:true}).count(),0);assert.equal(await sheet.getByRole('button',{name:'Financeiro restrito'}).count(),0);
  await search.fill('sem correspondência');await sheet.getByText('Nenhuma área encontrada. Tente outro termo.').waitFor();
  await search.fill('faccoes');
  await p.evaluate(()=>{const b=[...document.querySelectorAll('.hlgb-mobile-link9513')].find(x=>x.textContent==='Facções');document.getElementById('faction').disabled=true;b.click()});
  assert.deepEqual(await p.evaluate(()=>__clicks),[]);
  await sheet.getByRole('button',{name:'Facções',exact:true}).waitFor({state:'detached'});
  await p.evaluate(()=>document.getElementById('faction').disabled=false);
  await sheet.getByRole('button',{name:'Facções',exact:true}).waitFor();
  assert.equal(await search.inputValue(),'faccoes');
  await sheet.getByRole('button',{name:'Facções',exact:true}).focus();
  await p.evaluate(()=>document.getElementById('faction').setAttribute('aria-hidden','true'));
  await sheet.getByRole('button',{name:'Facções',exact:true}).waitFor({state:'detached'});
  assert.equal(await p.evaluate(()=>document.activeElement.id),'hlgbMobileSheetSearch9513');
  await p.evaluate(()=>document.getElementById('faction').removeAttribute('aria-hidden'));
  await sheet.getByRole('button',{name:'Facções',exact:true}).waitFor();
  await search.fill('');
  await p.keyboard.press('Escape');assert.equal(await p.locator('#hlgbMobileSheet9513').getAttribute('aria-hidden'),'true');assert.equal(await p.evaluate(()=>document.activeElement.id),'hlgbMobileMenu9512');
  await p.getByRole('button',{name:'Abrir menu completo'}).click();await sheet.getByRole('button',{name:'Corte Conjunto',exact:true}).click();assert.deepEqual(await p.evaluate(()=>__clicks),['cut']);
  await p.getByRole('button',{name:'Abrir menu completo'}).click();await p.evaluate(()=>{window.__HLGB_AUTH_READY=false;window.dispatchEvent(new Event('hlgb:logout'))});assert.equal(await p.locator('#hlgbMobileSheet9513').getAttribute('aria-hidden'),'true');assert.equal(await p.locator('#hlgbMobileSheetLinks9513 button').count(),0);
  assert.equal(await p.evaluate(()=>document.querySelector('.page').scrollWidth<=document.querySelector('.page').clientWidth+2),true);
  await p.evaluate(()=>{const m=document.createElement('div');m.id='modal';m.className='modal';m.style.cssText='display:flex;position:fixed;inset:0';m.innerHTML='<div class="modalbox"><div class="toolbar"><div class="field" style="min-width:520px"><label>Quantidade conferida<input style="min-width:500px"></label></div><button style="min-width:420px">Salvar conferência detalhada</button></div></div>';document.body.append(m)});
  assert.equal(await p.locator('#modal .toolbar').evaluate(el=>el.scrollWidth<=el.clientWidth+2),true);
  assert.equal(await p.locator('#modal input').evaluate(el=>el.getBoundingClientRect().right<=innerWidth+2),true);
  await p.close()
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
