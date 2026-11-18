'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const helper=require('./hlgb-loader-test-view-v9600.cjs');
const html=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'hlgb-modules/ownership-v9600.json'),'utf8'));
test('As verificações históricas leem os scripts REAIS, não outra lista editável',()=>{
 const files=helper.scripts(html),view=helper(html);
 assert.deepEqual(files,manifest.releaseScripts,'lista antiga sintética deve refletir exatamente o carregador');
 assert.equal(view.split(',').length,files.length);
 assert.equal(new Set(files).size,files.length);
 for(const f of files)assert.ok(view.includes("'"+f+"'"),'script faltando no test adapter: '+f);
 assert.equal(view.includes("'release-assistant-server-v9266.js'"),false,'não incluir scripts não presentes');
});
