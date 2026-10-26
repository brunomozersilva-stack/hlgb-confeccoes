
'use strict';
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync('app9240.html','utf8');
function between(a,b){const i=src.indexOf(a),j=src.indexOf(b,i+1);assert(i>=0&&j>i,`trecho não encontrado: ${a}`);return src.slice(i,j)}
const ensure=between('async function hlgbEnsureRecordsOnlineAfterLogin(){','/* ===== fim v91.16 ===== */');
assert(!ensure.includes('renderAll()'),'hlgbEnsureRecordsOnlineAfterLogin não pode renderizar durante a carga pré-auth');
assert(ensure.includes('hlgbStartRealtime();'),'bootstrap deve continuar iniciando Realtime após a carga');
const manual=between('function doLogin(){','async function logout(){');
const manualMark=manual.indexOf('window.hlgbMarkAuthenticated?.();'),manualRender=manual.indexOf('renderAll()');
assert(manualMark>=0&&manualRender>manualMark,'login manual deve marcar authReady antes do primeiro renderAll');
assert(!manual.includes('setTimeout(()=>window.hlgbMarkAuthenticated?.(),0)'),'login manual não pode adiar authReady depois de abrir o app');
const restore=between('if(cloudRestoreStoredAuth()){','}else{sessionLoader.style.display="none";loginScreen.style.display="flex"}');
const restoreMark=restore.indexOf('window.hlgbMarkAuthenticated?.();'),restoreRender=restore.indexOf('renderAll()');
assert(restoreMark>=0&&restoreRender>restoreMark,'restauração deve marcar authReady antes do primeiro renderAll');
assert(!restore.includes('setTimeout(()=>window.hlgbMarkAuthenticated?.(),0)'),'restauração não pode adiar authReady depois de abrir o app');
console.log('PASS boot authReady/render: carga sem render oculto; login manual e restore marcam authReady antes de renderAll.');
