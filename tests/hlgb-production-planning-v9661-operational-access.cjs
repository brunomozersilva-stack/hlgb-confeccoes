'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium,webkit}=require('playwright');
(async()=>{const browser=await (process.env.HLGB_BROWSER==='webkit'?webkit:chromium).launch();try{
 for(const width of [390,1280]){
 const p=await browser.newPage({viewport:{width,height:800}});await p.setContent('<style>.page:not(.active){display:none}</style><section class="page active" id="folhaPagamento"><h1>Folha</h1><section id="hlgbAttendance9658">Ponto</section><section id="hlgbRHLive9667">RH</section><section id="hlgbWorkers9659">Cadastro</section></section><section class="page" id="notas"><h1>Notas</h1><section id="hlgb-settlement-history-9654-cliente">Acertos</section></section>');
 await p.evaluate(()=>{window.__HLGB_AUTH_READY=false;window.__denied=[];window.currentUser=()=>({id:'fixture'});window.canOpenPage=id=>!window.__denied.includes(id);});
 const src=fs.readFileSync('hlgb-modules/producao/production-planning-view-v9661.js','utf8');await p.addScriptTag({content:src.slice(src.indexOf('(function installOperationalAccess9845'))});
 assert.equal(await p.locator('[aria-label="Atalhos de trabalho"]').count(),0);
 await p.evaluate(()=>{window.__HLGB_AUTH_READY=true;window.dispatchEvent(new Event('hlgb:authenticated'))});
 const bar=p.locator('#hlgb-operational-access-9845-folhaPagamento');await bar.waitFor();assert.equal(await bar.getByRole('button').count(),3);
 await bar.getByRole('button',{name:'Ponto e passagem',exact:true}).click();assert.equal(await p.locator('#hlgbAttendance9658').evaluate(x=>document.activeElement===x),true);
 await p.evaluate(()=>{window.__denied=['funcionarios'];window.hlgbOperationalAccess9845.refresh()});assert.equal(await bar.getByRole('button').count(),1);
 await p.evaluate(()=>{document.querySelector('#folhaPagamento').classList.remove('active');document.querySelector('#notas').classList.add('active')});const notes=p.locator('#hlgb-operational-access-9845-notas');await notes.waitFor();assert.equal(await bar.count(),0);
 await notes.getByRole('button',{name:'Histórico de acertos por cliente'}).click();assert.equal(await p.locator('#hlgb-settlement-history-9654-cliente').evaluate(x=>document.activeElement===x),true);
 await p.evaluate(()=>{window.__HLGB_AUTH_READY=false;window.dispatchEvent(new Event('hlgb:logout'))});assert.equal(await notes.count(),0);await p.close();
 }
 console.log('PASS atalhos das telas, permissão, foco, navegação e logout');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
