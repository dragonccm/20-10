"""Move embedded media out of Tiny HTML without changing any decoded media bytes."""
from pathlib import Path
import base64,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'public/tiny.html';source=p.read_text();out=ROOT/'public/tiny-assets';out.mkdir(exist_ok=True)
pattern=r'data:((?:image|audio)/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)'
extensions={'image/webp':'webp','image/png':'png','image/jpeg':'jpg','audio/mpeg':'mp3'}
count=0

def extract(match):
 global count
 mime,data=match.groups()
 if mime not in extensions:return match.group(0)
 decoded=base64.b64decode(data,validate=True);name=hashlib.sha256(decoded).hexdigest()[:20]+'.'+extensions[mime]
 target=out/name;target.write_bytes(decoded);assert target.read_bytes()==decoded
 count+=1
 return '/tiny-assets/'+name

result=re.sub(pattern,extract,source)
if count:p.write_text(result)
print(f'Extracted {count} unchanged media references. HTML: {len(source.encode()):,} -> {len(result.encode()):,} bytes.')
