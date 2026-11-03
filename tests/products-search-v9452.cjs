const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('release-products-search-v9452.js','utf8');
const loader=fs.readFileSync('app-stable3.html','utf8');
assert(loader.includes("'release-product-catalog-v9419.js','release-products-search-v9452.js'"),'Products search fix must load');
assert(src.includes("document.addEventListener('input'"),'must update on search input');
assert(src.includes("cells[1].textContent"),'must match product name, not actions');
assert(src.includes('MutationObserver'),'must reapply after legacy render');
assert(!src.includes('hlgbRecordSaveWithRetry'),'search must never save records');
console.log('PASS Products search fix v94.52: loaded and read-only');
