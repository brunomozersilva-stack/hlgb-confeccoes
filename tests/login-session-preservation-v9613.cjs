'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('app9240.html','utf8');
const begin=html.indexOf('function doLogin(){'),end=html.indexOf('async function logout()',begin);
assert.ok(begin>0&&end>begin,'real login legacy function present');
const source=html.slice(begin,end);
function simulate(shouldLogin){
 const elements={
  loginUser:{value:'fake@example.invalid'},loginPass:{value:'dummy',focus(){}},
  loginError:{textContent:'',style:{}},loginScreen:{style:{display:'flex'}},appShell:{style:{display:'none'}},
  sessionLoader:{style:{display:'none'}}
 };
 const ctx={window:{},document:{getElementById:id=>elements[id]||null},console:{error(){},log(){}},
  cloudAccessToken:'',cloudRefreshToken:'',cloudTokenExpiresAt:0,cloudUser:null,cloudReady:false,cloudRowId:null,
  stored:[],setCloudStatus(){},cloudStoreAuth(){ctx.stored.push({token:ctx.cloudAccessToken,refresh:ctx.cloudRefreshToken})},
  cloudSignIn:async()=>{if(!shouldLogin)throw Error('Invalid login credentials');
   ctx.cloudAccessToken='fresh_access';ctx.cloudRefreshToken='fresh_refresh';ctx.cloudUser={email:'fake@example.invalid'}},
  hlgbFastBootstrap9182:async()=>{throw new TypeError('Load failed')},Date,Math,Promise,
  clearTimeout, setTimeout,confirm:()=>false};
 ctx.window.HLGB_SESSION_BOOT_WATCHDOG=null;
 vm.createContext(ctx);vm.runInContext(source+';globalThis.invokeLogin=doLogin;',ctx);
 return {ctx,elements};
}
test('Auth succeeded then records Load failed: preserve session, keep login closed',async()=>{
 const {ctx,elements}=simulate(true);
 assert.equal(ctx.invokeLogin(),false);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ctx.cloudAccessToken,'fresh_access');
 assert.equal(ctx.cloudRefreshToken,'fresh_refresh');
 assert.equal(ctx.stored.length,1);
 assert.equal(elements.appShell.style.display,'none');
 assert.match(elements.loginError.textContent,/Autenticação confirmada.*carregar os dados/i);
 assert.match(elements.loginError.textContent,/sessão foi preservada/i);
});
test('Actual wrong credentials: unchanged login rejection behavior',async()=>{
 const {ctx,elements}=simulate(false);
 ctx.invokeLogin();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ctx.cloudAccessToken,'');assert.equal(ctx.cloudRefreshToken,'');
 assert.match(elements.loginError.textContent,/E-mail ou senha incorretos/i);
 assert.equal(elements.appShell.style.display,'none');
});
test('never auto-enter system on a failed post-auth load',()=>{
 assert.match(source,/authSucceededThisAttempt\s*&&\s*authenticated/);
 assert.doesNotMatch(source,/hlgbAutoEnterOnLoadFailed|localStorage\.clear\(\)/);
});