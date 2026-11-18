'use strict';
// Derive the former single-quoted script sequence from the ACTUAL moduleGroups
// loader contract, not from a second hand-maintained list.
const assert=require('node:assert/strict');
function scripts(html){
 const anchor='const moduleGroups=',start=html.indexOf(anchor);
 const end=html.indexOf(';const files=moduleGroups.flatMap(group=>group.files)',start);
 assert.ok(start>=0&&end>start,'modular loader groups must remain parseable');
 const groups=JSON.parse(html.slice(start+anchor.length,end));
 assert.ok(Array.isArray(groups)&&groups.length>0,'module groups missing');
 const files=groups.flatMap(g=>g.files);
 assert.equal(files.length,new Set(files).size,'duplicate release script');
 return files;
}
function legacyQuotedView(html){
 return scripts(html).map(f=>"'"+f+"'").join(',');
}
module.exports=legacyQuotedView;
module.exports.scripts=scripts;
