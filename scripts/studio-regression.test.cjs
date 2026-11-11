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
test('each of the 12 categories has 20 usable original templates', () => {
 assert.equal(FORMATS.length,12)
 for(const format of FORMATS){const list=format.id==='cv'?CV_THEMES:WORKSPACE_NAMES[format.id]||BLOOM_TEMPLATES.filter(t=>t.category===format.id);assert.equal(list.length,20,format.id);const names=list.map(t=>typeof t==='string'?t:t.name);assert.equal(new Set(names).size,20,format.id);allNames.push(...names)}
 assert.equal(allNames.length,240)
})
test('native templates have editable layers, unique identities and no third-party URLs', () => {
 for(const meta of BLOOM_TEMPLATES){const d=buildBloomDesign(meta);assert.ok(d.els.length>=3);assert.equal(d.provenance.license,'CC0-1.0');assert.equal(new Set(d.els.map(e=>e.id)).size,d.els.length);for(const el of d.els){assert.ok(el.w>0&&el.h>0,meta.id);assert.ok(Number.isFinite(el.x)&&Number.isFinite(el.y));if(el.src)assert.ok(el.src.startsWith('data:image/svg+xml;'),meta.id)}assert.ok(!JSON.stringify(d).includes('/templates/canva/'))}
 for(const meta of BLOOM_TEMPLATES.filter(t=>t.category==='presentations')){const pages=buildBloomDeck(meta);assert.equal(pages.length,5);assert.equal(new Set(pages.map(d=>d.id)).size,5);assert.equal(new Set(pages.map(d=>d.deck.id)).size,1)}
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
test('twenty motion presets draw distinct compositions in both aspect ratios', () => {
 const {paintVideo}=require('../lib/studio/video-scenes.ts')
 for(const portrait of [false,true]){
  const drawings=[]
  for(let index=0;index<20;index++){
   const commands=[]
   const ctx={save(){},restore(){},scale(){},beginPath(){},fill(){},stroke(){},measureText:s=>({width:s.length*35}),fillRect:(...a)=>commands.push(['rect',...a]),arc:(...a)=>commands.push(['arc',...a]),fillText:(value,...a)=>commands.push(['text',...a])}
   paintVideo({width:portrait?720:1280,height:portrait?1280:720,getContext:()=>ctx},{title:'Một tiêu đề để kiểm tra',subtitle:'Thông điệp của bạn',accent:'#5750b5',paper:'#f3f0ff',ink:'#25213e',duration:5,portrait},.4,index)
   assert.ok(commands.length>3);for(const [, ...values] of commands)assert.ok(values.every(Number.isFinite))
   drawings.push(JSON.stringify(commands))
  }
  assert.equal(new Set(drawings).size,20)
 }
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
