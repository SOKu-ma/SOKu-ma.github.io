from pathlib import Path
import json
import shutil
root=Path(__file__).resolve().parents[1]
fixture=root/'dist/long-test'
fixture.mkdir(parents=True,exist_ok=True)
for name in ['index.html','showcase.mjs','state.mjs','showcase.css']:
    shutil.copyfile(root/'apps'/name,fixture/name)
c=json.loads((root/'apps/catalog.json').read_text())
for a in c['apps']:
    a['icon']='/apps/'+a['icon']
    for group in a['screenshots'].values():
        group['paths']=['/apps/'+p for p in group['paths']]
    for copy in a['copy'].values():
        copy['description']=(copy['description']+' ')*20
(fixture/'catalog.json').write_text(json.dumps(c,ensure_ascii=False))
print('Long-description fixture: http://127.0.0.1:5190/long-test/?lang=ar')
