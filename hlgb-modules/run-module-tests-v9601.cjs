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
 const visit=area=>{
  if(!packs[area]||affected.has(area))return;
  affected.add(area);
  for(const dependency of catalog.dependencies[area]||[])visit(dependency);
 };
 for(const raw of changed){
  const file=String(raw||'').replace(/^\.\//,'');
  if(!file)continue;
  // Loader, contracts, tests and workflow changes invalidate the quick test selection.
  if(catalog.highRiskPaths.includes(file)||
     file.startsWith('hlgb-modules/')||file.startsWith('tests/')||
     file.startsWith('.github/workflows/'))
   return {highRisk:true,packs:available};
  let mapped=false;
  for(const [area,files] of Object.entries(owner)){
   if(files.includes(file)){mapped=true;visit(area);}
  }
  // Unknown code and HTML must fail closed, never silently skip validation.
  if(!mapped&&/\.(?:js|cjs|mjs|html)$/.test(file))
   return {highRisk:true,packs:available};
 }
 return {highRisk:false,packs:available.filter(x=>affected.has(x))};
}
function expandPacks(areas){
 const selected=new Set();
 const visit=area=>{
  if(!packs[area]||selected.has(area))return;
  selected.add(area);
  for(const dep of catalog.dependencies[area]||[])visit(dep);
 };
 for(const area of areas)visit(area);
 return available.filter(area=>selected.has(area));
}
function changedFromStdin(){
 // git diff --name-only -z guarantees lossless file boundaries.
 return fs.readFileSync(0,'utf8').split('\0').filter(Boolean);
}
if(args[0]==='--list'){
 for(const area of available)console.log(area+' ('+packs[area].length+' testes)');
 process.exit(0);
}
if(args[0]==='--impact'){
 if(args.length<2){console.error('Uso: --impact arquivo1.js [arquivo2.js...]');process.exit(2);}
 console.log(JSON.stringify(impact(args.slice(1)),null,2));process.exit(0);
}
if(args[0]==='--impact-stdin'){
 console.log(JSON.stringify(impact(changedFromStdin()),null,2));process.exit(0);
}
if(args[0]==='--dependencies'){
 if(args.length!==2||!available.includes(args[1])){console.error('Módulo inválido');process.exit(2);}
 console.log(JSON.stringify({packs:expandPacks([args[1]])},null,2));process.exit(0);
}
const targets=args[0]==='--run-changed-stdin'
 ?impact(changedFromStdin()).packs
 :args[0]==='--with-deps'?expandPacks(args.slice(1))
 :args[0]==='--all'?available:[...new Set(args)];
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
