const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('release-auditor-production-v9369.js','utf8');

assert(src.includes('function cloudRequestIsSafe(previous,current)'), 'helper de segurança ausente');
assert(src.includes("current.__hlgb9320===true"), 'wrapper v93.20 não é reconhecido');
assert(src.includes('current.__hlgb9320Original===previous'), 'Auditor não comprova a função original');
const waitPos=src.indexOf('await waitReady();');
const refreshedBaselinePos=src.indexOf('before={recordSave:window.hlgbRecordSaveWithRetry',waitPos);
assert(waitPos>=0&&refreshedBaselinePos>waitPos, 'baseline de segurança deve ser renovada após waitReady');
assert(src.includes("const changed=Object.entries(safety).filter(([,ok])=>!ok).map(([key])=>key);"), 'diagnóstico da função alterada ausente');
assert(src.includes("patch:'2026-10-20-deep-readonly'"), 'telemetria do diagnóstico profundo ausente');
assert(src.includes("deepDiagnostics:DEEP_VERSION"), 'versão do diagnóstico profundo não está exposta');
assert(!src.includes("cloudRequest:before.cloudRequest===window.cloudRequest"), 'comparação rígida antiga ainda ativa');

console.log('auditor known cloud wrapper + deep telemetry: OK');
