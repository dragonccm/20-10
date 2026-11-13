const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const Module = require('node:module')
const originalResolve = Module._resolveFilename
Module._resolveFilename = function (name, ...args) { return originalResolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args) }
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, file)
const {FORMATS} = require('../lib/studio/design-formats.ts')
const {BLOOM_TEMPLATES,buildBloomDesign,buildBloomDeck} = require('../lib/studio/bloom-templates.ts')
const {CV_THEMES} = require('../components/studio/cv-preview.tsx')
const {WORKSPACE_NAMES,htmlTemplate,sheetTemplate,documentTemplate} = require('../lib/studio/workspace-templates.ts')
const {cellValue,sheetCsv} = require('../lib/studio/sheet-calc.ts')
const {applyDesignAction,designContext} = require('../lib/studio/design-actions.ts')
const allNames=[]
test('each of the 11 categories has 20 usable original templates', () => {
 assert.equal(FORMATS.length,11)
 for(const format of FORMATS){const list=format.id==='cv'?CV_THEMES:WORKSPACE_NAMES[format.id]||BLOOM_TEMPLATES.filter(t=>t.category===format.id);assert.equal(list.length,20,format.id);const names=list.map(t=>typeof t==='string'?t:t.name);assert.equal(new Set(names).size,20,format.id);allNames.push(...names)}
 assert.equal(allNames.length,220)
})
test('native templates have editable layers, unique identities and no third-party URLs', () => {
 for(const meta of BLOOM_TEMPLATES){const d=buildBloomDesign(meta);assert.ok(d.els.length>=3);assert.equal(d.provenance.license,'CC0-1.0');assert.equal(new Set(d.els.map(e=>e.id)).size,d.els.length);for(const el of d.els){assert.ok(el.w>0&&el.h>0,meta.id);assert.ok(Number.isFinite(el.x)&&Number.isFinite(el.y));if(el.src)assert.ok(el.src.startsWith('data:image/svg+xml;'),meta.id)}assert.ok(!JSON.stringify(d).includes('/templates/canva/'))}
 for(const meta of BLOOM_TEMPLATES.filter(t=>t.category==='presentations')){const pages=buildBloomDeck(meta);assert.equal(pages.length,5);assert.equal(new Set(pages.map(d=>d.id)).size,5);assert.equal(new Set(pages.map(d=>d.deck.id)).size,1)}
})
test('original illustration frames crop to their exact aspect instead of stretching artwork', () => {
 let frames=0
 for(const meta of BLOOM_TEMPLATES){
  const pages=meta.category==='presentations'?buildBloomDeck(meta):[buildBloomDesign(meta)]
  for(const d of pages)for(const e of d.els.filter(e=>e.type==='image')){
   frames++
   assert.ok(e.crop,'missing crop: '+meta.name)
   assert.ok(Math.abs((e.nw*e.crop.w)/(e.nh*e.crop.h)-e.w/e.h)<1e-8,meta.name+' distorts an illustration')
   assert.ok(!decodeURIComponent(e.src).includes('ẢNH CỦA BẠN'),meta.name+' still uses the repeated landscape placeholder')
  }
 }
 assert.ok(frames>100)
})
test('HTML and email templates export self-contained source, documents contain editable sections', () => {
 for(const kind of ['code','websites','email'])for(let i=0;i<20;i++){const html=htmlTemplate(kind,i);assert.ok(html.startsWith('<!doctype html>'));assert.ok(html.includes(WORKSPACE_NAMES[kind][i]));assert.ok(!/(?:src|href)=["']https?:\/\//i.test(html));if(kind==='email'){assert.ok(html.includes('<table'));assert.ok(!html.includes('<script'))}}
 for(let i=0;i<20;i++)assert.ok(documentTemplate(i).html.includes('<h2>'))
})
test('spreadsheet arithmetic, references, ranges, text values and cycles', () => {
 const rows=[['2','3','=A1+B1*2'],['4','', '=SUM(A1:B2)'],['word','5','=AVERAGE(A1:B3)'],['=A4','','=COUNT(A1:B3)']]
 assert.equal(cellValue(rows,0,2),8);assert.equal(cellValue(rows,1,2),9);assert.equal(cellValue(rows,2,2),3.5);assert.equal(cellValue(rows,3,2),4);assert.equal(cellValue(rows,3,0),'#CYCLE!')
 assert.equal(cellValue([['=1/0']],0,0),'#VALUE!');assert.equal(cellValue([['=2*(3+4)']],0,0),14);assert.equal(cellValue([['=fetch("https://invalid")']],0,0),'#VALUE!')
 for(let i=0;i<20;i++){const cells=sheetTemplate(i);for(let r=0;r<cells.length;r++)for(let c=0;c<cells[r].length;c++)assert.ok(!String(cellValue(cells,r,c)).startsWith('#'),'template '+i)}
 assert.ok(sheetCsv([['@cmd','a"b','x,y']]).includes('"\'@cmd"'));assert.ok(sheetCsv([['a"b']]).includes('a""b'))
})
const design={id:'page',name:'Draft',w:1080,h:1080,bg:{from:'#ffffff',to:'#ffffff',angle:135},els:[{id:'title',type:'text',x:50,y:50,w:700,h:100,opacity:1,text:'Original',fontSize:64},{id:'photo',type:'image',x:20,y:200,w:300,h:200,opacity:1,src:'data:image/png;base64,private'},{id:'locked',type:'rect',x:0,y:0,w:200,h:100,opacity:1,fill:'#eeeeee',locked:true}],updatedAt:1}
const propose=operations=>({summary:'Sửa tiêu đề',operations})
test('AI applies only validated commands while preserving original objects and images',()=>{
 const result=applyDesignAction(design,propose([{op:'update',id:'title',changes:{text:'New title'}}]),{selectedId:'title',idFactory:()=> 'new'})
 assert.equal(result.design.els[0].text,'New title');assert.equal(design.els[0].text,'Original');assert.strictEqual(result.design.els[1],design.els[1]);assert.equal(designContext(design,'title').els.length,1);assert.ok(!JSON.stringify(designContext(design)).includes('base64'))
})
test('AI rejects locked layers, scope escapes, unknown IDs and injected properties without mutating the draft',()=>{
 const before=JSON.stringify(design)
 for(const ops of [[{op:'update',id:'locked',changes:{fill:'#000000'}}],[{op:'update',id:'missing',changes:{text:'x'}}],[{op:'update',id:'photo',changes:{src:'https://invalid'}}],[{op:'add',element:{type:'image',src:'https://invalid',x:0,y:0,w:200,h:200}}]])assert.throws(()=>applyDesignAction(design,propose(ops),{idFactory:()=> 'new'}))
 assert.throws(()=>applyDesignAction(design,propose([{op:'remove',id:'photo'}]),{selectedId:'title',idFactory:()=> 'new'}));assert.throws(()=>applyDesignAction(design,propose([{op:'background',from:'#000000',to:'#000000',angle:135}]),{selectedId:'title',idFactory:()=> 'new'}));assert.equal(JSON.stringify(design),before)
})
const {parseDesignBackup}=require('../lib/studio/design-backup.ts')
test('editable canvas bundles round-trip without reusing design IDs; unsafe image URLs are rejected',()=>{
 const meta=BLOOM_TEMPLATES.find(t=>t.category==='photos');const original=buildBloomDesign(meta);const restored=parseDesignBackup(JSON.parse(JSON.stringify(original)));assert.equal(restored.length,1);assert.notEqual(restored[0].id,original.id);assert.equal(restored[0].els.length,original.els.length);assert.equal(restored[0].els[0].src,original.els[0].src)
 const slides=BLOOM_TEMPLATES.filter(t=>t.category==='presentations').map(t=>buildBloomDeck(t));assert.equal(parseDesignBackup({collection:'Bloom Original',templates:slides}).length,100)
 const bad={...original,els:[{id:'bad',type:'image',x:0,y:0,w:200,h:200,opacity:1,src:'javascript:alert(1)'}]};assert.throws(()=>parseDesignBackup(bad))
})
test('Tiny initial HTML stays below 1 MB and extracted media matches its content hash',()=>{
 const crypto=require('node:crypto');const html=fs.readFileSync(path.join(root,'public/tiny.html'),'utf8');assert.ok(Buffer.byteLength(html)<1_000_000)
 const assets=[...html.matchAll(/\/tiny-assets\/([a-f0-9]{20}\.[a-z0-9]+)/g)];assert.ok(assets.length>=16)
 for(const [,name]of assets){const bytes=fs.readFileSync(path.join(root,'public/tiny-assets',name));assert.ok(crypto.createHash('sha256').update(bytes).digest('hex').startsWith(name.split('.')[0]))}
 assert.equal(fs.existsSync(path.join(root,'public/templates/canva')),false)
})

test('replacing a framed photo preserves natural aspect ratio', () => {
 const {coverCrop}=require('../lib/studio/imagefx.ts')
 assert.deepEqual(coverCrop(400,300,100,100),{x:.125,y:0,w:.75,h:1})
 const portrait=coverCrop(200,300,100,100)
 assert.ok(Math.abs(portrait.y-1/6)<1e-10)
 assert.ok(Math.abs(portrait.h-2/3)<1e-10)
 assert.deepEqual(coverCrop(0,300,100,100),{x:0,y:0,w:1,h:1})
})
test('all inline Tiny scripts parse and the flower frame remains a valid string', () => {
 const vm=require('node:vm'),html=fs.readFileSync(path.join(root,'public/tiny.html'),'utf8')
 let count=0
 for(const [,attrs,body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(/\bsrc=|application\/(ld\+)?json/i.test(attrs))continue
  assert.doesNotThrow(()=>new vm.Script(body),attrs);count++
 }
 assert.equal(count,15)
 const flower=html.match(/const flowerDoc = ("(?:\\.|[^"\\])*");/)
 assert.ok(flower);assert.ok(JSON.parse(flower[1]).endsWith('</body></html>'))
})
test('native collections differ in composition even when text and colors are ignored', () => {
 for(const category of ['presentations','social','photos','print','whiteboard']){
  const scenes=BLOOM_TEMPLATES.filter(t=>t.category===category).map(t=>buildBloomDesign(t))
  const geometry=d=>JSON.stringify(d.els.filter(e=>e.type!=='text').map(e=>[e.type,...[e.x/d.w,e.y/d.h,e.w/d.w,e.h/d.h,e.rot||0].map(v=>Math.round(v*1000))]))
  assert.equal(new Set(scenes.map(geometry)).size,20,category+' repeats a visual composition')
  for(const scene of scenes)for(const e of scene.els.filter(e=>e.type==='text')){
   assert.ok(e.x>=0&&e.y>=0&&e.x+e.w<=scene.w+2,scene.name+': text outside horizontal bounds '+e.text)
   assert.ok(e.y+e.h<=scene.h+2,scene.name+': text outside vertical bounds '+e.text)
  }
 }
})
test('all twenty CV arrangements preserve the user profile and experience', () => {
 const {renderToStaticMarkup}=require('react-dom/server')
 const {CvPreview,SAMPLE_CV}=require('../components/studio/cv-preview.tsx')
 const React=require('react')
 assert.equal(new Set(CV_THEMES.map(t=>t.layout)).size,20)
 for(const theme of CV_THEMES){
  const html=renderToStaticMarkup(React.createElement(CvPreview,{cv:SAMPLE_CV,theme}))
  for(const content of [SAMPLE_CV.name,SAMPLE_CV.email,SAMPLE_CV.education[0].school,SAMPLE_CV.experience[0].org,SAMPLE_CV.projects[0].name])assert.ok(html.includes(content),theme.name+' loses '+content)
 }
})
test('HTML and document collections contain distinct structures and contextual content', () => {
 const skeleton=html=>Array.from(html.matchAll(/<([a-z][a-z0-9]*)\b/gi),m=>m[1]).join(',')
 for(const kind of ['websites','email']){
  const structures=Array.from({length:20},(_,i)=>skeleton(htmlTemplate(kind,i)))
  assert.equal(new Set(structures).size,20,kind+' repeats page structure')
 }
 assert.ok(new Set(Array.from({length:20},(_,i)=>skeleton(documentTemplate(i).html))).size>=17)
 assert.equal(new Set(Array.from({length:20},(_,i)=>sheetTemplate(i)[0].join('|'))).size,20)
})
test('video editing is absent from the supported template catalog', () => {
 assert.ok(!FORMATS.some(f=>f.id==='video'))
 assert.equal(WORKSPACE_NAMES.video,undefined)
})
test('interior slide pages vary across decks and keep text inside the slide', () => {
 const decks=BLOOM_TEMPLATES.filter(t=>t.category==='presentations')
 for(let page=1;page<5;page++){
  const structures=decks.map(meta=>{
   const d=buildBloomDesign(meta,page)
   for(const e of d.els.filter(e=>e.type==='text'))assert.ok(e.x>=0&&e.y>=0&&e.x+e.w<=d.w+2&&e.y+e.h<=d.h+2,meta.name+' page '+page+': '+e.text)
   return JSON.stringify(d.els.filter(e=>e.type!=='text').map(e=>[e.type,e.x,e.y,e.w,e.h,e.rot||0]))
  })
  assert.equal(new Set(structures).size,20,'repeated layout on interior page '+page)
 }
})
test('companion chat mode cannot propose actions; help mode stays within supported tools', () => {
 const {companionReply,scopeCompanionReply}=require('../lib/studio/companion.ts')
 const result=companionReply.parse({reply:'Mình có thể soạn một bản nháp.',draft:{title:'Ghi chú',text:'Nội dung'},tool:'writing'})
 assert.deepEqual(scopeCompanionReply(result,'chat'),{reply:result.reply,draft:null,tool:null})
 assert.equal(scopeCompanionReply(result,'help').draft.title,'Ghi chú')
 assert.equal(companionReply.safeParse({...result,tool:'https://example.com'}).success,false)
 assert.equal(companionReply.safeParse({...result,execute:'delete-all'}).success,false)
 assert.equal(companionReply.safeParse({...result,draft:{title:'',text:'abc'}}).success,false)
})
const knowledge=require('../lib/studio/document-knowledge.ts')
test('long documents keep every page and character, including the final section',async()=>{
 const parts=Array.from({length:123},(_,i)=>`Page ${i+1}\n`+('Meaningful paragraph about topic '+i+'.\n').repeat(410));parts[122]+='Final unique conclusion: ZEPHYR has 47 participants.'
 const doc={id:'long',name:'long.pdf',fileKind:'pdf',parts,text:parts.join('\n')},chunks=knowledge.documentChunks(doc)
 for(let i=0;i<parts.length;i++)assert.equal(chunks.filter(c=>c.page===i+1).map(c=>c.text).join(''),parts[i])
 assert.ok(knowledge.retrieveChunks(chunks,'ZEPHYR participants').some(c=>c.page===123))
 const hash=await knowledge.documentFingerprint(doc);assert.notEqual(await knowledge.documentFingerprint({...doc,parts:[...parts.slice(0,-1),'Changed ending']}),hash)
 const quote='ZEPHYR has 47 participants.'
 assert.deepEqual(knowledge.verifiedEvidence([{page:123,quote},{page:1,quote},{page:123,quote:'Invented source quote'}],chunks),[{page:123,quote}])
 assert.equal(knowledge.verifiedEvidence([{page:123,quote:'ZEPHYR\n has 47 participants.'}],chunks).length,1)
})
test('file operations preserve ordering, handle name collisions and isolate email headers',async()=>{
 const {pageSelection,renamedFiles,pdfTools,renameZip,emlDraft}=require('../lib/studio/file-tools.ts'),{PDFDocument}=require('pdf-lib'),{unzipSync}=require('fflate')
 assert.deepEqual(pageSelection('5,1,2-4,5',6),[4,0,1,2,3]);for(const v of ['0','4-2','1,x','1-7'])assert.throws(()=>pageSelection(v,6))
 assert.deepEqual(renamedFiles(['A.pdf','a.pdf','b.pdf'],'',1,'b','a'),['A.pdf','a (2).pdf','a (3).pdf'])
 const source=await PDFDocument.create();for(let i=0;i<123;i++)source.addPage([200+i,400]);const file=new File([await source.save()],'long.pdf');const bytes=await pdfTools([file],'123,1-2',90);const result=await PDFDocument.load(bytes)
 assert.equal(result.getPageCount(),3);assert.equal(result.getPages()[0].getWidth(),322);assert.equal(result.getPages()[1].getWidth(),200);assert.equal(result.getPages()[0].getRotation().angle,90)
 const ac=new AbortController();ac.abort();await assert.rejects(()=>pdfTools([file],'',0,ac.signal))
 const zipped=unzipSync(await renameZip([new File(['a'],'x'),new File(['b'],'y')],['__proto__','b.txt']));assert.equal(zipped['files/__proto__'][0],97)
 const eml=emlDraft('a@example.test\r\nBcc: stolen@example.test','Cảm ơn\r\nX-Hack: true','Line1\nLine2');assert.ok(!eml.includes('\r\nBcc:'));assert.ok(eml.includes('charset=UTF-8'));assert.ok(eml.endsWith('Line1\r\nLine2'))
})
test('pixel selections stop at boundaries, edits preserve other pixels and inpainting fills a small object',()=>{
 const {colorRegion,changeRegion,inpaintRegion}=require('../lib/studio/image-regions.ts');const pixels=new Uint8ClampedArray(5*5*4);for(let p=0;p<25;p++)pixels.set([200,200,200,255],p*4);pixels.set([255,0,0,255],12*4)
 const mask=colorRegion(pixels,5,5,2,2,1);assert.equal(mask.reduce((n,v)=>n+(v?1:0),0),1);const cleared=changeRegion(pixels,mask,'clear');assert.equal(cleared[51],0);assert.deepEqual(cleared.slice(0,48),pixels.slice(0,48));assert.equal(pixels[51],255)
 const fixed=inpaintRegion(pixels,5,5,mask);assert.deepEqual(Array.from(fixed.slice(48,52)),[200,200,200,255]);assert.throws(()=>inpaintRegion(pixels,5,5,new Uint8Array(25).fill(255)))
 assert.equal(colorRegion(pixels,5,5,0,0,0).reduce((n,v)=>n+(v?1:0),0),24)
})
test('generated slides and mindmaps cover long notes and keep all text within page bounds',()=>{
 const {notesToSlides,notesToMindmaps}=require('../lib/studio/knowledge-design.ts'),notes=Array.from({length:29},(_,i)=>({text:`Unique note ${i}. `+'detail '.repeat(i===28?180:20),evidence:[{page:i+1,quote:'Source evidence '+i}]}));const slides=notesToSlides('Test',notes)
 for(const n of notes)assert.ok(slides.slice(1).map(d=>d.els.find(e=>e.type==='text'&&e.y===290)?.text||'').join('').includes(n.text))
 const boards=notesToMindmaps('Test',[{heading:'Group',notes}]);assert.equal(boards.length,3);assert.equal(boards.flatMap(b=>b.els.filter(e=>e.type==='text'&&e.text.startsWith('Nguồn:'))).length,29)
 for(const d of [...slides,...boards])for(const e of d.els.filter(e=>e.type==='text'))assert.ok(e.x>=0&&e.y>=0&&e.x+e.w<=d.w&&e.y+e.h<=d.h,d.name+' '+e.text)
})
test('analysis resumes after cancellation and hierarchical summary visits every group',async()=>{
 const ai=require('../lib/studio/ai.ts'),idb=require('../lib/studio/idb.ts'),cache=new Map(),oldAi=ai.callAi,oldGet=idb.idbGet,oldSet=idb.idbSet;idb.idbGet=async k=>structuredClone(cache.get(k));idb.idbSet=async(k,v)=>{cache.set(k,structuredClone(v));return true};let calls=0;const ac=new AbortController();const doc={id:'resume',name:'source',fileKind:'pdf',parts:Array.from({length:15},(_,i)=>`Original evidence for page ${i+1}.`),text:''}
 try{ai.callAi=async(_task,payload)=>{calls++;const match=payload.text.match(/\[Trang (\d+),[^\n]*\]\n([\s\S]*)/);if(match)return {heading:'Heading',notes:[{text:('Long explanatory statement '+match[1]+'. ').repeat(45),evidence:[{page:Number(match[1]),quote:match[2]}]}]};const original=payload.text.match(/\[Trang (\d+)\] “([^”]+)”/);return {heading:'Reduced',notes:[{text:'A concise idea.',evidence:[{page:Number(original[1]),quote:original[2]}]}]}}
 await assert.rejects(()=>require('../lib/studio/knowledge-client.ts').analyzeDocument(doc,ac.signal,(done)=>{if(done===4)ac.abort()}));assert.equal(calls,4)
 const state=await require('../lib/studio/knowledge-client.ts').analyzeDocument(doc,new AbortController().signal,()=>{});assert.equal(calls,15);assert.equal(Object.keys(state.sections).length,15)
 const brief=await require('../lib/studio/knowledge-client.ts').condenseDocument(doc,state,new AbortController().signal,()=>{});assert.ok(calls>=18);assert.ok(brief.length<=8);assert.ok(knowledge.verifiedNotes(brief,knowledge.documentChunks(doc)).length===brief.length)
 }finally{ai.callAi=oldAi;idb.idbGet=oldGet;idb.idbSet=oldSet}
})
test('citation checks block positive conclusions from explicit lack of evidence; CV arrays normalize safely',()=>{
 const {guardCitation,cvCoachSchema}=require('../lib/studio/ai-contracts.ts'),v={status:'supports',explanation:'x',evidence:[{page:1,quote:'Nghiên cứu này không chứng minh rằng âm nhạc làm tăng điểm thi.'}]}
 assert.equal(guardCitation('Âm nhạc làm tăng điểm thi.',v).status,'insufficient');assert.equal(guardCitation('Nghiên cứu này không chứng minh rằng âm nhạc làm tăng điểm thi.',v).status,'supports');assert.equal(guardCitation('Music increases exam results.',{...v,evidence:[{page:1,quote:'This is not proof that music increases exam results.'}]}).status,'insufficient')
 const parsed=cvCoachSchema.parse({summary:'s',experience:[{id:'real',bullets:['Prepare','Welcome']}],explanations:[],questions:[]});assert.equal(parsed.experience[0].bullets,'Prepare\nWelcome')
})
test('a generated design opens as the active design only after successful storage',async()=>{
 const idb=require('../lib/studio/idb.ts'),storage=require('../lib/studio/storage.ts'),old={get:idb.idbGet,set:idb.idbSet,read:storage.readLS,write:storage.writeLS};const writes=[];let saved
 try{idb.idbGet=async()=>[{id:'previous'}];idb.idbSet=async(_k,v)=>{saved=v;return true};storage.readLS=(_k,f)=>f;storage.writeLS=(k,v)=>{writes.push([k,v]);return true};assert.equal(await require('../lib/studio/handoff.ts').addDesigns([{id:'new'}]),true);assert.equal(saved[0].id,'new');assert.ok(writes.some(([k,v])=>k==='bloom.creative.active'&&v==='new'))
 writes.length=0;idb.idbSet=async()=>false;storage.writeLS=(k,v)=>{writes.push([k,v]);return false};assert.equal(await require('../lib/studio/handoff.ts').addDesigns([{id:'not-saved'}]),false);assert.ok(!writes.some(([k])=>k==='bloom.creative.active'))
 }finally{idb.idbGet=old.get;idb.idbSet=old.set;storage.readLS=old.read;storage.writeLS=old.write}
})

test('Office template replacement preserves every untouched package part and run style',()=>{
 const {zipSync,unzipSync,strToU8,strFromU8}=require('fflate'),{scanTemplate,applyTemplate}=require('../lib/studio/template-fill.ts')
 const fixture=(kind,xml)=>zipSync({'[Content_Types].xml':strToU8('<Types/>'),[kind==='docx'?'word/document.xml':'ppt/slides/slide1.xml']:strToU8(xml),'word/styles.xml':strToU8('<styles>EXACT FONT AND TABLE SETTINGS</styles>'),'media/photo.png':new Uint8Array([1,2,3,4])})
 const word='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/><w:color w:val="AF4822"/></w:rPr><w:t>Tác giả: {{na</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>me}} · {{date}}</w:t></w:r></w:p><w:sectPr><w:pgMar w:top="1234"/></w:sectPr></w:body></w:document>'
 const bytes=fixture('docx',word),model=scanTemplate(bytes)
 assert.equal(model.slots.length,2)
 const out=applyTemplate(bytes,model.slots,{[model.slots[0].id]:'Thúy & Ngân',[model.slots[1].id]:'13/11/2026'}),before=unzipSync(bytes),after=unzipSync(out.bytes)
 for(const key of Object.keys(before).filter(k=>k!=='word/document.xml'))assert.deepEqual(after[key],before[key],key)
 const xml=strFromU8(after['word/document.xml'])
 assert.ok(xml.includes('Thúy &amp; Ngân'));assert.ok(xml.includes('13/11/2026'));assert.ok(xml.includes('<w:b/><w:color w:val="AF4822"/>'));assert.ok(xml.includes('<w:pgMar w:top="1234"/>'));assert.ok(xml.includes('<w:i/>'));assert.equal(out.audit.replacements,2)
 assert.deepEqual(applyTemplate(bytes,model.slots,{}).bytes,bytes)
 assert.throws(()=>applyTemplate(bytes,[{...model.slots[0],original:'invented'}],{[model.slots[0].id]:'BAD'}))
 const power='<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:spTree><a:p><a:pPr algn="ctr"/><a:r><a:rPr sz="2800" b="1"/><a:t>{{title}}</a:t></a:r></a:p></p:spTree></p:sld>'
 const ppt=fixture('pptx',power),pm=scanTemplate(ppt),filled=applyTemplate(ppt,pm.slots,{[pm.slots[0].id]:'Dòng một\nDòng hai'}),px=strFromU8(unzipSync(filled.bytes)['ppt/slides/slide1.xml'])
 assert.ok(px.includes('<a:br/>'));assert.equal((px.match(/sz="2800"/g)||[]).length,2);assert.ok(px.includes('algn="ctr"'))
 assert.deepEqual(unzipSync(filled.bytes)['media/photo.png'],unzipSync(ppt)['media/photo.png'])
})
test('template proposals use exact unique quotes, reject overlaps and require evidence from uploaded content',()=>{
 const {suggestedSlots,groundedValues,sourceChunks,templateBatches}=require('../lib/studio/template-fill.ts')
 const model={kind:'docx',slots:[],blocks:[{id:'b1',text:'Họ tên: Nguyễn Văn A. Ngày: 01/01/2000.',protected:false}]}
 const slots=suggestedSlots(model,[{blockId:'b1',quote:'Nguyễn Văn A',label:'Họ tên'},{blockId:'b1',quote:'Văn A',label:'Trùng vùng'},{blockId:'invalid',quote:'Tên',label:'BAD'}])
 assert.equal(slots.length,1)
 assert.equal(groundedValues([{id:slots[0].id,value:'Mai',quote:'Người viết là Mai'},{id:slots[0].id,value:'Long',quote:'Bịa nội dung'}],slots,'Người viết là Mai.').length,1)
 const content='A'.repeat(12500)+'\nCONCLUSION: 47 people.';const chunks=sourceChunks(content)
 assert.ok(chunks.some(s=>s.includes('CONCLUSION: 47 people.')));assert.ok(chunks.every(s=>s.length<=12000))
 const batches=templateBatches(Array.from({length:95},(_,i)=>({id:i,text:'a'.repeat(400)})))
 assert.ok(batches.every(b=>JSON.stringify(b).length<=17000&&b.length<=30));assert.equal(batches.flat().length,95)
})
test('blank table cells can be filled without replacing table or paragraph properties',()=>{
 const {zipSync,unzipSync,strToU8,strFromU8}=require('fflate'),{scanTemplate,applyTemplate}=require('../lib/studio/template-fill.ts')
 const xml='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl><w:tblPr><w:tblW w:w="8000"/></w:tblPr><w:tr><w:tc><w:p><w:r><w:t>Họ tên:</w:t></w:r></w:p></w:tc><w:tc><w:p/></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Lớp:</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:rPr><w:i/></w:rPr></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>'
 const data=zipSync({'[Content_Types].xml':strToU8('<Types/>'),'word/document.xml':strToU8(xml)}),model=scanTemplate(data)
 assert.equal(model.slots.length,2);assert.equal(model.slots[0].label,'Họ tên');assert.equal(model.slots[1].label,'Lớp')
 const result=applyTemplate(data,model.slots,{[model.slots[0].id]:'Mai Anh',[model.slots[1].id]:'Khoa học 01'})
 const output=strFromU8(unzipSync(result.bytes)['word/document.xml'])
 assert.ok(output.includes('<w:tblW w:w="8000"/>'));assert.ok(output.includes('<w:i/>'));assert.ok(output.includes('Mai Anh'));assert.ok(output.includes('Khoa học 01'))
 assert.equal(scanTemplate(result.bytes).blocks.filter(b=>b.text.includes('Mai Anh')).length,1)
 assert.throws(()=>scanTemplate(zipSync({'[Content_Types].xml':strToU8('<Types/>'),'word/document.xml':strToU8(xml.replace('</w:body>','</w:wrong>'))})))
})
test('empty PowerPoint table cells retain end-paragraph font properties on every inserted line',()=>{
 const {zipSync,unzipSync,strToU8,strFromU8}=require('fflate'),{scanTemplate,applyTemplate}=require('../lib/studio/template-fill.ts')
 const xml='<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:tbl><a:tr><a:tc><a:p><a:r><a:t>Họ tên:</a:t></a:r></a:p></a:tc><a:tc><a:p><a:pPr algn="ctr"/><a:endParaRPr sz="2200" b="1"/></a:p></a:tc></a:tr></a:tbl></p:sld>'
 const bytes=zipSync({'[Content_Types].xml':strToU8('<Types/>'),'ppt/slides/slide1.xml':strToU8(xml)}),model=scanTemplate(bytes)
 assert.equal(model.slots.length,1)
 const result=applyTemplate(bytes,model.slots,{[model.slots[0].id]:'Mai Anh\nNhóm A'}),output=strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml'])
 assert.equal((output.match(/<a:rPr sz="2200" b="1"\/>/g)||[]).length,2)
 assert.ok(output.includes('<a:endParaRPr sz="2200" b="1"/>'));assert.ok(output.includes('<a:br/>'))
 assert.ok(output.indexOf('Mai Anh')<output.indexOf('<a:endParaRPr'))
 assert.equal(scanTemplate(result.bytes).blocks.find(b=>b.text.includes('Mai Anh')).text,'Mai Anh\nNhóm A')
})
