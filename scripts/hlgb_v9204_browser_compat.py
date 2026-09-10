from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
START='<!-- HLGB_V9204_START -->'
END='<!-- HLGB_V9204_END -->'
if START in s and END in s:
    a=s.index(START); b=s.index(END,a)+len(END); s=s[:a]+s[b:]

addon=r'''<!-- HLGB_V9204_START -->
<script id="hlgb-v9204-browser-compat">
(function(){
'use strict';
const AUTH_KEY='hlgb_supabase_auth_v1';
const ua=navigator.userAgent||'';
const isSafari=/Safari/i.test(ua)&&!/Chrome|CriOS|Chromium|Edg|OPR|FxiOS/i.test(ua);
let bootReleased=false;

function el(id){return document.getElementById(id)}
function appVisible(){const a=el('appShell');return !!(a&&getComputedStyle(a).display!=='none')}
function loginVisible(){const l=el('loginScreen');return !!(l&&getComputedStyle(l).display!=='none')}
function loaderVisible(){const l=el('sessionLoader');return !!(l&&getComputedStyle(l).display!=='none')}
function clearStaleAuth9204(){
  try{localStorage.removeItem(AUTH_KEY)}catch(e){}
  try{sessionStorage.removeItem(AUTH_KEY)}catch(e){}
  try{if(typeof cloudAccessToken!=='undefined')cloudAccessToken=''}catch(e){}
  try{if(typeof cloudRefreshToken!=='undefined')cloudRefreshToken=''}catch(e){}
}
function releaseToLogin9204(msg){
  if(appVisible())return false;
  clearStaleAuth9204();
  try{window.HLGB_SESSION_BOOT_CANCELLED=true}catch(e){}
  const loader=el('sessionLoader'),login=el('loginScreen'),app=el('appShell'),err=el('loginError');
  if(loader)loader.style.display='none';
  if(app)app.style.display='none';
  if(login)login.style.display='flex';
  if(err){err.textContent=msg||'A sessão anterior não respondeu. Entre novamente para continuar.';err.style.display='block'}
  try{el('loginUser')?.focus()}catch(e){}
  bootReleased=true;
  return true;
}
function inspectBoot9204(reason){
  if(appVisible()||loginVisible())return;
  if(loaderVisible())releaseToLogin9204('A sessão anterior demorou para responder. Entre novamente. Seus dados continuam preservados na nuvem.');
  else releaseToLogin9204('Não foi possível concluir a abertura automática. Entre novamente para acessar o sistema.');
}

// Safari/iOS pode restaurar uma página congelada pelo bfcache.
window.addEventListener('pageshow',function(ev){
  if(ev.persisted){setTimeout(()=>inspectBoot9204('pageshow'),900)}
});
// Chrome/Safari: se a inicialização automática ficar presa, sempre devolver a tela de login.
setTimeout(()=>inspectBoot9204('t6'),6000);
setTimeout(()=>inspectBoot9204('t10'),10000);

// Se o Safari voltar do segundo plano com sessão travada, não deixar loader infinito.
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='visible'&&isSafari)setTimeout(()=>inspectBoot9204('visible'),1200);
});

// Evita que uma falha de inicialização deixe tela branca sem alternativa de acesso.
window.addEventListener('error',function(ev){
  if(!appVisible()&&!loginVisible())setTimeout(()=>inspectBoot9204('error'),0);
});
window.addEventListener('unhandledrejection',function(){
  if(!appVisible()&&!loginVisible())setTimeout(()=>inspectBoot9204('rejection'),0);
});

// Mantém a versão visível correta em navegadores que restauram DOM antigo do cache.
function setVersion9204(){
  try{const x=document.querySelector('#appShell .logo small');if(x)x.textContent='v92.04'}catch(e){}
  try{document.title='HLGB Confecções — Sistema de Gestão v92.04 Multiusuário'}catch(e){}
}
setVersion9204();
window.addEventListener('pageshow',setVersion9204);
setTimeout(setVersion9204,800);
console.log('[HLGB] v92.04 compatibilidade Chrome/Safari carregada', {isSafari});
})();
</script>
<!-- HLGB_V9204_END -->'''

pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]
s=s.replace('v92.03','v92.04')
p.write_text(s,encoding='utf-8')
print('v92.04 aplicada',len(s))
