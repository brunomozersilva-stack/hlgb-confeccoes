const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-voice.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-voice.js'"));
let spoken='',starts=0,cancels=0,asks=0;
const recs=[];
function FakeRec(){recs.push(this);this.start=()=>{starts++;this.onstart?.()};this.stop=()=>{this.onend?.()};this.abort=()=>{this.onend?.()}}
function Utterance(t){this.text=t;this.lang=''}
const input={value:'',closest(){return host},dispatchEvent(){}},answer={innerText:'Pedido 87 está em produção.'},host={insertAdjacentElement(){},parentElement:null};
const elements={hlgbAssistantInput:input,hlgbAssistantAnswer:answer};
const document={getElementById(id){return elements[id]||null},createElement(){return {id:'',style:{},innerHTML:'',querySelector(){return {onclick:null,disabled:false,title:'',textContent:''}}}}};
const window={SpeechRecognition:FakeRec,speechSynthesis:{cancel(){cancels++},speak(u){spoken=u.text;u.onstart?.()}},hlgbAssistantAsk(){asks++},openHlgbAssistant(){return true}};
const context={console,window,document,SpeechSynthesisUtterance:Utterance,Event:function(){},setTimeout(fn){fn();return 0},setInterval(){return 1},alert(){},hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbAssistantVoice;assert(api);
api.speakAnswer();assert.equal(spoken,'Pedido 87 está em produção.');api.stopSpeaking();assert(cancels>=1);
api.toggleMic();assert.equal(starts,1);
recs[0].onresult({results:[[{transcript:'onde está pedido 87'}]]});assert.equal(asks,1);
api.toggleMic();assert.equal(starts,2,'second microphone question must start a fresh recognition session');
recs[1].onresult({results:[[{transcript:'alterar pedido 87 para urgente'}]]});assert.equal(asks,2,'second spoken command must be submitted');
assert.equal(context.window.HLGB_ASSISTANT_VOICE_GUARD,'2026.10.01-assistant-voice-v2');
console.log('PASS Assistant voice v2: stop reading and repeated voice commands work.');