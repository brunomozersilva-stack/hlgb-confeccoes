const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('app9240.html','utf8');
const block=html.match(/const HLGB_RECORD_MODULES=\[[\s\S]*?\];/)?.[0]||'';
const write=html.match(/const HLGB_RECORD_WRITE_AREA=\{[\s\S]*?\};/)?.[0]||'';
for(const mod of ['materials','colors','sizes','suppliers','factionMasters','productionLocations','machines','serviceTypes','weeklyPurchaseLimits']){
 assert(block.includes('"'+mod+'"'),'authoritative login/refresh must load '+mod);
}
for(const [mod,area] of [['materials','materiais'],['colors','cadastros'],['sizes','cadastros'],['suppliers','fornecedores'],['factionMasters','faccoes'],['productionLocations','producao'],['machines','producao'],['serviceTypes','producao'],['weeklyPurchaseLimits','financeiro']]){
 assert(write.includes(mod+':"'+area+'"'),mod+' must have the expected write area');
}
console.log('PASS catalog modules: all critical catalogs and weekly limits participate in authoritative record loading.');