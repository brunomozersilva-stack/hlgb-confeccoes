from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

old='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
new='''<!-- HLGB v91.46 NON-BLOCKING SUPABASE LOADER -->\n<script>\n(function(){\n  function loadSupabaseRealtime(){\n    if(window.supabase&&window.supabase.createClient)return;\n    var sc=document.createElement('script');\n    sc.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';\n    sc.async=true;\n    sc.onload=function(){\n      try{ if(typeof hlgbStartRealtime==='function') hlgbStartRealtime(); }catch(e){ console.warn('HLGB v91.46 realtime opcional',e); }\n    };\n    sc.onerror=function(){ console.warn('HLGB v91.46: CDN do realtime indisponível; sistema segue por REST/polling.'); };\n    document.head.appendChild(sc);\n  }\n  if(document.readyState==='complete') setTimeout(loadSupabaseRealtime,0);\n  else window.addEventListener('load',function(){setTimeout(loadSupabaseRealtime,0);},{once:true});\n})();\n</script>'''

if old in s:
    s=s.replace(old,new,1)
elif 'HLGB v91.46 NON-BLOCKING SUPABASE LOADER' not in s:
    raise SystemExit('Blocking Supabase CDN tag not found and v91.46 marker absent')

# Visible version only. Keep historical comments/markers unchanged.
s=s.replace('<title>HLGB Confecções — Sistema de Gestão v91.45 Multiusuário</title>',
            '<title>HLGB Confecções — Sistema de Gestão v91.46 Multiusuário</title>')
s=s.replace('<b style="color:#6f3f59">Versão v91.45</b>',
            '<b style="color:#6f3f59">Versão v91.46</b>')
s=s.replace('<small style="font-size:10px;opacity:.8">v91.45</small>',
            '<small style="font-size:10px;opacity:.8">v91.46</small>')

# Best-effort client cache hints. The versioned URL can still be used to force bypass.
if 'HLGB v91.46 CACHE HINTS' not in s:
    anchor='<meta name="viewport" content="width=device-width, initial-scale=1">'
    hints='''<meta name="viewport" content="width=device-width, initial-scale=1">\n<!-- HLGB v91.46 CACHE HINTS -->\n<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n<meta http-equiv="Pragma" content="no-cache">\n<meta http-equiv="Expires" content="0">'''
    if anchor in s:s=s.replace(anchor,hints,1)

p.write_text(s,encoding='utf-8')
print('v91.46 non-blocking Supabase loader applied')
