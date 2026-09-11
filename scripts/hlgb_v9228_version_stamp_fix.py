from pathlib import Path
p=Path('app9228.html')
s=p.read_text(encoding='utf-8')
mark='HLGB_V9228_FINAL_VERSION_STAMP_START'
if mark not in s:
    addon='''<!-- HLGB_V9228_FINAL_VERSION_STAMP_START -->\n<script>\n(function(){function finalStamp9228(){try{document.title='HLGB Confecções — Sistema de Gestão v92.28 Multiusuário'}catch(e){}const el=document.querySelector('#appShell .logo small');if(el)el.textContent='v92.28'};[3000,4200,6500,10000].forEach(ms=>setTimeout(finalStamp9228,ms));if(typeof hlgbAfterLogin==='function')hlgbAfterLogin(()=>[3000,4200,6500].forEach(ms=>setTimeout(finalStamp9228,ms)),0);})();\n</script>\n<!-- HLGB_V9228_FINAL_VERSION_STAMP_END -->'''
    pos=s.rfind('</body>')
    if pos<0: raise SystemExit('body não encontrado')
    s=s[:pos]+addon+'\n'+s[pos:]
p.write_text(s,encoding='utf-8')
print('selo final v92.28 aplicado')
