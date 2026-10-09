/* HLGB v93.40 — autoridade única do replay WAL.
   Evita que o flush legado concorra com o replay confirmado v93.38.
   Mantém a autoridade durante toda a janela de boot para sobreviver a wrappers carregados depois.
   Não apaga fila, não cria registros e não ignora conflitos. */
(function(){
'use strict';
const V='93.40';
if(window.HLGB_WAL_SINGLE_AUTHORITY_9339){try{window.hlgbWalSingleAuthority9339?.install?.()}catch(e){}return}
window.HLGB_WAL_SINGLE_AUTHORITY_9339=V;
let original=null,installed=false,calls=0,lastAt='',lastResult=null,reinstalls=0;
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.40){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function install(){
  const replay=window.hlgbWalConfirmedReplay9333;
  const legacy=window.hlgb955FlushSilent;
  if(!replay||typeof replay.run!=='function'||typeof legacy!=='function')return false;
  if(legacy.__hlgb9339){installed=true;return true}
  if(installed)reinstalls++;
  original=legacy;
  const wrapped=async function(){
    calls++;lastAt=new Date().toISOString();
    try{
      if(replay.state?.busy){lastResult='replay-busy';return false}
      const out=await replay.run('legacy-flush-delegated',true);
      lastResult=out===true?'confirmed':'pending';
      return out;
    }catch(e){lastResult=String(e?.message||e);return false}
  };
  wrapped.__hlgb9339=true;wrapped.__hlgb9339Original=original;
  window.hlgb955FlushSilent=wrapped;installed=true;stamp();return true;
}
function maintain(){install();stamp()}
window.hlgbWalSingleAuthority9339={version:V,status:()=>({installed,calls,lastAt,lastResult,reinstalls,replayVersion:window.hlgbWalConfirmedReplay9333?.version||'',replayBusy:!!window.hlgbWalConfirmedReplay9333?.state?.busy}),install,maintain};
[100,400,900,1800,3500,6000,9000,12000,16000,20000].forEach(ms=>setTimeout(maintain,ms));
let tries=0;const t=setInterval(()=>{tries++;maintain();if(tries>=40)clearInterval(t)},500);
window.addEventListener('online',maintain);window.addEventListener('focus',maintain);
console.info('[HLGB] v'+V+' autoridade única do WAL ativa durante o boot');
})();