const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-assistant-voice.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-assistant-voice.js'"));
let spoken='',started=false;
function FakeRec(){this.start=()=>{started=true;this.onstart?.()};this.stop=()=>{this.onend?.()}}
function Utterance(t){this.text=t;this.lang=''}
const input={value:'',closest(){return host}},answer={innerText:'Pedido 87 está em produção.'},host={insertAdjacentElement(){},parentElement:null};
const elements={hlgbAssistantInput:input,hlgbAssistantAnswer:answer};
const document={getElementById(id){return elements[id]||null},createElement(){return {id:'',style:{},innerHTML:'',querySelector(){return {onclick:null,disabled:false,title:'',textContent:''}}}}};
const window={SpeechRecognition:FakeRec,speechSynthesis:{cancel(){},speak(u){spoken=u.text}},openHlgbAssistant(){return true}};
const context={console,window,document,SpeechSynthesisUtterance:Utterance,setTimeout(fn){fn();return 0},setInterval(){return 1},alert(){},hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
assert(context.window.hlgbAssistantVoice,'voice API must load');
assert.equal(context.window.hlgbAssistantVoice.plainAnswer(),'Pedido 87 está em produção.');
context.window.hlgbAssistantVoice.speakAnswer();assert.equal(spoken,'Pedido 87 está em produção.');
context.window.hlgbAssistantVoice.toggleMic();assert.equal(started,true);
console.log('PASS Assistant voice: microphone and spoken-answer paths are available.');