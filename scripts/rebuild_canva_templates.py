"""Rebuild editable template layers from PPTX, preserving DrawingML artwork.

Usage: python3 scripts/rebuild_canva_templates.py
Local reference conversion only; output is excluded from deployment.
Do not redistribute third-party templates without the required rights.
Text stays editable; each non-text shape is an independent SVG layer, not a
flattened slide. Source fonts embedded in the PPTX are reused by the browser.
"""
import base64, hashlib, io, json, math, mimetypes, posixpath, struct, uuid, re
import requests
import copy
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reference-material/canva'
NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main', 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
A = '{' + NS['a'] + '}'
R = '{' + NS['r'] + '}'
SVG = 'http://www.w3.org/2000/svg'
SOURCES = {}
ET.register_namespace('', SVG)
def svg(tag, attrs=None): return ET.Element('{'+SVG+'}'+tag, {k:str(v) for k,v in (attrs or {}).items()})
def num(v): return float(v or 0)
def rels(z, path):
    rp = posixpath.join(posixpath.dirname(path), '_rels', posixpath.basename(path)+'.rels')
    if rp not in z.namelist(): return {}
    return {e.get('Id'): posixpath.normpath(posixpath.join(posixpath.dirname(path),e.get('Target'))) for e in ET.fromstring(z.read(rp))}
def val(node, name, default=None):
    e = node.find('a:'+name, NS) if node is not None else None
    return e.get('val',default) if e is not None else default

def rebuild(source, deck_id, title):
    SOURCES[hashlib.sha256(Path(source).read_bytes()).hexdigest()]=deck_id
    z=ZipFile(source); pres=ET.fromstring(z.read('ppt/presentation.xml')); size=pres.find('p:sldSz',NS)
    cx,cy=num(size.get('cx')),num(size.get('cy')); W=1920; H=round(W*cy/cx); scale=W/cx
    fonts={}; css=[]
    if 'docProps/thumbnail.jpeg' in z.namelist():
        Image.open(io.BytesIO(z.read('docProps/thumbnail.jpeg'))).save(OUT/(deck_id+'-cover.webp'),'WEBP',quality=92)
    pr=rels(z,'ppt/presentation.xml')
    for ef in pres.findall('p:embeddedFontLst/p:embeddedFont',NS):
        face=ef.find('p:font',NS).get('typeface'); family='Bloom '+face
        for variant in ['regular','bold','italic','boldItalic']:
            e=ef.find('p:'+variant,NS)
            if e is None: continue
            path=pr.get(e.get(R+'id'))
            if not path: continue
            data=z.read(path); length=struct.unpack_from('<I',data,4)[0]; raw=data[-length:]
            if raw[:4] not in (b'OTTO',b'\x00\x01\x00\x00',b'ttcf'):
                # Compressed EOT: obtain the same open-source family from Google Fonts.
                base=face.replace(' SemiBold','').replace(' Medium','').replace(' Light','')
                weight=700 if 'bold' in variant else 600 if 'SemiBold' in face else 500 if 'Medium' in face else 300 if 'Light' in face else 400
                query=base+(':ital,wght@1,'+str(weight) if 'italic' in variant.lower() else ':wght@'+str(weight))
                response=requests.get('https://fonts.googleapis.com/css2',params={'family':query,'display':'swap'},timeout=30);response.raise_for_status()
                for url in re.findall(r'url\((https://[^)]+)\)',response.text):
                    data=requests.get(url,timeout=30);data.raise_for_status();fontdata=data.content
                    filename=hashlib.sha256(fontdata).hexdigest()[:16]+'.woff2';(OUT/'fonts'/filename).write_bytes(fontdata)
                    response_text=response.text.replace(url,'/templates/canva/fonts/'+filename)
                    css.append(response_text.replace("'"+base+"'",json.dumps(family)))
                fonts[face]=family
                continue
            ext='otf' if raw[:4]==b'OTTO' else 'ttf'; filename=hashlib.sha256(raw).hexdigest()[:16]+'.'+ext
            (OUT/'fonts'/filename).write_bytes(raw)
            css.append('@font-face{font-family:'+json.dumps(family)+';src:url("/templates/canva/fonts/'+filename+'");font-weight:'+('700' if 'bold' in variant else '400')+';font-style:'+('italic' if 'Italic' in variant or variant=='italic' else 'normal')+';font-display:swap;}')
        fonts[face]=family
    media_uris={}
    def image_uri(media):
        if media in media_uris: return media_uris[media]
        raw=z.read(media); mime=mimetypes.guess_type(media)[0] or 'image/png'
        if mime.startswith('image/') and not mime.endswith('svg+xml'):
            im=Image.open(io.BytesIO(raw));im.thumbnail((2000,2000),Image.Resampling.LANCZOS);buf=io.BytesIO();im.save(buf,format='WEBP',quality=92);raw=buf.getvalue();mime='image/webp'
        uri='data:'+mime+';base64,'+base64.b64encode(raw).decode()
        media_uris[media]=uri
        return uri
    slides=[]
    for index,sid in enumerate(pres.findall('p:sldIdLst/p:sldId',NS)):
        path=pr[sid.get(R+'id')]; doc=ET.fromstring(z.read(path)); sr=rels(z,path); els=[]
        def color(fill, default='#000000'):
            if fill is None: return default
            c=fill.find('a:srgbClr',NS)
            return '#'+c.get('val') if c is not None else default
        def geometry(sp,w,h):
            custom=sp.find('a:custGeom/a:pathLst',NS)
            result=[]
            if custom is not None:
                for p in custom:
                    commands=[]
                    for cmd in p:
                        name=cmd.tag.split('}')[-1]; pts=cmd.findall('a:pt',NS)
                        xy=lambda pt: pt.get('x','0')+' '+pt.get('y','0')
                        if name=='moveTo': commands.append('M'+xy(pts[0]))
                        elif name=='lnTo': commands.append('L'+xy(pts[0]))
                        elif name=='cubicBezTo': commands.append('C'+' '.join(map(xy,pts)))
                        elif name=='quadBezTo': commands.append('Q'+' '.join(map(xy,pts)))
                        elif name=='close': commands.append('Z')
                        else: raise ValueError('Unsupported geometry command '+name)
                    pw=num(p.get('w')) or w; ph=num(p.get('h')) or h
                    result.append(svg('path',{'d':' '.join(commands),'transform':f'scale({w/pw} {h/ph})','fill-rule':'nonzero'}))
            else:
                g=sp.find('a:prstGeom',NS); kind=g.get('prst') if g is not None else 'rect'
                if kind=='ellipse': result=[svg('ellipse',{'cx':w/2,'cy':h/2,'rx':w/2,'ry':h/2})]
                else: result=[svg('rect',{'width':w,'height':h,'rx':min(w,h)*.12 if kind=='roundRect' else 0})]
            return result
        def walk(parent, transform=(0,0,1,1)):
            ox,oy,sx,sy=transform
            for node in parent:
                kind=node.tag.split('}')[-1]
                if kind=='grpSp':
                    xf=node.find('p:grpSpPr/a:xfrm',NS)
                    if xf is not None:
                        off=xf.find('a:off',NS); ext=xf.find('a:ext',NS); co=xf.find('a:chOff',NS); ce=xf.find('a:chExt',NS)
                        ax=num(ext.get('cx'))/(num(ce.get('cx')) or 1); ay=num(ext.get('cy'))/(num(ce.get('cy')) or 1)
                        walk(node,(ox+sx*(num(off.get('x'))-num(co.get('x'))*ax),oy+sy*(num(off.get('y'))-num(co.get('y'))*ay),sx*ax,sy*ay))
                    else: walk(node,transform)
                    continue
                if kind=='graphicFrame':
                    table=node.find('.//a:tbl',NS);xf=node.find('p:xfrm',NS)
                    if table is not None and xf is not None:
                        off=xf.find('a:off',NS);cols=[num(c.get('w')) for c in table.findall('a:tblGrid/a:gridCol',NS)];y=num(off.get('y'))
                        cells=ET.Element('cells')
                        for row in table.findall('a:tr',NS):
                            x=num(off.get('x'));rh=num(row.get('h'))
                            for ci,cell in enumerate(row.findall('a:tc',NS)):
                                cw=cols[ci];cp=cell.find('a:tcPr',NS)
                                if cell.get('hMerge')=='1' or cell.get('vMerge')=='1': x+=cw;continue
                                span=int(cell.get('gridSpan','1'));ch=rh
                                if span>1: cw=sum(cols[ci:ci+span])
                                fake=ET.SubElement(cells,'{'+NS['p']+'}sp');sp=ET.SubElement(fake,'{'+NS['p']+'}spPr');fx=ET.SubElement(sp,A+'xfrm')
                                ET.SubElement(fx,A+'off',{'x':str(x),'y':str(y)});ET.SubElement(fx,A+'ext',{'cx':str(cw),'cy':str(ch)})
                                if cp is not None:
                                    fill=cp.find('a:solidFill',NS)
                                    if fill is not None:sp.append(copy.deepcopy(fill))
                                    ln=cp.find('a:lnT',NS)
                                    if ln is not None:
                                        ln=copy.deepcopy(ln);ln.tag=A+'ln';sp.append(ln)
                                tx=cell.find('a:txBody',NS)
                                if tx is not None:
                                    tx=copy.deepcopy(tx);tx.tag='{'+NS['p']+'}txBody';bp=tx.find('a:bodyPr',NS)
                                    if bp is not None and cp is not None:
                                        for key,target in [('marL','lIns'),('marR','rIns'),('marT','tIns'),('marB','bIns'),('anchor','anchor')]:
                                            if cp.get(key) is not None:bp.set(target,cp.get(key))
                                    fake.append(tx)
                                x+=cols[ci]
                            y+=rh
                        walk(cells,transform)
                    continue
                if kind not in ('sp','pic'): continue
                sp=node.find('p:spPr',NS); xf=sp.find('a:xfrm',NS) if sp is not None else None
                if xf is None: continue
                off=xf.find('a:off',NS); ext=xf.find('a:ext',NS)
                if off is None or ext is None: continue
                w,h=num(ext.get('cx')),num(ext.get('cy'))
                if w<=0 or h<=0: continue
                x,y=(ox+sx*num(off.get('x')))*scale,(oy+sy*num(off.get('y')))*scale
                box={'x':x,'y':y,'w':w*sx*scale,'h':h*sy*scale,'opacity':1,'rot':num(xf.get('rot'))/60000}
                fill=sp.find('a:solidFill',NS); blip=sp.find('a:blipFill',NS)
                if blip is None: blip=node.find('p:blipFill',NS)
                line=sp.find('a:ln',NS)
                if fill is not None or blip is not None or (line is not None and line.find('a:solidFill',NS) is not None):
                    root=svg('svg',{'viewBox':f'0 0 {w} {h}','width':box['w'],'height':box['h']}); defs=svg('defs');root.append(defs)
                    paint='none'
                    if blip is not None:
                        b=blip.find('a:blip',NS); media=sr.get(b.get(R+'embed')) if b is not None else None
                        if media:
                            uri=image_uri(media)
                            pat=svg('pattern',{'id':'picture','patternUnits':'userSpaceOnUse','width':w,'height':h});defs.append(pat)
                            fr=blip.find('a:stretch/a:fillRect',NS); cr=blip.find('a:srcRect',NS)
                            l,t,r,b=[num(fr.get(k))/100000 if fr is not None else 0 for k in ('l','t','r','b')]
                            if cr is not None:
                                cl,ct,crr,cb=[num(cr.get(k))/100000 for k in ('l','t','r','b')]
                                iw=w/max(.001,1-cl-crr);ih=h/max(.001,1-ct-cb);ix=-cl*iw;iy=-ct*ih
                            else: ix=l*w;iy=t*h;iw=(1-l-r)*w;ih=(1-t-b)*h
                            pat.append(svg('image',{'href':uri,'x':ix,'y':iy,'width':iw,'height':ih,'preserveAspectRatio':'none'}));paint='url(#picture)'
                    elif fill is not None: paint=color(fill)
                    group=svg('g',{'fill':paint})
                    if xf.get('flipH')=='true' or xf.get('flipV')=='true': group.set('transform',f'translate({w if xf.get("flipH")=="true" else 0} {h if xf.get("flipV")=="true" else 0}) scale({-1 if xf.get("flipH")=="true" else 1} {-1 if xf.get("flipV")=="true" else 1})')
                    root.append(group)
                    for geom in geometry(sp,w,h):
                        if line is not None and line.find('a:solidFill',NS) is not None:
                            geom.set('stroke',color(line.find('a:solidFill',NS)));geom.set('stroke-width',line.get('w','12700'))
                        group.append(geom)
                    raw=ET.tostring(root); filename=hashlib.sha256(raw).hexdigest()[:20]+'.svg';(OUT/'artwork'/filename).write_bytes(raw)
                    els.append({'id':str(uuid.uuid4()),'type':'image',**box,'src':'/templates/canva/artwork/'+filename,'nw':box['w'],'nh':box['h'],'cutout':True})
                tx=node.find('p:txBody',NS)
                if tx is None: continue
                ps=tx.findall('a:p',NS); texts=[]; sizes=[]; props=None; para=None
                for p in ps:
                    runs=p.findall('a:r',NS)
                    texts.append(''.join((r.findtext('a:t','',NS)) for r in runs))
                    if runs and props is None: props=runs[0].find('a:rPr',NS);para=p.find('a:pPr',NS)
                    sizes.extend(num(rp.get('sz')) for r in runs if (rp:=r.find('a:rPr',NS)) is not None and rp.get('sz'))
                content='\n'.join(texts)
                if not content.strip(): continue
                fs=(max(sizes) if sizes else 2400)/100*12700*scale
                face=props.find('a:latin',NS) if props is not None else None; face=face.get('typeface') if face is not None else 'Arial'
                align=para.get('algn') if para is not None else 'l';lh=1.2
                spacing=para.find('a:lnSpc',NS) if para is not None else None
                if spacing is not None:
                    pct=spacing.find('a:spcPct',NS);pts=spacing.find('a:spcPts',NS)
                    if pct is not None: lh=num(pct.get('val'))/100000
                    elif pts is not None: lh=num(pts.get('val'))/100*12700*scale/fs
                body=tx.find('a:bodyPr',NS)
                left=num(body.get('lIns','91440'))*scale*sx if body is not None else 0
                top=num(body.get('tIns','45720'))*scale*sy if body is not None else 0
                right=num(body.get('rIns','91440'))*scale*sx if body is not None else 0
                textBox={**box,'x':x+left,'y':y+top,'w':max(1,box['w']-left-right)}
                els.append({'id':str(uuid.uuid4()),'type':'text',**textBox,'text':content,'fontSize':fs,'fontFamily':fonts.get(face,face),'font':'sans','weight':700 if (props is not None and props.get('b') in ('1','true')) or 'Bold' in face else 400,'italic':props is not None and props.get('i') in ('1','true'),'color':color(props.find('a:solidFill',NS) if props is not None else None),'align':{'ctr':'center','r':'right'}.get(align,'left'),'lineHeight':lh,'verticalAlign':{'ctr':'middle','b':'bottom'}.get(body.get('anchor') if body is not None else '', 'top'),'letterSpacing':num(props.get('spc'))/1000*12700*scale if props is not None else 0})
        bg=doc.find('p:cSld/p:bg/p:bgPr',NS)
        if bg is not None:
            fake=ET.Element('{'+NS['p']+'}sp');sp=ET.SubElement(fake,'{'+NS['p']+'}spPr')
            xf=ET.SubElement(sp,A+'xfrm');ET.SubElement(xf,A+'off',{'x':'0','y':'0'});ET.SubElement(xf,A+'ext',{'cx':str(int(cx)),'cy':str(int(cy))})
            for child in bg: sp.append(child)
            parent=ET.Element('root');parent.append(fake);walk(parent)
        tree=doc.find('p:cSld/p:spTree',NS)
        if tree is not None: walk(tree)
        slides.append({'id':str(uuid.uuid4()),'name':f'{title} · Trang {index+1}','w':W,'h':H,'bg':{'from':'#ffffff','to':'#ffffff','angle':135},'els':els,'updatedAt':1700000000000-index,'deck':{'id':deck_id,'name':title}})
    (OUT/(deck_id+'.json')).write_text(json.dumps(slides,ensure_ascii=False,indent=2))
    print(deck_id,len(slides),'pages',sum(len(s['els']) for s in slides),'editable layers')
    return css

def main():
    (OUT/'artwork').mkdir(exist_ok=True);(OUT/'fonts').mkdir(exist_ok=True)
    sources=[('Kraft*.pptx','deck-kraft-vn','Cẩm nang Du lịch Việt Nam'),('Bài thuyết trình Giáo*.pptx','deck-edu-doodle','Giáo dục & Phân tích Tác phẩm'),('Bài thuyết trình tiệc*.pptx','deck-scrapbook','Sổ lưu niệm & Kế hoạch 10 năm'),('Vert*.pptx','deck-ecosse','Roadtrip Écosse & Khám phá')]
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--extra-source-dir',type=Path);args=parser.parse_args()
    css=[]
    if args.extra_source_dir:
        extras=[('history','deck-history-report','Báo cáo Lịch sử & Nghiên cứu'),('marketing','deck-marketing-analysis','Phân tích Chiến dịch Tiếp thị'),('nouveau','deck-art-nouveau','Nghệ thuật Cổ điển (Art Nouveau)'),('minimal','deck-modern-minimal','Ý tưởng Động não (Modern Minimal)')]
        for source,did,title in extras:css+=rebuild(args.extra_source_dir/(source+'.pptx'),did,title)
    for pattern,did,title in sources:
        source=next(ROOT.glob(pattern));css+=rebuild(source,did,title)
    (OUT/'fonts.css').write_text('\n'.join(dict.fromkeys(css)))
    (OUT/'sources.json').write_text(json.dumps(SOURCES,indent=2))
if __name__=='__main__':main()
