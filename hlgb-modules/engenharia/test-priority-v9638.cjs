'use strict';
module.exports=function planner(matrix,impact,available){
 const checks=new Set(available),missing=[],selected=new Set(),unknown=[];
 for(const [area,paths] of Object.entries(matrix)){if(!Array.isArray(paths))throw Error('invalid-matrix');for(const p of paths)if(!checks.has(p))missing.push(p)}
 for(const area of impact.areas){if(!Object.hasOwn(matrix,area)){unknown.push(area);continue}for(const p of matrix[area])if(checks.has(p))selected.add(p)}
 const priority=[...selected].sort();
 return {priority,missing:[...new Set(missing)].sort(),unknown,mode:'recommendation-only',fullSuiteRequired:true,runBrowserSeparately:priority.filter(p=>/webkit|browser/.test(p))};
};
