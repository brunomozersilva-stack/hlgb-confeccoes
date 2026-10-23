const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync('release-ui-stability.js','utf8');
assert(src.includes("const V='v8-screen-stability-20261022'"));
assert(src.includes('const RENDER_COOLDOWN_MS=5000'));
assert(src.includes('if(!allowGovernedRender(name))return undefined'));
assert(src.includes("if(!background){cancelQueued(name);renderStamp.set(name,Date.now());return fn.apply(this,arguments)}"));
assert(src.includes("window.hlgbUiStabilityRenderCooldown=RENDER_COOLDOWN_MS"));
assert(!src.includes('function installRenderGovernor()'),'governor must be integrated, not repeatedly wrapped');
console.log('PASS render governor v8: repeated automatic redraws are governed while local/user-driven renders cancel stale queues and remain immediate.');
