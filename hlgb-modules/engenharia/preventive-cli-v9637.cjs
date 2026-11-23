'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),api=require('./preventive-core-v9637.cjs');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const own=JSON.parse(read('hlgb-modules/ownership-v9600.json')),loader=read('app-stable3.html'),sources=Object.create(null);
for(const p of api.manifest(loader)){if(!/^[A-Za-z0-9_./-]+\.js$/.test(p)||p.startsWith('/')||p.split('/').includes('..'))throw Error('unsafe manifest path');const file=path.resolve(root,p);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.realpathSync(file).startsWith(root+path.sep))continue;sources[p]=read(p)}
const graph=api.map(loader,own,sources);
const base=process.argv[2],head=process.argv[3];if(!/^[a-f0-9]{40}$/.test(base||'')||! /^[a-f0-9]{40}$/.test(head||''))throw Error('provide exact base and head SHA');
const changed=cp.execFileSync('git',['diff','--name-status','-z','--no-renames',base,head,'--'],{cwd:root,encoding:'utf8'}).split('\0');const changes=[];
for(let i=0;i<changed.length-1;i+=2){const status={A:'added',M:'modified',D:'deleted',T:'modified'}[changed[i]];if(!status)throw Error('unsupported diff status');changes.push({status,path:changed[i+1]})}
const risk=api.impact(graph,changes);
const learned=api.learning(JSON.parse(read('hlgb-modules/engenharia/incident-cases-v9637.json')));
process.stdout.write(JSON.stringify({schema:'hlgb-preventive-v9637',base,head,graph,risk,learned},null,2)+'\n');
if(graph.findings.length)process.exitCode=1;
