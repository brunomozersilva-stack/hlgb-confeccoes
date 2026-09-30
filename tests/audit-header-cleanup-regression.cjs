const fs=require('fs'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const loader=fs.readFileSync(path.join(root,'app-stable3.html'),'utf8');
const assistant=fs.readFileSync(path.join(root,'release-assistant-query.js'),'utf8');
const cleanup=fs.readFileSync(path.join(root,'release-header-cleanup.js'),'utf8');

assert(loader.includes("'release-header-cleanup.js'"),'loader must include header cleanup');
assert(assistant.includes("hlgbAssistantNavBtn"),'assistant must have sidebar navigation button');
assert(assistant.includes("nav-submenu"),'assistant must target sidebar submenu');
assert(!assistant.includes("header.insertBefore(b,logout)"),'assistant must not be inserted in top header anymore');

assert(cleanup.includes("hlgbSystemBackupExport"),'backup export must be available in Sistema');
assert(cleanup.includes("hlgbSystemBackupImport"),'backup import must be available in Sistema');
assert(cleanup.includes("#hlgb955SaveBadge{top:auto!important"),'cloud saved badge must be moved away from top bar');
assert(cleanup.includes("bottom:16px!important"),'cloud saved badge must be anchored at the bottom');
assert(cleanup.includes("#backupBtn")&&cleanup.includes("display:none!important"),'legacy header backup controls must remain hidden');
assert(cleanup.includes("hlgbAssistantBtn")&&cleanup.includes("remove()"),'any old assistant header button must be removed');

console.log('PASS header cleanup: assistant/tools in Sistema and cloud badge away from top bar.');
