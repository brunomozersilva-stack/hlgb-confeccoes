from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
marker='<!-- HLGB v91.22 PEDIDO AVULSO -->'
pos=s.find(marker)
if pos<0:
    raise SystemExit('v91.22 marker not found')
end=s.find('</script>',pos)
if end<0:
    raise SystemExit('v91.22 script end not found')
end+=len('</script>')
addon=s[pos:end]
s=s[:pos]+s[end:]
body=s.rfind('</body>')
if body<0:
    raise SystemExit('final body closing tag not found')
s=s[:body]+addon+'\n'+s[body:]
p.write_text(s,encoding='utf-8')
print('relocated v91.22 addon before final body')
