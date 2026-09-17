const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(require('path').join(__dirname,'..','release-limits.js'),'utf8');
let timers=[];
const context={
 console,
 db:{config:{weeklyPurchaseLimit:38000,weeklyPurchaseLimitRules:[{id:'old',value:38000}]},weeklyPurchaseLimits:[]},
 window:{},document:{createElement:()=>({}),head:{appendChild:()=>{}}},
 setTimeout:(fn)=>{timers.push(fn);return timers.length},
 hlgbAfterLogin:(fn)=>fn()
};
context.window.db=context.db;
vm.createContext(context);vm.runInContext(src,context);
let rules=context.window.ensureWeeklyPurchaseLimitRules();
assert.deepEqual(JSON.parse(JSON.stringify(rules)),[],'no normalized active rules must yield an empty rule list');
assert.equal(context.db.config.weeklyPurchaseLimit,0,'legacy scalar R$38k must be cleared when no normalized active limit exists');
assert.deepEqual(JSON.parse(JSON.stringify(context.db.config.weeklyPurchaseLimitRules)),[],'legacy rule cache must not resurrect deleted limit');
context.db.weeklyPurchaseLimits=[{id:'new-limit',value:25000,indefinite:true}];
rules=context.window.ensureWeeklyPurchaseLimitRules();
assert.equal(rules.length,1,'one normalized rule must produce one config rule');
assert.equal(rules[0].value,25000);
assert.notStrictEqual(rules[0],context.db.weeklyPurchaseLimits[0],'config rules must be copied, not alias the normalized records');
assert.equal(context.window.HLGB_LIMITS_MODULE,'normalized-only-v1');
console.log('PASS limits: deleted legacy R$38k cannot resurrect; normalized active rule remains authoritative.');
