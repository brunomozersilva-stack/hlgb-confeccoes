from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path); s=p.read_text(); n=s.count(old)
    if n!=1: raise SystemExit(f'{label}: esperado 1 trecho, encontrado {n}')
    p.write_text(s.replace(old,new,1))

# 1. Fundo: a autoridade visual final não pode voltar para escala somente por altura.
p=Path('release-ui-actions-v9402.js'); s=p.read_text()
s=s.replace("#appShell::before{background-image:var(--byh-photo)!important;background-repeat:no-repeat!important;background-position:right 18% center!important;background-size:auto 102%!important;opacity:var(--byh-photo-visual-opacity)!important}","#appShell::before{position:fixed!important;inset:0!important;background-image:var(--byh-photo)!important;background-repeat:no-repeat!important;background-position:center center!important;background-size:cover!important;opacity:var(--byh-photo-visual-opacity)!important}",1)
s=s.replace("@media(max-width:900px){#appShell::before{left:0!important;background-position:70% center!important;background-size:auto 100%!important}#appShell::after{left:0!important}}","@media(max-width:900px){#appShell::before{inset:0!important;background-position:center center!important;background-size:cover!important}#appShell::after{left:0!important}}",1)
if 'background-size:auto 102%!important' in s: raise SystemExit('fundo: override antigo 102% ainda presente')
p.write_text(s)

# 2. Topbar: compactar status da nuvem sem perder a mensagem completa (title/aria-label).
p=Path('release-night-ui-fixes.js'); s=p.read_text()
s=s.replace("const V='2026.10.26-topbar-clean-v3';","const V='2026.10.26-topbar-clean-v4';",1)
s=s.replace("#appShell>header #cloudStatus{white-space:nowrap!important;flex:0 0 auto!important}","#appShell>header #cloudStatus{white-space:nowrap!important;flex:0 0 auto!important;width:auto!important;min-width:46px!important;max-width:58px!important;padding:6px 8px!important;overflow:hidden!important;text-align:center!important}",1)
marker='function cleanTopbar(){\n injectTopbarCss();'
insert='''let cloudStatusObserver9253=null,cloudStatusMutating9253=false;
function compactCloudStatus9253(cloud){
 if(!cloud)return false;
 const current=sid(cloud.textContent).replace(/\\s+/g,' ').trim();
 if(!cloudStatusMutating9253&&current&&!['☁️ ✓','☁️ …','⚠️','☁️'].includes(current))cloud.dataset.hlgbCloudFull9253=current;
 const full=cloud.dataset.hlgbCloudFull9253||current||'Status da nuvem',n=norm(full);
 let short='☁️';
 if(/erro|falh|offline|desconect|sem conex/.test(n))short='⚠️';
 else if(/salvando|aguardando|pendente|sincronizando|enviando/.test(n))short='☁️ …';
 else if(/salvo|online|multiusuario|tempo real|confirmad/.test(n))short='☁️ ✓';
 cloud.title=full;cloud.setAttribute('aria-label',full);
 if(sid(cloud.textContent).trim()!==short){cloudStatusMutating9253=true;cloud.textContent=short;queueMicrotask(()=>{cloudStatusMutating9253=false})}
 if(!cloudStatusObserver9253&&typeof MutationObserver==='function'){
  cloudStatusObserver9253=new MutationObserver(()=>{if(!cloudStatusMutating9253)setTimeout(()=>compactCloudStatus9253(cloud),0)});
  cloudStatusObserver9253.observe(cloud,{childList:true,subtree:true,characterData:true});
 }
 return true;
}
function cleanTopbar(){
 injectTopbarCss();'''
if marker not in s: raise SystemExit('topbar: cleanTopbar marker não encontrado')
s=s.replace(marker,insert,1)
s=s.replace(" const cloud=document.getElementById('cloudStatus');if(!header||!cloud)return false;\n header.classList.add('hlgb-topbar-clean');"," const cloud=document.getElementById('cloudStatus');if(!header||!cloud)return false;\n compactCloudStatus9253(cloud);\n header.classList.add('hlgb-topbar-clean');",1)
p.write_text(s)

# 3. Folha: status separado, ação principal clara e ferramentas secundárias agrupadas.
p=Path('release-payroll-view-v9295.js'); s=p.read_text()
old="<div>${status}</div><div class=\"payroll-actions\"><button class=\"primary\" onclick=\"editPayrollRow('${id}')\">✏️ Editar</button> <button class=\"secondary\" onclick=\"togglePayrollPaid('${id}')\">${paid?'↩ Reabrir':'✓ Pagar'}</button> <button class=\"danger\" onclick=\"deletePayrollRow('${id}')\">Excluir</button></div>"
new="<div class=\"payroll-status-cell\">${status}</div><div class=\"payroll-actions\"><button class=\"${paid?'secondary':'primary'} payroll-pay-action\" onclick=\"togglePayrollPaid('${id}')\">${paid?'↩ Reabrir':'✓ Marcar pago'}</button><div class=\"payroll-row-tools\"><button class=\"secondary\" onclick=\"editPayrollRow('${id}')\">✏️ Editar</button><button class=\"danger\" onclick=\"deletePayrollRow('${id}')\">🗑 Excluir</button></div></div>"
if old not in s: raise SystemExit('folha: ações antigas não encontradas')
s=s.replace(old,new,1); p.write_text(s)

p=Path('release-payroll-layout-v9298.js'); s=p.read_text()
s=s.replace("#payrollTable .payroll-actions{display:flex!important;gap:5px!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:wrap!important;min-width:0!important;overflow:visible!important}","#payrollTable .payroll-status-cell{display:flex!important;align-items:center!important;justify-content:center!important;min-width:0!important}#payrollTable .payroll-actions{display:grid!important;grid-template-columns:1fr!important;gap:6px!important;align-items:stretch!important;justify-content:stretch!important;min-width:0!important;overflow:visible!important}#payrollTable .payroll-row-tools{display:grid!important;grid-template-columns:1fr 1fr!important;gap:5px!important;min-width:0!important}#payrollTable .payroll-pay-action{width:100%!important;font-weight:800!important}",1)
s=s.replace("#payrollTable .payroll-actions button{display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;justify-content:center!important;min-height:34px!important;min-width:auto!important;width:auto!important;max-width:100%!important;padding:6px 9px!important;margin:0!important;white-space:nowrap!important;font-size:12px!important;line-height:1.15!important}","#payrollTable .payroll-actions button{display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;justify-content:center!important;min-height:34px!important;min-width:0!important;width:100%!important;max-width:100%!important;padding:6px 8px!important;margin:0!important;white-space:nowrap!important;font-size:11px!important;line-height:1.15!important}",1)
p.write_text(s)

# 4. Nota: reconciliar fila EXATAMENTE pelos sourceQueueId/sourceKey já gravados na nota.
p=Path('release-note-integrity.js'); s=p.read_text()
s=s.replace('/* HLGB v94.18 — integridade de notas, nota avulsa, documentos e reconciliação de tombstones financeiros */','/* HLGB v94.19 — integridade de notas, fila faturada e reconciliação de tombstones financeiros */',1)
s=s.replace("const V='94.18';","const V='94.19';",1)
marker='let timer=null;\nconst mo=new MutationObserver'
block='''let queueInvoiceReconBusy9419=false,queueInvoiceReconAt9419=0;
function queueInvoiceAnalysis(queueRows=arr('noteQueue'),invoices=canonicalInvoices()){
 const links=new Map(),eps=.000001;
 for(const inv of (Array.isArray(invoices)?invoices:[])){
  if(!inv)continue;
  const invId=sid(inv.id),stamp=sid(inv.issueDate||inv.date||inv.updatedAt||'');
  for(const item of (Array.isArray(inv.items)?inv.items:[])){
   const queueId=sid(item?.sourceQueueId||item?.sourceKey);if(!queueId)continue;
   const cur=links.get(queueId)||{queueId,qty:0,lastInvoiceId:'',stamp:''};cur.qty+=q(item?.qty);
   if(!cur.lastInvoiceId||stamp>=cur.stamp){cur.lastInvoiceId=invId;cur.stamp=stamp}links.set(queueId,cur);
  }
 }
 const out=[];
 for(const row of (Array.isArray(queueRows)?queueRows:[])){
  if(!row||['cancelado','cancelada'].includes(norm(row.status)))continue;
  const id=sid(row.id),link=links.get(id);if(!link)continue;
  const total=q(row.qty),linked=q(link.qty),remaining=Math.max(0,total-linked),status=remaining<=eps?'Faturado':linked>eps?'Parcial':sid(row.status||'Aguardando nota');
  const currentRemaining=q(row.remainingQty??row.qty),wrongRemaining=Math.abs(currentRemaining-remaining)>eps,wrongStatus=norm(row.status)!==norm(status),wrongInvoice=!!link.lastInvoiceId&&sid(row.lastInvoiceId)!==sid(link.lastInvoiceId);
  if(wrongRemaining||wrongStatus||wrongInvoice)out.push({id,clientName:row.clientName||row.client||'',productName:row.productName||'',total,linkedQty:linked,currentRemaining,expectedRemaining:remaining,currentStatus:sid(row.status),expectedStatus:status,lastInvoiceId:link.lastInvoiceId,overInvoiced:linked>total+eps,row});
 }
 return out;
}
async function reconcileQueueInvoices9419(force=false){
 if(queueInvoiceReconBusy9419)return {busy:true,changed:0};const now=Date.now();if(!force&&now-queueInvoiceReconAt9419<2500)return {throttled:true,changed:0};queueInvoiceReconAt9419=now;queueInvoiceReconBusy9419=true;
 const changed=[],errors=[];try{
  for(const x of queueInvoiceAnalysis()){
   const next={...clone(x.row),remainingQty:x.expectedRemaining,status:x.expectedStatus,lastInvoiceId:x.lastInvoiceId,updatedAt:new Date().toISOString()};
   try{await saveConfirmed('noteQueue',next,false);changed.push(x.id)}catch(e){errors.push({id:x.id,error:sid(e?.message||e)})}
  }
  if(changed.length){try{apply()}catch(e){}}
  return {changed:changed.length,ids:changed,errors};
 }finally{queueInvoiceReconBusy9419=false}
}
window.hlgbNoteQueueReconcile9419={version:'94.19',analyze:queueInvoiceAnalysis,reconcile:reconcileQueueInvoices9419};

let timer=null;
const mo=new MutationObserver'''
if marker not in s: raise SystemExit('nota: marker MutationObserver não encontrado')
s=s.replace(marker,block,1)
s=s.replace("if(['noteQueue','projectionInvoices','orders','finance'].includes(module)){\n   setTimeout(apply,30);","if(['noteQueue','projectionInvoices','orders','finance'].includes(module)){\n   setTimeout(apply,30);\n   if(['noteQueue','projectionInvoices'].includes(module))setTimeout(()=>reconcileQueueInvoices9419(false).catch(()=>{}),420);",1)
s=s.replace("function boot(){\n reconcileFinanceTombstones();apply();\n setTimeout(()=>{reconcileFinanceTombstones();cleanupOrphanFinance()},1800);","function boot(){\n reconcileFinanceTombstones();apply();\n setTimeout(()=>reconcileQueueInvoices9419(false).catch(()=>{}),900);\n setTimeout(()=>{reconcileFinanceTombstones();cleanupOrphanFinance();reconcileQueueInvoices9419(false).catch(()=>{})},1800);",1)
s=s.replace("hlgbAfterLogin(()=>[100,700,1800,3500].forEach(ms=>setTimeout(()=>{reconcileFinanceTombstones();apply()},ms)),0)","hlgbAfterLogin(()=>[100,700,1800,3500].forEach(ms=>setTimeout(()=>{reconcileFinanceTombstones();apply();if(ms>=700)reconcileQueueInvoices9419(false).catch(()=>{})},ms)),0)",1)
p.write_text(s)

# 5. Auditor: transformar a mesma divergência em finding visível na caixa-preta.
p=Path('release-auditor-blackbox-v9299.js'); s=p.read_text()
marker='function extraFindings(p,sub,scripts){'
helper="function noteInvoiceMismatches(){try{return window.hlgbNoteQueueReconcile9419?.analyze?.()||[]}catch(e){return []}}\n"
if marker not in s: raise SystemExit('auditor: extraFindings não encontrado')
s=s.replace(marker,helper+marker,1)
old="if(sub.payroll?.missingPayroll?.length)add('warn','payroll-missing',sub.payroll.missingPayroll.length+' funcionário(s) ativo(s) sem folha.');return out}"
new="if(sub.payroll?.missingPayroll?.length)add('warn','payroll-missing',sub.payroll.missingPayroll.length+' funcionário(s) ativo(s) sem folha.');for(const x of noteInvoiceMismatches().slice(0,30))add(x.overInvoiced?'error':'warn','notequeue-invoice-mismatch',(x.clientName||'Cliente')+' · '+(x.productName||x.id)+' está '+(x.currentStatus||'sem status')+' com '+Number(x.currentRemaining||0).toLocaleString('pt-BR')+' pç restantes, mas a(s) nota(s) ligada(s) exigem '+Number(x.expectedRemaining||0).toLocaleString('pt-BR')+' pç restantes.');return out}"
if old not in s: raise SystemExit('auditor: fim extraFindings não encontrado')
s=s.replace(old,new,1)
s=s.replace("openSystemIssues:systemIssues(),findings:","openSystemIssues:systemIssues(),noteQueueInvoiceMismatches:redact(noteInvoiceMismatches()),findings:",1)
s=s.replace("window.hlgbAuditorBlackbox9299={version:V,collect,run,analyzePending,loadedScripts,storageHealth,subsystems,inject};","window.hlgbAuditorBlackbox9299={version:V,collect,run,analyzePending,loadedScripts,storageHealth,subsystems,noteInvoiceMismatches,inject};",1)
p.write_text(s)

# 6. Catálogo normal: leitura do db.products, sem nova autoridade de gravação.
Path('release-product-catalog-v9419.js').write_text(r'''/* HLGB v94.19 — catálogo dos produtos normais, somente leitura. */
(function(){
'use strict';
const V='94.19',PAGE='productCatalog9419';
if(window.HLGB_PRODUCT_CATALOG_9419){try{window.hlgbProductCatalog9419?.install?.()}catch(e){}return}
const sid=v=>String(v??''),esc=v=>sid(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>sid(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function dbr(){try{if(typeof db!=='undefined'&&db)return db}catch(e){}return window.db||{}}
function products(){const d=dbr();return Array.isArray(d.products)?d.products:[]}
function photo(p){const ps=Array.isArray(p?.photos)?p.photos:[],x=ps[0];return sid(x?.data||x?.url||p?.image||p?.photo||'')}
function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function cats(){return [...new Set(products().map(p=>sid(p.category).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))}
function ensureStyle(){if(document.getElementById('hlgbProductCatalog9419Style'))return;const s=document.createElement('style');s.id='hlgbProductCatalog9419Style';s.textContent=`#${PAGE} .hlgb-cat9419-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) minmax(180px,.45fr) auto;gap:10px;align-items:end;margin:14px 0}#${PAGE} .hlgb-cat9419-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}#${PAGE} .hlgb-cat9419-card{background:rgba(255,255,255,.94);border:1px solid var(--line);border-radius:14px;padding:12px;break-inside:avoid;box-shadow:0 5px 18px rgba(50,20,36,.07)}#${PAGE} .hlgb-cat9419-photo{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;background:#f5edf1;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900;color:#9d7588}#${PAGE} .hlgb-cat9419-card h3{margin:10px 0 3px;font-size:17px}#${PAGE} .hlgb-cat9419-meta{font-size:12px;color:var(--muted);line-height:1.5}#${PAGE} .hlgb-cat9419-price{font-size:20px;font-weight:900;margin-top:8px}.hlgb-cat9419-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.hlgb-cat9419-tag{font-size:11px;padding:3px 7px;border:1px solid #e5d7de;border-radius:999px;background:#fff7fb}@media(max-width:760px){#${PAGE} .hlgb-cat9419-toolbar{grid-template-columns:1fr}#${PAGE} .hlgb-cat9419-grid{grid-template-columns:1fr 1fr}}@media(max-width:520px){#${PAGE} .hlgb-cat9419-grid{grid-template-columns:1fr}}@media print{body.hlgb-print-catalog9419 .page{display:none!important}body.hlgb-print-catalog9419 #${PAGE}{display:block!important}body.hlgb-print-catalog9419 aside,body.hlgb-print-catalog9419 header,body.hlgb-print-catalog9419 .hlgb-cat9419-no-print{display:none!important}body.hlgb-print-catalog9419 #${PAGE} .hlgb-cat9419-grid{grid-template-columns:repeat(3,1fr)!important}}`;document.head.appendChild(s)}
function ensurePage(){const main=document.querySelector('#appShell main')||document.querySelector('main');if(!main)return false;if(!document.getElementById(PAGE)){const s=document.createElement('section');s.id=PAGE;s.className='page';s.innerHTML='<h1>🛍️ Catálogo de Produtos</h1><div class="sub">Catálogo dos produtos normais já cadastrados em Produtos / Ficha técnica.</div><div class="hlgb-cat9419-toolbar hlgb-cat9419-no-print"><div class="field"><label>Buscar produto / referência</label><input id="hlgbCatSearch9419" placeholder="Nome, referência ou categoria" oninput="hlgbProductCatalog9419.render()"></div><div class="field"><label>Categoria</label><select id="hlgbCatCategory9419" onchange="hlgbProductCatalog9419.render()"></select></div><button class="secondary" type="button" onclick="hlgbProductCatalog9419.print()">🖨️ Imprimir / Salvar PDF</button></div><div id="hlgbCatCount9419" class="sub" style="margin-bottom:10px"></div><div id="hlgbCatGrid9419" class="hlgb-cat9419-grid"></div>';main.appendChild(s)}return true}
function productGroup(){return [...document.querySelectorAll('#nav .nav-group')].find(g=>norm(g.querySelector('.nav-group-title span')?.textContent)==='produtos')||null}
function ensureNav(){const g=productGroup(),sub=g?.querySelector('.nav-submenu');if(!sub)return false;let b=document.getElementById('hlgbProductCatalogNav9419');if(!b){b=document.createElement('button');b.id='hlgbProductCatalogNav9419';b.type='button';b.dataset.page='produtos';b.textContent='Catálogo de produtos';const first=sub.querySelector('button');first?.after(b)||sub.appendChild(b)}b.onclick=function(){open(this)};return true}
function filters(){const q=norm(document.getElementById('hlgbCatSearch9419')?.value||''),cat=sid(document.getElementById('hlgbCatCategory9419')?.value||'');return {q,cat}}
function render(){const grid=document.getElementById('hlgbCatGrid9419'),sel=document.getElementById('hlgbCatCategory9419');if(!grid)return false;if(sel){const cur=sel.value,cs=cats();sel.innerHTML='<option value="">Todas</option>'+cs.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');if(cs.includes(cur))sel.value=cur}const f=filters(),rows=products().filter(p=>{const hay=norm([p.name,p.code,p.reference,p.category,p.material].join(' '));return(!f.q||hay.includes(f.q))&&(!f.cat||sid(p.category)===f.cat)}).sort((a,b)=>sid(a.name).localeCompare(sid(b.name),'pt-BR'));const count=document.getElementById('hlgbCatCount9419');if(count)count.textContent=rows.length+' produto(s)';grid.innerHTML=rows.length?rows.map(p=>{const img=photo(p),sizes=Array.isArray(p.sizes)?p.sizes:[],colors=Array.isArray(p.colors)?p.colors:[];return '<article class="hlgb-cat9419-card">'+(img?'<img class="hlgb-cat9419-photo" src="'+esc(img)+'" alt="'+esc(p.name||'Produto')+'">':'<div class="hlgb-cat9419-photo">BH</div>')+'<h3>'+esc(p.name||'Produto')+'</h3><div class="hlgb-cat9419-meta">Ref. '+esc(p.code||p.reference||'—')+' · '+esc(p.category||'Sem categoria')+(p.material?'<br>'+esc(p.material):'')+'</div><div class="hlgb-cat9419-price">'+money(p.price)+'</div><div class="hlgb-cat9419-tags">'+sizes.map(x=>'<span class="hlgb-cat9419-tag">'+esc(x)+'</span>').join('')+colors.slice(0,6).map(x=>'<span class="hlgb-cat9419-tag">'+esc(x?.name||x)+'</span>').join('')+'</div></article>'}).join(''):'<div class="empty">Nenhum produto encontrado.</div>';return true}
function open(btn){try{if(typeof window.page==='function')window.page(PAGE,btn);else{document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById(PAGE)?.classList.add('active');document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active')}}catch(e){}setTimeout(render,0);return true}
function printCatalog(){document.body.classList.add('hlgb-print-catalog9419');try{window.print()}finally{setTimeout(()=>document.body.classList.remove('hlgb-print-catalog9419'),250)}}
function install(){ensureStyle();return ensurePage()&&ensureNav()}
let tries=0;function boot(){if(install())return;if(++tries<20)setTimeout(boot,400)}
try{if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>setTimeout(()=>{install();render()},300),0)}catch(e){}window.addEventListener('hlgb:authenticated',()=>setTimeout(()=>{install();render()},300));window.hlgbProductCatalog9419={version:V,install,render,open,print:printCatalog};window.HLGB_PRODUCT_CATALOG_9419=V;setTimeout(boot,700);
})();
''')

# 7. Carregar catálogo no roteador estável.
p=Path('app-stable3.html'); s=p.read_text()
old="'release-business-expansion-v9400.js','release-login-3d-baseline-v9407.js'"
new="'release-business-expansion-v9400.js','release-product-catalog-v9419.js','release-login-3d-baseline-v9407.js'"
if old not in s: raise SystemExit('stable3: ponto de carga do catálogo não encontrado')
p.write_text(s.replace(old,new,1))

# 8. Testes focados.
Path('tests/audit-user-ui-requests-v9419.cjs').write_text(r'''\
'use strict';
const fs=require('fs'),assert=require('assert');
const ui=fs.readFileSync('release-ui-actions-v9402.js','utf8'),top=fs.readFileSync('release-night-ui-fixes.js','utf8'),pv=fs.readFileSync('release-payroll-view-v9295.js','utf8'),pl=fs.readFileSync('release-payroll-layout-v9298.js','utf8'),router=fs.readFileSync('app-stable3.html','utf8'),cat=fs.readFileSync('release-product-catalog-v9419.js','utf8');
assert(ui.includes('background-size:cover!important'),'fundo final deve usar cover');assert(!ui.includes('background-size:auto 102%!important'),'override antigo do fundo não pode permanecer');
assert(top.includes('compactCloudStatus9253'),'topbar deve compactar o status da nuvem');assert(top.includes('max-width:58px!important'),'status da nuvem deve ter largura compacta');assert(top.includes("cloud.setAttribute('aria-label',full)"),'texto completo deve continuar acessível');
assert(pv.includes('payroll-status-cell')&&pv.includes('payroll-row-tools')&&pv.includes('payroll-pay-action'),'folha deve separar status, ação principal e ferramentas');assert(pl.includes('grid-template-columns:1fr 1fr!important'),'Editar/Excluir devem ficar agrupados');
assert(router.includes("'release-product-catalog-v9419.js'"),'roteador deve carregar catálogo normal');assert(cat.includes("dataset.page='produtos'")&&cat.includes("Catálogo de produtos"),'catálogo deve herdar acesso de Produtos e entrar no submenu');assert(cat.includes("Array.isArray(d.products)?d.products:[]"),'catálogo deve ler o cadastro normal, sem duplicá-lo');
console.log('OK UI v94.19: fundo cover, nuvem compacta, folha organizada e catálogo normal.');
''')

Path('tests/audit-notequeue-invoice-reconcile-v9419.cjs').write_text(r'''\
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),src=fs.readFileSync('release-note-integrity.js','utf8');
const a=src.indexOf("function queueInvoiceAnalysis("),b=src.indexOf("async function reconcileQueueInvoices9419",a);assert(a>=0&&b>a,'analisador fila↔nota não encontrado');
const fn=src.slice(a,b),ctx={sid:v=>String(v??''),q:v=>Math.max(0,Number(v)||0),norm:v=>String(v??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim().toLowerCase()};vm.createContext(ctx);vm.runInContext(fn+';this.analyze=queueInvoiceAnalysis',ctx);
const queue=[
 {id:'q1',clientName:'Dell',productName:'Camisola Comun',qty:108,remainingQty:108,status:'Aguardando nota'},
 {id:'q2',clientName:'Dell',productName:'Conjunto Cereja',qty:48,remainingQty:48,status:'Aguardando nota'},
 {id:'q3',clientName:'Dell',productName:'Conjunto Gigi',qty:372,remainingQty:0,status:'Faturado',lastInvoiceId:'inv1'},
 {id:'q4',productName:'Parcial',qty:100,remainingQty:100,status:'Aguardando nota'},
 {id:'q5',productName:'Cancelado',qty:10,remainingQty:10,status:'Cancelado'}
];
const invoices=[{id:'inv1',issueDate:'2026-10-26',items:[{sourceQueueId:'q1',qty:108},{sourceQueueId:'q2',qty:48},{sourceQueueId:'q3',qty:372},{sourceQueueId:'q4',qty:30},{sourceQueueId:'q5',qty:10}]}];
const out=ctx.analyze(queue,invoices);assert.deepStrictEqual([...out.map(x=>x.id)],['q1','q2','q4']);const q1=out.find(x=>x.id==='q1'),q4=out.find(x=>x.id==='q4');assert.strictEqual(q1.expectedRemaining,0);assert.strictEqual(q1.expectedStatus,'Faturado');assert.strictEqual(q4.expectedRemaining,70);assert.strictEqual(q4.expectedStatus,'Parcial');assert(!out.some(x=>x.id==='q3'),'linha já correta não deve salvar de novo');assert(!out.some(x=>x.id==='q5'),'cancelado deve ser preservado');
console.log('OK fila↔nota v94.19: Dell faturado, parcial calculado, correto/cancelado preservados.');
''')

Path('tests/audit-auditor-notequeue-v9419.cjs').write_text(r'''\
'use strict';
const fs=require('fs'),assert=require('assert'),s=fs.readFileSync('release-auditor-blackbox-v9299.js','utf8');
assert(s.includes('function noteInvoiceMismatches()'),'Auditor deve consultar a integridade fila↔nota');assert(s.includes("'notequeue-invoice-mismatch'"),'Auditor deve registrar finding da divergência');assert(s.includes('noteQueueInvoiceMismatches:redact(noteInvoiceMismatches())'),'caixa-preta deve exportar o detalhe sanitizado');console.log('OK Auditor v94.19: divergência fila↔nota entrou na caixa-preta.');
''')
