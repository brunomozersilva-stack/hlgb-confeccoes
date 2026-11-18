#!/usr/bin/env node
'use strict';
// Contratos isolados por domínio; não acessam Supabase comercial.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const catalog=require('./module-test-catalog-v9601.json');
const owner=require('./ownership-v9600.json').ownership;
const packs=catalog.packs,available=Object.keys(packs),args=process.argv.slice(2);
function impact(changed){
 const affected=new Set();
 for(const raw of changed){
  const file=String(raw||'').replace(/^\.\//,'');
  if(catalog.highRiskPaths.includes(file))return {highRisk:true,packs:available};
  for(const [area,files] of Object.entries(owner)){
   if(files.includes(file)&&packs[area]){
    affected.add(area);
    for(const dependency of catalog.dependencies[area]||[])affected.add(dependency);
   }
  }
  for(const [area,files] of Object.entries(packs))if(files.includes(file))affected.add(area);
 }
 return {highRisk:false,packs:available.filter(x=>affected.has(x))};
}
if(args[0]==='--list'){
 for(const area of available)console.log(area+' ('+packs[area].length+' testes)');
 process.exit(0);
}
if(args[0]==='--impact'){
 if(args.length<2){console.error('Uso: --impact arquivo1.js [arquivo2.js...]');process.exit(2);}
 console.log(JSON.stringify(impact(args.slice(1)),null,2));process.exit(0);
}
const targets=args[0]==='--all'?available:[...new Set(args)];
if(!targets.length||targets.some(area=>!available.includes(area))){
 console.error('Use --list, --impact, --all ou um módulo: '+available.join(', '));
 process.exit(2);
}
const started=Date.now(),results=[];
for(const area of targets){
 console.log('\n== HLGB: '+area+' ==');
 for(const file of packs[area]){
  const full=path.resolve(root,file);
  if(!full.startsWith(root+path.sep)||!fs.existsSync(full)){
   console.error('Teste ausente: '+file);process.exit(2);
  }
  const now=Date.now();
  const r=cp.spawnSync(process.execPath,[file],{
   cwd:root,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024,
   env:{...process.env,HLGB_TEST_MODULE:area}
  });
  const pass=r.status===0&&!r.error;
  results.push({area,file,pass,ms:Date.now()-now});
  console.log((pass?'PASS ':'FAIL ')+file+' ('+(Date.now()-now)+'ms)');
  if(!pass)console.error(((r.stdout||'')+'\n'+(r.stderr||'')+'\n'+(r.error?.message||'')).slice(-9000));
 }
}
const failed=results.filter(x=>!x.pass);
console.log('RESULTADO HLGB: '+(results.length-failed.length)+'/'+results.length+
 ' aprovados; '+failed.length+' falhas; '+(Date.now()-started)+'ms');
if(failed.length)process.exitCode=1;
