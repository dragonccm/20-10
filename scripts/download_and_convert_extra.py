import os, sys, urllib.request, zipfile, xml.etree.ElementTree as ET, json, io, uuid
from PIL import Image

ns = {
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
}

W = 1920
H = 1080

def clean_tag(tag):
    return tag.split('}')[-1]

def download_file(url, out_path):
    print(f"Downloading from {url} to {out_path}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as res:
        data = res.read()
        with open(out_path, 'wb') as f:
            f.write(data)
    print(f"Saved {out_path} ({len(data)//1024} KB)")

def parse_presentation(pptx_path, deck_id, deck_name, prefix, max_slides=10):
    with zipfile.ZipFile(pptx_path) as z:
        pres_xml = ET.fromstring(z.read('ppt/presentation.xml'))
        sldIdLst = pres_xml.find('p:sldIdLst', ns)
        sldSz = pres_xml.find('p:sldSz', ns)
        cx = int(sldSz.attrib.get('cx', '18288000'))
        cy = int(sldSz.attrib.get('cy', '10287000'))
        
        pres_rels = {}
        if 'ppt/_rels/presentation.xml.rels' in z.namelist():
            for rel in ET.fromstring(z.read('ppt/_rels/presentation.xml.rels')):
                pres_rels[rel.attrib['Id']] = rel.attrib['Target']
                
        slide_paths = []
        for sldId in sldIdLst:
            rId = sldId.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            target = pres_rels.get(rId)
            if target:
                if not target.startswith('ppt/'):
                    target = 'ppt/' + target.lstrip('/')
                slide_paths.append(target)
                
        slide_paths = slide_paths[:max_slides]
        saved_images = {}
        
        def save_media(target_rel_path, slide_dir):
            full_path = os.path.normpath(os.path.join(slide_dir, target_rel_path))
            if full_path in saved_images:
                return saved_images[full_path]
            if full_path not in z.namelist():
                return None
            data = z.read(full_path)
            ext = full_path.split('.')[-1].lower()
            if ext in ('svg', 'xml'):
                return None
            try:
                img = Image.open(io.BytesIO(data))
                max_dim = 1600
                if img.width > max_dim or img.height > max_dim:
                    s = min(max_dim / img.width, max_dim / img.height)
                    nw = int(img.width * s)
                    nh = int(img.height * s)
                    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
                
                has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
                out_name = f'{prefix}_{len(saved_images)+1}.webp'
                out_disk = os.path.join('public/templates/canva/images', out_name)
                
                if has_alpha:
                    img = img.convert('RGBA')
                    img.save(out_disk, 'WEBP', quality=85)
                else:
                    img = img.convert('RGB')
                    img.save(out_disk, 'WEBP', quality=80)
                    
                web_url = f'/templates/canva/images/{out_name}'
                saved_images[full_path] = (web_url, img.width, img.height, has_alpha)
                return saved_images[full_path]
            except Exception as e:
                return None

        designs = []
        for s_idx, s_path in enumerate(slide_paths):
            s_xml = ET.fromstring(z.read(s_path))
            s_dir = os.path.dirname(s_path)
            
            s_rels = {}
            s_rels_path = os.path.join(s_dir, '_rels', os.path.basename(s_path) + '.rels')
            if s_rels_path in z.namelist():
                for rel in ET.fromstring(z.read(s_rels_path)):
                    s_rels[rel.attrib['Id']] = rel.attrib['Target']
                    
            els = []
            
            def get_xfrm(node):
                xfrm = node.find('.//a:xfrm', ns)
                if xfrm is None:
                    return None
                off = xfrm.find('a:off', ns)
                ext = xfrm.find('a:ext', ns)
                if off is None or ext is None:
                    return None
                return {
                    'x': int(off.attrib.get('x', 0)),
                    'y': int(off.attrib.get('y', 0)),
                    'w': int(ext.attrib.get('cx', 0)),
                    'h': int(ext.attrib.get('cy', 0))
                }
                
            def walk(parent, tf):
                for node in parent:
                    tag = clean_tag(node.tag)
                    if tag == 'grpSp':
                        grpPr = node.find('p:grpSpPr', ns)
                        xf = grpPr.find('a:xfrm', ns) if grpPr is not None else None
                        if xf is not None:
                            off = xf.find('a:off', ns)
                            ext = xf.find('a:ext', ns)
                            chOff = xf.find('a:chOff', ns)
                            chExt = xf.find('a:chExt', ns)
                            if off is not None and ext is not None and chOff is not None and chExt is not None:
                                ox, oy = int(off.attrib['x']), int(off.attrib['y'])
                                sx = float(ext.attrib['cx']) / (float(chExt.attrib['cx']) or 1.0)
                                sy = float(ext.attrib['cy']) / (float(chExt.attrib['cy']) or 1.0)
                                cxo, cyo = int(chOff.attrib['x']), int(chOff.attrib['y'])
                                inner = lambda b, ox=ox, oy=oy, sx=sx, sy=sy, cxo=cxo, cyo=cyo, tf=tf: tf({
                                    'x': ox + (b['x'] - cxo) * sx,
                                    'y': oy + (b['y'] - cyo) * sy,
                                    'w': b['w'] * sx,
                                    'h': b['h'] * sy
                                })
                                walk(node, inner)
                                continue
                        walk(node, tf)
                        continue
                        
                    if tag not in ('sp', 'pic'):
                        continue
                        
                    xf = get_xfrm(node)
                    if not xf:
                        continue
                    b = tf(xf)
                    
                    x_px = int(round((b['x'] / cx) * W))
                    y_px = int(round((b['y'] / cy) * H))
                    w_px = max(10, int(round((b['w'] / cx) * W)))
                    h_px = max(10, int(round((b['h'] / cy) * H)))
                    
                    blip = node.find('.//a:blip', ns)
                    if blip is not None:
                        embed = blip.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                        target = s_rels.get(embed)
                        if target:
                            m = save_media(target, s_dir)
                            if m:
                                web_url, nw, nh, alpha = m
                                els.append({
                                    'id': str(uuid.uuid4())[:8],
                                    'type': 'image',
                                    'x': x_px, 'y': y_px, 'w': w_px, 'h': h_px,
                                    'opacity': 1,
                                    'src': web_url,
                                    'nw': nw, 'nh': nh,
                                    'cutout': alpha or None
                                })
                                continue
                                
                    spPr = node.find('p:spPr', ns)
                    solidFill = spPr.find('.//a:solidFill', ns) if spPr is not None else None
                    fill_hex = None
                    if solidFill is not None:
                        srgb = solidFill.find('a:srgbClr', ns)
                        if srgb is not None:
                            fill_hex = '#' + srgb.attrib.get('val', '').lower()
                            
                    geom = spPr.find('.//a:prstGeom', ns) if spPr is not None else None
                    prst = geom.attrib.get('prst', '') if geom is not None else ''
                    
                    txBody = node.find('p:txBody', ns)
                    text_paragraphs = []
                    text_color = None
                    font_size = 36
                    is_bold = False
                    is_serif = False
                    align = 'left'
                    
                    if txBody is not None:
                        for p in txBody.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}p'):
                            pPr = p.find('a:pPr', ns)
                            if pPr is not None:
                                algn = pPr.attrib.get('algn')
                                if algn == 'ctr': align = 'center'
                                elif algn == 'r': align = 'right'
                                
                            p_text = ''
                            for r in p.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}r'):
                                rPr = r.find('a:rPr', ns)
                                if rPr is not None:
                                    if rPr.attrib.get('b') == '1': is_bold = True
                                    sz = rPr.attrib.get('sz')
                                    if sz:
                                        pt = int(sz) / 100
                                        font_size = max(14, int(round(pt * 1.333)))
                                    latin = rPr.find('a:latin', ns)
                                    if latin is not None:
                                        typeface = latin.attrib.get('typeface', '').lower()
                                        if any(k in typeface for k in ['serif', 'playfair', 'georgia', 'times', 'baskerville', 'bodoni']):
                                            is_serif = True
                                    srgb = rPr.find('.//a:srgbClr', ns)
                                    if srgb is not None and not text_color:
                                        text_color = '#' + srgb.attrib.get('val', '').lower()
                                t = r.find('a:t', ns)
                                if t is not None and t.text:
                                    p_text += t.text
                            if p_text.strip():
                                text_paragraphs.append(p_text.strip())
                                
                    full_text = '\n'.join(text_paragraphs).strip()
                    
                    if fill_hex and (w_px > 15 and h_px > 15):
                        if not (x_px <= 10 and y_px <= 10 and w_px >= 1900 and h_px >= 1060):
                            shape_type = 'circle' if prst in ('ellipse', 'circle') else 'rect'
                            radius = 20 if prst == 'roundRect' else 0
                            els.append({
                                'id': str(uuid.uuid4())[:8],
                                'type': shape_type,
                                'x': x_px, 'y': y_px, 'w': w_px, 'h': h_px,
                                'opacity': 1,
                                'fill': fill_hex,
                                'radius': radius
                            })
                            
                    if full_text:
                        els.append({
                            'id': str(uuid.uuid4())[:8],
                            'type': 'text',
                            'x': x_px, 'y': y_px, 'w': w_px, 'h': max(h_px, 50),
                            'opacity': 1,
                            'text': full_text,
                            'fontSize': font_size,
                            'color': text_color or '#1e293b',
                            'weight': 700 if is_bold else 400,
                            'align': align,
                            'font': 'serif' if is_serif else 'sans'
                        })

            spTree = s_xml.find('p:cSld/p:spTree', ns)
            if spTree is not None:
                walk(spTree, lambda b: b)
                
            bg_color = '#ffffff'
            bgNode = s_xml.find('.//p:bg', ns)
            if bgNode is not None:
                srgb = bgNode.find('.//a:srgbClr', ns)
                if srgb is not None:
                    bg_color = '#' + srgb.attrib.get('val', '').lower()
            else:
                if prefix == 'history': bg_color = '#fbf8f3'
                elif prefix == 'mkt': bg_color = '#f8fafc'
                elif prefix == 'nouveau': bg_color = '#fdfbf7'
                elif prefix == 'minimal': bg_color = '#f4f4f5'
                
            designs.append({
                'id': str(uuid.uuid4()),
                'name': f'{deck_name} · Slide {s_idx + 1}',
                'w': W,
                'h': H,
                'bg': {'from': bg_color, 'to': bg_color, 'angle': 135},
                'els': els,
                'updatedAt': 1700000000000 - s_idx * 1000,
                'deck': {'id': deck_id, 'name': deck_name}
            })
            
        print(f'{deck_name}: successfully converted {len(designs)} slides!')
        return designs

os.makedirs('/tmp/sc_downloads', exist_ok=True)

decks_to_fetch = [
    ('https://www.slidescarnival.com/download/sc04739/history-report-presentation/pptx', '/tmp/sc_downloads/history.pptx', 'deck-history-report', 'Báo cáo Lịch sử & Xã hội', 'history'),
    ('https://www.slidescarnival.com/download/sc04733/marketing-campaign-analysis-report-presentation/pptx', '/tmp/sc_downloads/marketing.pptx', 'deck-marketing-analysis', 'Phân tích Chiến dịch & Tiếp thị', 'mkt'),
    ('https://www.slidescarnival.com/download/sc00499/vintage-art-nouveau-style/pptx', '/tmp/sc_downloads/nouveau.pptx', 'deck-art-nouveau', 'Nghệ thuật Cổ điển (Art Nouveau)', 'nouveau'),
    ('https://www.slidescarnival.com/download/sc01331/modern-minimal-brainstorm-presentation/pptx', '/tmp/sc_downloads/minimal.pptx', 'deck-modern-minimal', 'Ý tưởng Sáng tạo (Modern Minimal)', 'minimal'),
]

for url, pptx_file, did, name, pref in decks_to_fetch:
    try:
        download_file(url, pptx_file)
        designs = parse_presentation(pptx_file, did, name, pref, max_slides=10)
        out_file = f'public/templates/canva/{did}.json'
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(designs, f, ensure_ascii=False, indent=2)
        print(f"Generated {out_file} ({os.path.getsize(out_file)//1024} KB)")
    except Exception as e:
        print(f"Failed {name}: {e}")
