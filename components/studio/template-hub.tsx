"use client"
import { memo, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ExternalLink, Presentation, Heart, Image, Video, Printer, FileText, Network, Table2, Code, Globe, Mail, Briefcase, ArrowUpRight } from "lucide-react"
import { FORMATS, type StudioCategory } from "@/lib/studio/design-formats"
import { BLOOM_TEMPLATES, buildBloomDesign, buildBloomDeck, type BloomTemplate } from "@/lib/studio/bloom-templates"
import { WORKSPACE_NAMES, THEMES, documentTemplate } from "@/lib/studio/workspace-templates"
import { CV_THEMES, SAMPLE_CV } from "@/lib/studio/cv-data"
import dynamic from "next/dynamic"
const CvPreview = dynamic(() => import("./cv-preview").then((m) => m.CvPreview), { ssr: false })
import { sendToWriting } from "@/lib/studio/handoff"
import { bgCss, fontFamily, type Design } from "@/lib/studio/design"
import { downloadFile, readLS, writeLS } from "@/lib/studio/storage"
import { htmlTemplate, sheetTemplate } from "@/lib/studio/workspace-templates"
import { Input } from "./ui"
import { WorkspaceThumbnail } from "./workspace-thumbnail"
const ICONS={presentations:Presentation,social:Heart,photos:Image,video:Video,print:Printer,docs:FileText,whiteboard:Network,sheets:Table2,code:Code,websites:Globe,email:Mail,cv:Briefcase}
const normalized=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")
export function TemplateHub({onDesign,onDeck}:{onDesign:(design:Design)=>void;onDeck:(designs:Design[])=>void}) {
 const categoryNav=useRef<HTMLElement>(null)
 const [category,setCategory]=useState<StudioCategory>("presentations"),[query,setQuery]=useState("");const router=useRouter();const format=FORMATS.find(f=>f.id===category)!
 useEffect(() => { const requested = new URLSearchParams(window.location.search).get("library") ?? readLS<string>("bloom.library.category", "presentations"); if (FORMATS.some((f) => f.id === requested)) setCategory(requested as StudioCategory) }, [])
 useEffect(() => { const nav=categoryNav.current; const active=nav?.querySelector<HTMLElement>('[aria-pressed="true"]'); if(nav&&active)nav.scrollTo({left:active.offsetLeft-nav.offsetLeft-nav.clientWidth/2+active.clientWidth/2,behavior:"smooth"}) }, [category])
 const native=BLOOM_TEMPLATES.filter(t=>t.category===category)
 const items=category==="cv"?CV_THEMES.map((t,i)=>({name:t.name,index:i})):native.length?native.map((t,i)=>({name:t.name,index:i,native:t})):WORKSPACE_NAMES[category]!.map((name,index)=>({name,index}))
 const results=items.filter(t=>normalized(t.name).includes(normalized(query)))
 return <section className="template-hub"><div className="hub-hero"><span className="hub-eyebrow">BLOOM / ORIGINAL COLLECTION</span><h1>Bạn muốn tạo gì?</h1><p>240 mẫu nguyên bản, có thể chỉnh sửa.</p><div className="hub-search"><Search size={20}/><Input aria-label="Tìm mẫu thiết kế" placeholder={`Tìm trong ${format.name.toLowerCase()}…`} value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
 <nav ref={categoryNav} className="hub-categories" aria-label="Loại thiết kế">{FORMATS.map(f=>{const Icon=ICONS[f.id];return <button key={f.id} aria-pressed={category===f.id} onClick={()=>{setCategory(f.id);writeLS("bloom.library.category",f.id);setQuery("")}}><span style={{background:category===f.id?f.color:`${f.color}12`,color:category===f.id?"white":f.color}}><Icon size={23}/></span>{f.short}<small>20 mẫu</small></button>})}</nav>
 <div className="hub-section-heading"><div><h2>{format.name}<span>{results.length} mẫu</span></h2><p>{format.description} · {format.output}</p></div><button className="text-xs text-violet-600" onClick={() => {
   const templates = items.map((item) => {
    const meta = "native" in item ? item.native as BloomTemplate : undefined
    if (meta) return category === "presentations" ? buildBloomDeck(meta) : buildBloomDesign(meta)
    if (category === "cv") return CV_THEMES[item.index]
    if (category === "docs") return documentTemplate(item.index)
    if (category === "sheets") return { name: item.name, cells: sheetTemplate(item.index) }
    if (category === "video") return { name: item.name, title: item.name, subtitle: "Ý tưởng của bạn bắt đầu từ đây.", ...THEMES[item.index % 5], duration: 5, portrait: item.index % 3 === 1 }
    return { name: item.name, html: htmlTemplate(category as "code" | "websites" | "email", item.index) }
   })
   downloadFile(`bloom-${category}-20-mau.json`, JSON.stringify({ collection: "Bloom Original", category, license: "CC0-1.0", templates }, null, 2), "application/json")
 }}>Tải bộ 20 mẫu (JSON)</button><a href="https://www.canva.com/templates/" target="_blank" rel="noopener noreferrer">Tham khảo trên Canva <ExternalLink size={13}/></a></div>
 <div className="hub-template-grid">{results.map(item=>{
 const meta="native" in item?item.native as BloomTemplate:undefined;const theme=THEMES[item.index%5]
 return <button type="button" aria-label={`Mở mẫu ${item.name}`} key={category+item.index} className="hub-template-card" onClick={()=>{
  if(meta){if(category==="presentations")onDeck(buildBloomDeck(meta));else onDesign(buildBloomDesign(meta))}
  else if(category==="cv")router.push(`/studio/career?theme=${item.index}`)
  else if(category==="docs"){const doc=documentTemplate(item.index);sendToWriting(doc.title,{html:doc.html,lang:"vi",kind:"report"});router.push("/studio/writing")}
  else router.push(`/studio/create/${category}?template=${item.index}`)
 }}><div className="hub-template-art" style={{background:meta?.paper??theme.paper}}>{meta?<NativeThumbnail meta={meta}/>:category === "cv" ? <CvThumbnail index={item.index}/> : <WorkspaceThumbnail kind={category as "docs"|"sheets"|"video"|"code"|"websites"|"email"} index={item.index}/>}<span className="hub-card-badge">Bloom · Dùng tự do</span></div><div className="hub-card-caption"><div><strong>{item.name}</strong><span>{meta?.caption??format.output}{category==="presentations"?" · 5 trang":""}</span></div><ArrowUpRight size={17}/></div></button>
 })}</div>
 {!results.length&&<p className="p-8 text-center text-slate-500">Chưa có mẫu khớp từ khóa. Hãy thử từ khóa khác.</p>}
 <p className="hub-license">Các mẫu Bloom mới dùng hình học và nội dung nguyên bản, phát hành theo <a href="/templates/bloom/LICENSE.txt" target="_blank" rel="noopener noreferrer">CC0 1.0</a>. Liên kết Canva chỉ để tham khảo và chỉnh tại Canva; không phân phối lại mẫu của Canva.</p>
 </section>
}
const NativeThumbnail=memo(function NativeThumbnail({meta}:{meta:BloomTemplate}) {
 const d=useMemo(()=>buildBloomDesign(meta),[meta]);const {ref,box}=usePreviewBox();const scale=Math.min(box.w/d.w,box.h/d.h)
 return <div ref={ref} aria-hidden="true" className="hub-preview-frame"><div className="native-template-preview" style={{width:d.w*scale,height:d.h*scale,background:bgCss(d.bg)}}>{d.els.map(e=><div key={e.id} style={{position:"absolute",left:e.x*scale,top:e.y*scale,width:e.w*scale,height:e.h*scale,opacity:e.opacity,transform:e.rot?`rotate(${e.rot}deg)`:undefined,background:e.type==="rect"||e.type==="circle"?e.fill:undefined,borderRadius:e.type==="circle"?"50%":(e.radius??0)*scale,color:e.color,fontSize:(e.fontSize??48)*scale,fontWeight:e.weight,fontFamily:fontFamily(e),lineHeight:e.lineHeight??1.2,whiteSpace:"pre-wrap",textAlign:e.align,overflowWrap:"break-word"}}>{e.type==="text"?e.text:e.type==="image"?<img src={e.src} alt="" loading="lazy" decoding="async" style={{width:"100%",height:"100%"}}/>:null}</div>)}</div></div>
})

function usePreviewBox() {
 const ref=useRef<HTMLDivElement>(null),[box,setBox]=useState({w:240,h:180})
 useEffect(()=>{const observer=new ResizeObserver(([entry])=>setBox({w:Math.max(1,entry.contentRect.width),h:Math.max(1,entry.contentRect.height)}));if(ref.current)observer.observe(ref.current);return()=>observer.disconnect()},[])
 return {ref,box}
}
const CvThumbnail=memo(function CvThumbnail({index}:{index:number}) {
 const {ref,box}=usePreviewBox();const scale=Math.min(box.w/794,box.h/1123,.22)
 return <div ref={ref} aria-hidden="true" className="hub-preview-frame"><div style={{width:794*scale,height:1123*scale,overflow:"hidden",background:"white"}}><div style={{width:794,transform:`scale(${scale})`,transformOrigin:"top left"}}><CvPreview cv={SAMPLE_CV} theme={CV_THEMES[index]}/></div></div></div>
})
