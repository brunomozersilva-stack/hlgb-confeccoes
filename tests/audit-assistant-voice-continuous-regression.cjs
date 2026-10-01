const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-voice-continuous.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-voice-continuous.js'"));
let asks=0,rec;
function R(){rec=this;this.start=()=>this.onstart?.();this.stop=()=>this.onend?.();this.abort=()=>this.onend?.()}
const elems={};
const input={value:'',dispatchEvent(){},closest(){return null},parentElement:null};const answer={innerHTML:'old',dataset:{}};
elems.hlgbAssistantInput=input;elems.hlgbAssistantAnswer=answer;
const context={console,Event:function(){},SpeechSynthesisUtterance:function(){},setTimeout(fn){fn();return 0},setInterval(){return 1},alert(){},
 window:{SpeechRecognition:R,speechSynthesis:{cancel(){},speak(){}},hlgbAssistantAsk(){asks++}},
 document:{getElementById(id){return elems[id]||null},createElement(){return {id:'',style:{},dataset:{},innerHTML:'',querySelector(){return null}}}}};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbAssistantVoiceContinuous;assert(api);
api.start();assert.equal(asks,0);
rec.onresult({resultIndex:0,results:Object.assign([[{transcript:'Preciso que faça uma nota'}]],{length:1})});
assert.equal(asks,0,'partial speech must not submit automatically');
assert(input.value.includes('Preciso que faça uma nota'));
api.endAndSend();assert.equal(asks,1,'only explicit finish sends the request');
assert.equal(context.window.HLGB_ASSISTANT_VOICE_CONTINUOUS_GUARD,'2026.10.01-assistant-voice-continuous-v1');
console.log('PASS continuous voice: speaking is not submitted until user finishes.');