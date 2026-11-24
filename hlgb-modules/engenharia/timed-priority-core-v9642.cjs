'use strict';
module.exports=function select(matrix,allow,areas,mode){
 if(!['baseline','priority'].includes(mode)||!Array.isArray(areas)||!Array.isArray(allow))throw Error('invalid-selection');
 const known=new Set(allow),all=[...new Set(allow)].sort(),unmapped=areas.filter(a=>!Object.hasOwn(matrix,a));
 const wanted=mode==='baseline'?all:[...new Set(areas.flatMap(a=>Object.hasOwn(matrix,a)?matrix[a]:[]))].sort();
 const selected=wanted.filter(p=>known.has(p)),deferred=wanted.filter(p=>!known.has(p));
 return {mode,selected,deferred,unmapped,fullSuiteRequired:true,coverage:mode==='baseline'?'calibration-subset':'priority-subset'};
};
