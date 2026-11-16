/* HLGB Evolução: registro de módulos opcionais do LAB. Nenhuma rede, storage ou escrita financeira. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HLGBLabModules=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const registry=new Map();
 const validId=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{1,59}$/.test(id);
 function register(module){
  if(!module||!validId(module.id)||typeof module.version!=='string'||typeof module.analyze!=='function')
   throw Error('Contrato do módulo inválido.');
  if(registry.has(module.id))throw Error('Módulo duplicado: '+module.id);
  registry.set(module.id,{id:module.id,version:module.version,
   analyze:module.analyze,enabled:true,failures:0,lastFailure:null});
  return module.id;
 }
 function setEnabled(id,enabled){
  const item=registry.get(id);
  if(!item)throw Error('Módulo não encontrado: '+id);
  if(typeof enabled!=='boolean')throw Error('Flag de módulo inválida.');
  item.enabled=enabled;return item.enabled;
 }
 function list(){
  return [...registry.values()].map(x=>({id:x.id,version:x.version,
   enabled:x.enabled,failures:x.failures,lastFailure:x.lastFailure}));
 }
 function call(id,method,document){
  const item=registry.get(id);
  if(!item)return {ok:false,reason:'missing',id};
  if(!item.enabled)return {ok:false,reason:'disabled',id};
  if(method!=='analyze')return {ok:false,reason:'unsupported',id};
  try{
   const data=item.analyze(document);
   if(!data||typeof data!=='object')throw Error('Resultado do módulo inválido.');
   return {ok:true,id,version:item.version,data};
  }catch(error){
   item.failures++;
   item.lastFailure=String(error&&error.message||error).slice(0,160);
   return {ok:false,reason:'error',id};
  }
 }
 return Object.freeze({register,setEnabled,list,call});
});
