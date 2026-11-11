"""Regression checks for bundled deck fidelity and deployable assets.

Pass the original PPTX files to also verify slide counts and text coverage:
  python3 scripts/verify_canva_templates.py *.pptx /tmp/bloom-sources/*.pptx
"""
import hashlib,json,re,sys,posixpath
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1];PUBLIC=ROOT/'public';BASE=ROOT/'reference-material/canva'
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
sources=json.loads((BASE/'sources.json').read_text());total=0
for path in BASE.glob('deck-*.json'):
 slides=json.loads(path.read_text());assert slides,path
 for slide in slides:
  assert slide['w']>0 and slide['h']>0
  for el in slide['els']:
   assert el['w']>0 and el['h']>0,(path,el)
   if el.get('src','').startswith('/'):
    asset=BASE/el['src'].removeprefix('/templates/canva/');assert asset.is_file(),asset
    if asset.suffix=='.svg':
     ET.fromstring(asset.read_bytes())
     assert not re.search(r'(?:href|src)="https?://',asset.read_text()),asset
  total+=1
for url in re.findall(r'url\(["\']?(/[^)"\']+)',(BASE/'fonts.css').read_text()):assert (BASE/url.removeprefix('/templates/canva/')).is_file(),url
for arg in sys.argv[1:]:
 path=Path(arg);key=hashlib.sha256(path.read_bytes()).hexdigest();assert key in sources,path
 slides=json.loads((BASE/(sources[key]+'.json')).read_text())
 with ZipFile(path) as z:
  pres=ET.fromstring(z.read('ppt/presentation.xml'));ids=pres.findall('p:sldIdLst/p:sldId',ns);assert len(ids)==len(slides),(path,len(ids),len(slides))
  rels={r.get('Id'):r.get('Target') for r in ET.fromstring(z.read('ppt/_rels/presentation.xml.rels'))}
  for i,sid in enumerate(ids):
   target=rels[sid.get('{'+ns['r']+'}id')];target=posixpath.normpath(posixpath.join('ppt',target))
   original=ET.fromstring(z.read(target));combined='\n'.join(el.get('text','') for el in slides[i]['els'])
   missing=[t.text for t in original.findall('.//a:t',ns) if t.text and t.text.strip() and t.text not in combined]
   assert not missing,(path.name,i+1,missing)
 print(path.name,': all pages and text retained')
print(f'Validated {total} pages, artwork references and font files.')
