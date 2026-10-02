const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync('release-ui-stability.js','utf8');
assert(src.includes('const RENDER_COOLDOWN_MS=1400'));
assert(src.includes('if(!allowGovernedRender(name))return undefined'));
assert(src.includes("if(!background){renderStamp.set(name,Date.now());return fn.apply(this,arguments)}"));
assert(src.includes("window.hlgbUiStabilityRenderCooldown=RENDER_COOLDOWN_MS"));
assert(!src.includes('function installRenderGovernor()'),'governor must be integrated, not repeatedly wrapped');
console.log('PASS render governor: repeated automatic redraws are blocked while user-driven renders remain immediate.');
