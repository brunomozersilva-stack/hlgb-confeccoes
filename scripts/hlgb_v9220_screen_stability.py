from pathlib import Path

src=Path('app9219.html')
out=Path('app9220.html')
s=src.read_text(encoding='utf-8')

# Evita redesenhar a aplicação inteira várias vezes durante a sincronização em tempo real.
# Isso preserva a posição da tela e agrupa várias atualizações recebidas quase juntas.
old_generic='''    // Para as demais telas mantemos a proteção antiga enquanto há um formulário/campo sendo editado.
    if(!cloudUserIsEditing()){
      renderAll();
      cloudRemoteUpdatePending=false;
      return true;
    }
    cloudRemoteUpdatePending=true;
    return false;'''
new_generic='''    // Para as demais telas, agrupa atualizações remotas para evitar a tela "pular".
    if(!cloudUserIsEditing()){
      if(typeof window.hlgbScheduleStableRender9220==='function')window.hlgbScheduleStableRender9220();
      else renderAll();
      cloudRemoteUpdatePending=false;
      return true;
    }
    cloudRemoteUpdatePending=true;
    return false;'''
if old_generic not in s:
    raise SystemExit('Bloco genérico de atualização remota não encontrado')
s=s.replace(old_generic,new_generic,1)

old_pull='''      if(!handled&&!cloudUserIsEditing()){
        const prev=cloudApplying;cloudApplying=true;try{renderAll();cloudRemoteUpdatePending=false}finally{cloudApplying=prev}
      }else if(!handled) cloudRemoteUpdatePending=true;'''
new_pull='''      if(!handled&&!cloudUserIsEditing()){
        if(typeof window.hlgbScheduleStableRender9220==='function')window.hlgbScheduleStableRender9220();
        else {const prev=cloudApplying;cloudApplying=true;try{renderAll();cloudRemoteUpdatePending=false}finally{cloudApplying=prev}}
      }else if(!handled) cloudRemoteUpdatePending=true;'''
if old_pull not in s:
    raise SystemExit('Bloco do polling normalizado não encontrado')
s=s.replace(old_pull,new_pull,1)

# Produtos e Folha também preservam a posição quando recebem atualização externa.
s=s.replace('''      if(typeof renderProducts==="function")renderProducts();''','''      if(typeof renderProducts==="function"){
        if(typeof window.hlgbStableRenderNow9220==='function')window.hlgbStableRenderNow9220(renderProducts);
        else renderProducts();
      }''',1)
s=s.replace('''      if(typeof renderPayroll==="function")renderPayroll();''','''      if(typeof renderPayroll==="function"){
        if(typeof window.hlgbStableRenderNow9220==='function')window.hlgbStableRenderNow9220(renderPayroll);
        else renderPayroll();
      }''',1)

addon=r'''<!-- HLGB_V9220_SCREEN_STABILITY_START -->
<script>
(function(){
'use strict';
let stableTimer9220=null;
let lastRequestedAt9220=0;

function captureFocus9220(){
  const el=document.activeElement;
  if(!el||!['INPUT','TEXTAREA','SELECT'].includes(el.tagName))return null;
  return {
    id:el.id||'', name:el.getAttribute('name')||'', tag:el.tagName,
    start:typeof el.selectionStart==='number'?el.selectionStart:null,
    end:typeof el.selectionEnd==='number'?el.selectionEnd:null
  };
}
function restoreFocus9220(info){
  if(!info)return;
  let el=null;
  if(info.id)el=document.getElementById(info.id);
  if(!el&&info.name){try{el=document.querySelector(`${info.tag.toLowerCase()}[name="${CSS.escape(info.name)}"]`)}catch(e){}}
  if(!el)return;
  try{
    el.focus({preventScroll:true});
    if(info.start!==null&&typeof el.setSelectionRange==='function')el.setSelectionRange(info.start,info.end);
  }catch(e){}
}
function stableRenderNow9220(fn){
  if(typeof fn!=='function')return false;
  const sx=window.scrollX||0, sy=window.scrollY||0;
  const page=document.querySelector('.page.active')?.id||'';
  const focus=captureFocus9220();
  const prev=typeof cloudApplying!=='undefined'?cloudApplying:false;
  try{
    if(typeof cloudApplying!=='undefined')cloudApplying=true;
    fn();
  }finally{
    if(typeof cloudApplying!=='undefined')cloudApplying=prev;
  }
  requestAnimationFrame(()=>{
    // Só restaura se a pessoa não trocou de página por vontade própria durante o redesenho.
    const current=document.querySelector('.page.active')?.id||'';
    if(!page||current===page){
      try{window.scrollTo(sx,sy)}catch(e){}
      restoreFocus9220(focus);
    }
  });
  return true;
}
function scheduleStableRender9220(){
  lastRequestedAt9220=Date.now();
  if(stableTimer9220)clearTimeout(stableTimer9220);
  stableTimer9220=setTimeout(()=>{
    stableTimer9220=null;
    // Nunca redesenha por trás de um modal ou enquanto a pessoa está digitando.
    if(document.querySelector('#modal.show')||(typeof cloudUserIsEditing==='function'&&cloudUserIsEditing())){
      try{cloudRemoteUpdatePending=true}catch(e){}
      return;
    }
    stableRenderNow9220(()=>{if(typeof renderAll==='function')renderAll()});
    try{cloudRemoteUpdatePending=false}catch(e){}
  },240);
  return true;
}
window.hlgbStableRenderNow9220=stableRenderNow9220;
window.hlgbScheduleStableRender9220=scheduleStableRender9220;

function stamp9220(){
  try{document.title='HLGB Confecções — Sistema de Gestão v92.20 Multiusuário'}catch(e){}
  const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.20';
}
if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(stamp9220,100),0);
setTimeout(stamp9220,650);
console.log('[HLGB] v92.20 estabilidade visual carregada');
})();
</script>
<!-- HLGB_V9220_SCREEN_STABILITY_END -->'''
pos=s.rfind('</body>')
if pos<0: raise SystemExit('Fechamento </body> não encontrado')
s=s[:pos]+addon+'\n'+s[pos:]

# Atualiza a identificação visual e referências da versão atual.
s=s.replace('v92.19','v92.20')
s=s.replace('app9219.html','app9220.html')

if 'HLGB_V9220_SCREEN_STABILITY_START' not in s:
    raise SystemExit('Marcador v92.20 ausente')
if 'hlgbScheduleStableRender9220' not in s or 'hlgbStableRenderNow9220' not in s:
    raise SystemExit('Helpers de estabilidade ausentes')
if old_generic in s or old_pull in s:
    raise SystemExit('Redesenho antigo ainda presente')

out.write_text(s,encoding='utf-8')
Path('abrir.html').write_text('''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abrindo HLGB Confecções v92.20</title><script>(function(){window.location.replace('./app9220.html?v=92.20&fresh='+Date.now())})();</script></head><body>Abrindo HLGB...</body></html>''',encoding='utf-8')
print('v92.20 preparada: sincronização remota agrupada, posição e foco preservados')
