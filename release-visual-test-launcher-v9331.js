/* HLGB v93.31 — lançador leve do teste visual. O executor só carrega após clique. */
(function(){
'use strict';
const V='93.31';
if(window.HLGB_VISUAL_TEST_LAUNCHER_9331)return;
window.HLGB_VISUAL_TEST_LAUNCHER_9331=V;
let loading=false,progressTimer=null;
function loggedIn(){try{const app=document.getElementById('appShell'),login=document.getElementById('loginScreen');return !!app&&(app.style.display==='block'||app.offsetParent!==null)&&(!login||login.style.display==='none'||login.offsetParent===null)}catch(e){return false}}
function auditorRoot(){
 const title=[...document.querySelectorAll('h1,h2,h3,strong,b')].find(el=>/Auditor\s*\/\s*Testador HLGB/i.test((el.textContent||'').trim()));
 if(!title)return null;
 return title.closest('.modalbox,[role="dialog"],.panel')||title.parentElement?.parentElement||title.parentElement;
}
function statusEl(root){let el=root?.querySelector('#hlgbVisualStatus9331');if(!el&&root){el=document.createElement('span');el.id='hlgbVisualStatus9331';el.className='sub';el.style.cssText='display:inline-block;margin:6px 8px;vertical-align:middle';root.appendChild(el)}return el}
function readProgress(){try{return JSON.parse(localStorage.getItem('hlgb_visual_test_progress_v9330')||'null')}catch(e){return null}}
function stopProgress(){if(progressTimer){clearInterval(progressTimer);progressTimer=null}}
function startProgress(root){stopProgress();const st=statusEl(root);progressTimer=setInterval(()=>{const p=readProgress();if(st)st.textContent=p?.label?'Etapa: '+p.label:'Executando teste visual…'},250)}
function loadRunner(){
 if(window.hlgbVisualTest9331?.run)return Promise.resolve(window.hlgbVisualTest9331);
 if(loading)return new Promise((resolve,reject)=>{let n=0,t=setInterval(()=>{n++;if(window.hlgbVisualTest9331?.run){clearInterval(t);resolve(window.hlgbVisualTest9331)}else if(n>80){clearInterval(t);reject(new Error('O executor visual não carregou.'))}},100)});
 loading=true;
 return new Promise((resolve,reject)=>{
   const s=document.createElement('script');s.src='./release-visual-test-v9331.js?fresh='+Date.now();s.async=true;
   s.onload=()=>{loading=false;window.hlgbVisualTest9331?.run?resolve(window.hlgbVisualTest9331):reject(new Error('O executor visual carregou sem iniciar.'))};
   s.onerror=()=>{loading=false;reject(new Error('Não foi possível carregar o executor visual.'))};
   document.head.appendChild(s);
 });
}
async function execute(root,runBtn,stopBtn){
 if(!loggedIn())return alert('Entre no sistema primeiro.');
 runBtn.disabled=true;runBtn.textContent='Carregando teste visual…';stopBtn.style.display='inline-block';
 const st=statusEl(root);if(st)st.textContent='Carregando executor sob demanda…';
 try{
   const api=await loadRunner();
   runBtn.textContent='Executando teste visual…';startProgress(root);
   await api.run();
 }catch(e){alert(String(e?.message||e));}
 finally{stopProgress();if(st)st.textContent='';runBtn.disabled=false;runBtn.textContent='👁️ Executar teste visual — somente leitura';stopBtn.style.display='none'}
}
function inject(){
 const root=auditorRoot();if(!root||root.querySelector('#hlgbVisualRun9331'))return !!root;
 const buttons=[...root.querySelectorAll('button')];const anchor=buttons.find(b=>/Teste visual completo/i.test(b.textContent||''))||buttons.find(b=>/Diagnóstico profundo do Hub/i.test(b.textContent||''))||null;
 const box=document.createElement('span');box.id='hlgbVisualControls9331';box.style.cssText='display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;margin:4px 0';
 const run=document.createElement('button');run.id='hlgbVisualRun9331';run.type='button';run.className='primary';run.textContent='👁️ Executar teste visual — somente leitura';
 const stop=document.createElement('button');stop.id='hlgbVisualStop9331';stop.type='button';stop.className='secondary';stop.textContent='Parar';stop.style.display='none';
 run.onclick=()=>execute(root,run,stop);stop.onclick=()=>{try{window.hlgbVisualTest9331?.stop?.();stop.disabled=true;stop.textContent='Parando…'}catch(e){}};
 box.append(run,stop);
 if(anchor?.parentElement)anchor.parentElement.appendChild(box);else root.appendChild(box);
 statusEl(root);
 return true;
}
function scheduleInject(){[0,80,250,700].forEach(ms=>setTimeout(inject,ms))}
document.addEventListener('click',e=>{const t=String(e.target?.textContent||'');if(/Auditor\s*\/\s*Testes|Auditor|Teste/i.test(t))scheduleInject()},{capture:true});
if(typeof window.hlgbAfterLogin==='function')window.hlgbAfterLogin(()=>setTimeout(scheduleInject,300),0);
else setTimeout(scheduleInject,1200);
window.hlgbVisualTestLauncher9331={version:V,inject,loadRunner};
console.info('[HLGB] lançador leve do teste visual v'+V+' ativo');
})();