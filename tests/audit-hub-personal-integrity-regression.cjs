const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-hub-personal-integrity.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-hub-personal-integrity.js'"),'loader must include Hub personal integrity guard');

const context={
 console,setTimeout(fn){fn();return 0},
 db:{hubFinanceEntries:[
   {id:'settings',kind:'hub_settings_v9137',categoriesOut:[
     {name:'Funcionários',personal:false,active:true},
     {name:'Gasto pessoal',personal:true,active:true}
   ],people:[{name:'Hagatha',active:true}]},
   {id:'term1',flow:'Saída',category:'Funcionários',subcategory:'Rescisão',person:'Arisergio Inacio Luiz',date:'2026-09-30',value:1582.02,sourceType:'termination'},
   {id:'personal1',flow:'Saída',category:'Gasto pessoal',person:'Maria',date:'2026-09-30',value:100}
 ]},
 window:{
   hlgb916HubForm(e){return '<div class="field" id="hubPersonWrap937" style=""><label>Pessoa da despesa pessoal</label><select id="hubEntryPerson"><option>Arisergio Inacio Luiz</option></select></div>'},
   renderHubFinance(){return true}
 },
 document:{getElementById(){return null}},
 table:()=>'',money:v=>String(v),esc:v=>String(v??''),
 hlgb916HubRange:()=>({start:'2026-09-29',end:'2026-10-05'})
};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbHubPersonalIntegrity;
assert(api,'Hub personal integrity API must load');
assert.equal(api.isPersonal('Gasto pessoal'),true);
assert.equal(api.isPersonal('Funcionários'),false);
const people=Array.from(api.personalPeople());
assert(people.includes('Hagatha'),'configured personal-expense person must remain');
assert(people.includes('Maria'),'person from actual personal expense must remain');
assert(!people.includes('Arisergio Inacio Luiz'),'termination employee must not enter personal-expense people list');
const rows=Array.from(api.personalEntriesForRange({start:'2026-09-29',end:'2026-10-05'}));
assert.equal(rows.length,1,'personal summary must count only actual personal category');
assert.equal(rows[0].id,'personal1');
const html=api.patchForm(context.window.hlgb916HubForm({flow:'Saída',category:'Gasto pessoal'}),{flow:'Saída',category:'Gasto pessoal'});
assert(!html.includes('Arisergio Inacio Luiz'),'new personal expense form must not offer terminated employee as personal person');

console.log('PASS Hub personal integrity: termination people excluded from personal-expense list and summary.');
