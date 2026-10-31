const fs=require('fs');
const src=fs.readFileSync('release-auditor-rapid-learning-v9437.js','utf8');
const gate=fs.readFileSync('release-login-confirm-gate-v9407.js','utf8');
function must(rx,msg){if(!rx.test(src))throw new Error(msg)}
function gateMust(rx,msg){if(!rx.test(gate))throw new Error(msg)}
must(/const\s+V='94\.37'/,'versão 94.37 ausente');
must(/SAMPLE_MS=120000/,'amostragem rápida de 2 minutos ausente');
must(/FULL_LEARN_MS=600000/,'aprendizado profundo de 10 minutos ausente');
must(/setHours\(18,0,0,0\)/,'agenda local das 18h ausente');
must(/scheduledLocal:'18:00'/,'marcador de relatório das 18h ausente');
must(/render-jump/,'detector de salto por render ausente');
must(/hlgb_auditor_rapid_history_v9437/,'histórico rápido ausente');
must(/window\.__HLGB_AUTH_READY===true/,'gate de autenticação ausente');
must(/hlgbAuditorSingleAction9429\?\.downloadDaily/,'download do relatório não reutiliza autoridade atual');
for(const forbidden of [/supabase\.from\s*\(/,/hlgbRecordSaveWithRetry\s*\(/,/persistDb\s*\(/,/localSaveOnly\s*\(/]){
 if(forbidden.test(src))throw new Error('v94.37 não pode gravar dado de negócio: '+forbidden);
}
gateMust(/release-auditor-rapid-learning-v9437\.js/,'gate não carrega v94.37');
gateMust(/if\(window\.__HLGB_AUTH_READY!==true\)return false;/,'loader 94.37 não está protegido por autenticação');
console.log('AUDITOR_RAPID_V9437_STATIC_OK');
