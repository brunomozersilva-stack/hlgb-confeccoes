from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

if 'v91.29 Multiusuário' in s:
    print('v91.29 already applied')
    raise SystemExit(0)
if 'v91.28 Multiusuário' not in s:
    raise SystemExit('expected v91.28 base not found')

# 1) Payroll realtime: when the payroll page is visible, redraw it even if a filter/input
# has focus. Keep the existing modal guard so an open employee edit form is never destroyed.
old='''    if(module==="products" && activePage==="produtos"){
      if(typeof renderProducts==="function")renderProducts();
      cloudRemoteUpdatePending=false;
      return true;
    }

    // Para as demais telas mantemos a proteção antiga enquanto há um formulário/campo sendo editado.'''
new='''    if(module==="products" && activePage==="produtos"){
      if(typeof renderProducts==="function")renderProducts();
      cloudRemoteUpdatePending=false;
      return true;
    }

    // v91.29: na Folha, uma alteração confirmada por outra máquina precisa aparecer
    // imediatamente. O modal aberto continua protegido pelo guard acima.
    if(module==="payroll" && activePage==="folhaPagamento"){
      if(typeof renderPayroll==="function")renderPayroll();
      cloudRemoteUpdatePending=false;
      return true;
    }

    // Para as demais telas mantemos a proteção antiga enquanto há um formulário/campo sendo editado.'''
if old not in s:
    raise SystemExit('realtime payroll insertion target not found')
s=s.replace(old,new,1)

# Polling safety path must apply the same special handling as realtime.
old='''      // Se Produtos mudou, atualiza sua tabela mesmo com um filtro selecionado.
      if(modules.includes("products"))hlgbRenderIncomingRecord("products");
      else if(!cloudUserIsEditing()){
        const prev=cloudApplying;cloudApplying=true;try{renderAll();cloudRemoteUpdatePending=false}finally{cloudApplying=prev}
      }else cloudRemoteUpdatePending=true;'''
new='''      // Produtos e Folha atualizam a tela mesmo com filtros focados.
      let handled=false;
      if(modules.includes("products"))handled=hlgbRenderIncomingRecord("products")||handled;
      if(modules.includes("payroll"))handled=hlgbRenderIncomingRecord("payroll")||handled;
      if(!handled&&!cloudUserIsEditing()){
        const prev=cloudApplying;cloudApplying=true;try{renderAll();cloudRemoteUpdatePending=false}finally{cloudApplying=prev}
      }else if(!handled) cloudRemoteUpdatePending=true;'''
if old not in s:
    raise SystemExit('polling payroll target not found')
s=s.replace(old,new,1)

# 2) INSS can be enabled/disabled per monthly employee payroll row. Existing rows default
# to enabled, preserving all current calculations until the user explicitly selects No.
old=''' let contribBase=Math.max(0,salary+overtime+bonus-absence);
 let inss=calcINSS2026(contribBase);
 let gross=salary+transport+benefit+overtime+bonus+otherCredit;'''
new=''' let contribBase=Math.max(0,salary+overtime+bonus-absence);
 let calculatedInss=calcINSS2026(contribBase);
 let inss=r.discountInss===false?0:calculatedInss;
 let gross=salary+transport+benefit+overtime+bonus+otherCredit;'''
if old not in s:
    raise SystemExit('payroll INSS calculation target not found')
s=s.replace(old,new,1)

old='''  <div class="field"><label>Outros descontos (-)</label><input id="prOtherDiscount" type="number" step=".01" value="${c.otherDiscount||0}"></div>
  <div class="field"><label>Chave PIX</label><input id="prPix" value="${esc(r.pix||e.pix||"")}"></div>'''
new='''  <div class="field"><label>Outros descontos (-)</label><input id="prOtherDiscount" type="number" step=".01" value="${c.otherDiscount||0}"></div>
  <div class="field"><label>Descontar INSS?</label><select id="prDiscountInss"><option value="yes" ${r.discountInss!==false?"selected":""}>Sim</option><option value="no" ${r.discountInss===false?"selected":""}>Não</option></select></div>
  <div class="field"><label>Chave PIX</label><input id="prPix" value="${esc(r.pix||e.pix||"")}"></div>'''
if old not in s:
    raise SystemExit('payroll INSS UI target not found')
s=s.replace(old,new,1)

old=''' <div class="sub">INSS será recalculado automaticamente ao salvar.</div>'''
new=''' <div class="sub">INSS é calculado automaticamente quando “Descontar INSS?” estiver em Sim. Se escolher Não, o valor não entra nos descontos desta folha.</div>'''
if old not in s:
    raise SystemExit('payroll INSS help target not found')
s=s.replace(old,new,1)

# Capture the exact version the user opened. If another user changes the same row while
# the modal is open, we three-way merge against the latest cloud snapshot before writing.
old=''' let c=payrollCalc(r,e);
 openModal(`Folha — ${esc(r.employeeName||e.name||"Funcionário")}`,`'''
new=''' let c=payrollCalc(r,e);
 const payrollBase=hlgbRecordClone(r);
 openModal(`Folha — ${esc(r.employeeName||e.name||"Funcionário")}`,`'''
if old not in s:
    raise SystemExit('payroll base snapshot target not found')
s=s.replace(old,new,1)

# Replace the old fire-and-forget generic save with an explicit cloud-confirmed record save.
pat=re.compile(r'''(<button type="button" class="primary modalSave">Salvar folha</button>`,)\(\)=>\{\s*Object\.assign\(r,\{(.*?)\}\);\s*closeModal\(\);save\(\);renderPayroll\(\);\s*\}\);''',re.S)
m=pat.search(s)
if not m:
    raise SystemExit('payroll save callback target not found')
fields=m.group(2)
# Reuse the existing field mapping, adding the INSS choice explicitly.
if 'discountInss:' not in fields:
    fields=fields.rstrip()+',\n     discountInss:document.getElementById("prDiscountInss")?.value!=="no"\n   '
replacement=m.group(1)+'''async()=>{
   const btn=document.querySelector("#modal .modalSave");
   const desired={...hlgbRecordClone(payrollBase),'''+fields+''' };
   try{
     if(btn){btn.disabled=true;btn.textContent="☁️ Salvando na nuvem…"}
     if(!hlgbRecordReady){
       const ok=await hlgbEnsureRecordsOnlineAfterLogin();
       if(!ok||!hlgbRecordReady)throw new Error("A nuvem não está pronta para salvar a folha.");
     }
     const latest=hlgbRecordSnapshots?.payroll?.get(String(id))?.data || (db.payroll||[]).find(x=>String(x.id)===String(id)) || payrollBase;
     const merged=cloudMergeThreeWay(payrollBase,desired,latest);
     setCloudStatus("☁️ Salvando folha…");
     const confirmed=await hlgbRecordSaveWithRetry("payroll",String(id),merged,false);
     if(!confirmed||confirmed.applied!==true)throw new Error("O Supabase não confirmou a alteração da folha.");
     const finalData=hlgbRecordClone(confirmed.data||merged);
     let current=(db.payroll||[]).find(x=>String(x.id)===String(id));
     if(current){Object.keys(current).forEach(k=>delete current[k]);Object.assign(current,finalData)}
     else {db.payroll=db.payroll||[];db.payroll.push(finalData)}
     localSaveOnly();
     closeModal();
     renderPayroll();
     try{auditAction("Atualizou folha de pagamento",`${finalData.employeeName||"Funcionário"} — ${finalData.month||""}`)}catch(e){}
     setCloudStatus("⚡ Online · folha confirmada","ok");
   }catch(err){
     console.error("HLGB v91.29 folha não confirmada",err);
     if(btn){btn.disabled=false;btn.textContent="💾 Salvar folha"}
     setCloudStatus("☁️ Folha não confirmada","bad");
     alert("A alteração da folha NÃO foi confirmada na nuvem. Nada foi removido e a janela ficou aberta para você tentar novamente.\\n\\n"+String(err?.message||err));
   }
 });'''
s=s[:m.start()]+replacement+s[m.end():]

# Summary wording: INSS total is now the amount actually selected for discount.
s=s.replace('<div class="sub">INSS é calculado automaticamente pela tabela progressiva vigente em 2026. Você pode ajustar os demais créditos e descontos por funcionário.</div>',
            '<div class="sub">INSS é calculado pela tabela progressiva vigente em 2026 e pode ser descontado ou não, individualmente, em cada folha.</div>',1)

s=s.replace('v91.28 Multiusuário','v91.29 Multiusuário')
s=s.replace('Versão v91.28','Versão v91.29')
s=s.replace('>v91.28</small>','>v91.29</small>')

p.write_text(s,encoding='utf-8')
print('patched HLGB v91.29 payroll realtime + cloud-confirmed save + INSS toggle')
