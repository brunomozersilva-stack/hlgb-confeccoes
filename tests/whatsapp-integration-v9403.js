const fs=require('fs');
function ok(v,m){if(!v)throw new Error(m)}
const ui=fs.readFileSync('release-whatsapp-pilot-v9250.js','utf8');
const api=fs.readFileSync('supabase/functions/hlgb-whatsapp-api/index.ts','utf8');
const hook=fs.readFileSync('supabase/functions/hlgb-whatsapp-webhook/index.ts','utf8');
ok(ui.includes("const V='94.03'"),'versão 94.03 ausente');
ok(ui.includes('/functions/v1/hlgb-whatsapp-api'),'endpoint seguro ausente');
ok(ui.includes('hlgbAuditorWhatsappBtn9403'),'botão do Auditor ausente');
ok(ui.includes('WhatsApp Business Cloud API'),'rótulo Cloud API ausente');
for(const [name,re] of [['save wrapper',/window\.hlgbRecordSaveWithRetry\s*=/],['cloud wrapper',/window\.cloudRequest\s*=/],['persist wrapper',/window\.persistDb\s*=/],['permanent interval',/setInterval\s*\(/],['observer',/new\s+MutationObserver\s*\(/],['beforeunload',/beforeunload/],['meta secret client',/WHATSAPP_ACCESS_TOKEN|WHATSAPP_APP_SECRET|WHATSAPP_VERIFY_TOKEN/]])ok(!re.test(ui),'UI contém padrão proibido: '+name);
ok(api.includes("Deno.env.get('WHATSAPP_ACCESS_TOKEN')"),'API não lê token do ambiente');
ok(api.includes("Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')"),'API não lê phone id do ambiente');
ok(/action\s*===\s*'status'/.test(api)&&/action\s*!==\s*'send_text'/.test(api),'ações status/send_text ausentes');
ok(api.includes("saveRecord('whatsappOutbox'"),'log de saída ausente');
ok(hook.includes('hub.verify_token'),'verificação do webhook ausente');
ok(hook.includes('x-hub-signature-256'),'assinatura do webhook ausente');
ok(hook.includes("saveRecord('whatsappInbox'"),'inbox ausente');
ok(hook.includes("saveRecord('whatsappStatus'"),'status inbound ausente');
console.log(JSON.stringify({ok:true,version:'94.03',checks:'whatsapp secure integration'}));
