"""Validate the scripts actually parsed by HTML, including printing templates."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys
import tempfile


class ScriptParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.current = None
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            self.current = ''

    def handle_data(self, data):
        if self.current is not None:
            self.current += data

    def handle_endtag(self, tag):
        if tag == 'script' and self.current is not None:
            self.scripts.append(self.current)
            self.current = None


for filename in sys.argv[1:]:
    source = Path(filename).read_text(encoding='utf-8')
    parser = ScriptParser()
    parser.feed(source)
    assert parser.current is None, f'{filename}: unterminated script'
    assert parser.scripts, f'{filename}: no scripts found'
    with tempfile.TemporaryDirectory() as directory:
        for index, script in enumerate(parser.scripts):
            path = Path(directory) / f'script-{index}.js'
            path.write_text(script, encoding='utf-8')
            subprocess.run(['node', '--check', str(path)], check=True)
    print(f'{filename}: {len(parser.scripts)} scripts validated')
