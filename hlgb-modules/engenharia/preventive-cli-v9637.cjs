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
const plan=require('./test-priority-v9638.cjs');
const testMatrix=JSON.parse(read('hlgb-modules/engenharia/test-matrix-v9638.json'));
const available=[...new Set(Object.values(testMatrix).flat())].filter(p=>/^tests\/[A-Za-z0-9_./-]+\.(?:cjs|js)$/.test(p)&&!p.split('/').includes('..')&&fs.existsSync(path.join(root,p)));
const priority=plan(testMatrix,risk,available);
const learned=api.learning(JSON.parse(read('hlgb-modules/engenharia/incident-cases-v9637.json')));
const ciEvidence=require('./ci-evidence-v9671.cjs').review(JSON.parse(read('hlgb-modules/engenharia/ci-regression-cases-v9671.json')));
const repairInsights=require('./repair-insights-v9793.cjs').analyze({cases:JSON.parse(read('hlgb-modules/engenharia/ci-regression-cases-v9671.json')),captures:JSON.parse(read('hlgb-modules/engenharia/ci-repair-timing-v9793.json')),matrix:testMatrix,impact:risk,priority});
process.stdout.write(JSON.stringify({repairInsights,ciEvidence,schema:'hlgb-preventive-v9637',base,head,graph,risk,priority,learned},null,2)+'\n');
if(graph.findings.length||priority.missing.length)process.exitCode=1;
