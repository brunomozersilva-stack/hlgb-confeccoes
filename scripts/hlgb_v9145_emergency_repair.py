from pathlib import Path
import re

idx = Path('index.html')
s = idx.read_text(encoding='utf-8')
marker45 = '<!-- HLGB v91.45 EMERGENCY FULL-PAGE JS REPAIR -->'
marker39 = '<!-- HLGB v91.39 UI BINDINGS + LOCAL PRODUCTION + SEPARATION CLEANUP -->'
start_token = '  window.renderSeparationList=function(){'

if marker45 not in s:
    start = s.find(start_token)
    if start < 0:
        raise SystemExit('Broken v91.38 renderSeparationList start not found')
    end = s.find(marker39, start)
    if end < 0:
        raise SystemExit('v91.39 marker not found after broken v91.38 block')

    repair = '''  // v91.45: the v91.38 renderSeparationList override was truncated in the published HTML.
  // Keep the previous working renderSeparationList implementation instead of executing malformed code.
})();
</script>

''' + marker45 + '\n'
    s = s[:start] + repair + s[end:]

# Version labels only; no business data is changed.
s = s.replace('v91.44 Multiusuário', 'v91.45 Multiusuário')
s = s.replace('Versão v91.44', 'Versão v91.45')
s = s.replace('>v91.44</small>', '>v91.45</small>')

idx.write_text(s, encoding='utf-8')
print('Applied HLGB v91.45 emergency full-page JavaScript repair')
