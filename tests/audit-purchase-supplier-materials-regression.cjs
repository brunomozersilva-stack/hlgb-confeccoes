const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','release-purchase-supplier-materials.js'),'utf8');
const loader=fs.readFileSync(path.join(__dirname,'..','app-stable3.html'),'utf8');
assert(loader.includes("'release-purchase-supplier-materials.js'"));
const context={console,setTimeout(){return 0},Event:function(){},db:{
 suppliers:[{id:'s1',name:'Rafael',products:[{name:'Romantic',unit:'Quilo',price:29.9},{name:'Tule',unit:'kg',price:40}]}],
 materials:[{id:'m1',name:'Romantic',unit:'kg',price:32.9}]
},window:{},document:{getElementById(){return null},querySelectorAll(){return []}},money:v=>'R$ '+Number(v).toFixed(2),hlgbAfterLogin:null};
vm.createContext(context);vm.runInContext(src,context);
const api=context.window.hlgbPurchaseSupplierMaterials;assert(api);
const rows=api.supplierProducts(context.db.suppliers[0]);
assert.equal(rows.length,2);assert.equal(rows[0].name,'Romantic');
assert.equal(context.window.HLGB_PURCHASE_SUPPLIER_MATERIALS_GUARD,'2026.10.01-purchase-supplier-materials-v1');
console.log('PASS purchase supplier materials: supplier-specific material choices load inside purchase notes.');