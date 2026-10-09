/* HLGB v93.39 — autoridade única do replay WAL.
   Evita que o flush legado concorra com o replay confirmado v93.38.
   Não apaga fila, não cria registros e não ignora conflitos. */
(function(){
'use strict';
const V='93.39';
if(window.HLGB_WAL_SINGLE_AUTHORITY_9339)return;
window.HLGB_WAL_SINGLE_AUTHORITY_9339=V;
let original=null,installed=false,calls=0,lastAt='',lastResult=null;
function stamp(){try{const cur=parseFloat(String(window.HLGB_RELEASE_VERSION||'0'))||0;if(cur<93.39){window.HLGB_RELEASE_VERSION=V;const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v'+V}}catch(e){}}
function install(){
  const replay=window.hlgbWalConfirmedReplay9333;
  const legacy=window.hlgb955FlushSilent;
  if(!replay||typeof replay.run!=='function'||typeof legacy!=='function')return false;
  if(legacy.__hlgb9339)return true;
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
window.hlgbWalSingleAuthority9339={version:V,status:()=>({installed,calls,lastAt,lastResult,replayVersion:window.hlgbWalConfirmedReplay9333?.version||'',replayBusy:!!window.hlgbWalConfirmedReplay9333?.state?.busy}),install};
[100,400,900,1800,3500].forEach(ms=>setTimeout(maintain,ms));
const t=setInterval(()=>{maintain();if(installed)clearInterval(t)},500);
window.addEventListener('online',maintain);window.addEventListener('focus',maintain);
console.info('[HLGB] v'+V+' autoridade única do WAL ativa');
})();