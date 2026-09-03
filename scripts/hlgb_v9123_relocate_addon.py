from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker='<!-- HLGB v91.23 PROJECTION INTEGRITY -->'
start=s.find(marker)
if start < 0:
    raise SystemExit('v91.23 marker not found after patch')
end=s.find('</script>', start)
if end < 0:
    raise SystemExit('v91.23 addon closing script not found')
end += len('</script>')
block=s[start:end]
s=s[:start]+s[end:]
body=s.rfind('</body>')
if body < 0:
    raise SystemExit('final body closing tag not found')
s=s[:body]+block+'\n'+s[body:]
p.write_text(s,encoding='utf-8')
print('relocated v91.23 addon before final body close')
