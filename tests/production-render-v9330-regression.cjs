const fs=require('fs');
const src=fs.readFileSync('release-production-render-fix-v9330.js','utf8');
if(!/const arr=db\.production\.filter/.test(src)) throw new Error('arr não é inicializada na correção v93.30');
if(/renderização\.db\.production/.test(src)) throw new Error('regressão: comentário engolindo código detectada');
if(!/window\.renderProduction=fixedRenderProduction/.test(src)) throw new Error('renderProduction não é substituída pela correção');
console.log('production render v93.30 regression: OK');
