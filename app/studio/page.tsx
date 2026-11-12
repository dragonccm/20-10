"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowUpRight, BookOpen, ChevronRight, FileUp, Flower2, Heart, Languages, Palette, PenLine, ShieldCheck, Briefcase, type LucideIcon } from "lucide-react"
import { TOOLS } from "@/lib/studio/tools"
import { readLS } from "@/lib/studio/storage"
import { idbGet } from "@/lib/studio/idb"

type Task = { href:string; icon:LucideIcon; title:string; desc:string; kind:string; color:string }
const TASKS:Task[]=[
 {href:"/studio/documents",icon:FileUp,title:"Giải thích giúp mình đoạn này",desc:"Mang một tài liệu hoặc ảnh chụp vào, cùng tìm điều bạn đang thắc mắc.",kind:"read",color:"#6379a1"},
 {href:"/studio/writing",icon:PenLine,title:"Mình chưa biết viết thế nào",desc:"Bắt đầu từ vài ý nhỏ, hoặc sửa một đoạn bạn đã viết.",kind:"write",color:"#b47185"},
 {href:"/studio/creative?library=photos",icon:Palette,title:"Sửa giúp mình tấm ảnh này",desc:"Cắt cho vừa, chỉnh màu, tách nền hay thêm một chút chữ.",kind:"create",color:"#a38152"},
 {href:"/studio/korean",icon:Languages,title:"Khám phá vài từ mới",desc:"Một chút tiếng Hàn hoặc tiếng Anh, theo nhịp của bạn.",kind:"learn",color:"#8a73a9"},
 {href:"/studio/career",icon:Briefcase,title:"Cùng mình chuẩn bị chiếc CV",desc:"Sắp xếp những điều bạn đã làm và tìm cách kể thật rõ ràng.",kind:"write",color:"#5b8a7d"},
 {href:"/studio/creative?library=presentations",icon:BookOpen,title:"Biến ý tưởng thành vài trang slide",desc:"Chọn một mẫu đơn giản rồi thêm câu chuyện của riêng bạn.",kind:"create",color:"#8a82b2"},
]
const DIRECTIONS=[{id:"read",label:"Có một tài liệu mình chưa hiểu"},{id:"write",label:"Có điều mình muốn viết"},{id:"create",label:"Muốn làm một thứ nho nhỏ"},{id:"learn",label:"Muốn học một chút thôi"}]
type Saved={href:string;label:string;detail:string}
export default function StudioPage(){
 const [help,setHelp]=useState(false),[direction,setDirection]=useState<string|null>(null)
 const [showSaved,setShowSaved]=useState(false),[saved,setSaved]=useState<Saved[]>([]),[savedReady,setSavedReady]=useState(false)
 useEffect(()=>{
  if(!showSaved)return
  let active=true
  const docs=readLS<{title:string;updatedAt:number}[]>("bloom.writing.docs",[])
  const last=[...docs].sort((a,b)=>b.updatedAt-a.updatedAt)[0]
  const items:Saved[]=last?[{href:"/studio/writing",label:"Bài viết gần đây",detail:last.title||"Bài chưa đặt tên"}]:[]
  setSavedReady(false)
  idbGet<{name:string}[]>("bloom.docs.index").then(d=>{if(d?.[0])items.push({href:"/studio/documents",label:"Tài liệu gần đây",detail:d[0].name})}).catch(()=>{}).finally(()=>{if(active){setSaved(items);setSavedReady(true)}})
  return()=>{active=false}
 },[showSaved])
 const tasks=direction?TASKS.filter(t=>t.kind===direction):TASKS
 return <div className="bloom-welcome">
  <header className="bloom-greeting">
   <div className="bloom-greeting-art" aria-hidden="true"><Flower2 size={86} strokeWidth={.85}/><span>✦</span></div>
   <p className="bloom-overline">MỘT GÓC NHỎ DÀNH CHO BẠN</p>
   <h1>Có điều gì bạn muốn mình<br className="hidden sm:block"/> giúp một chút không?</h1>
   <p className="bloom-intro">Một trang tài liệu khó hiểu, một câu chưa biết viết, hay một ý tưởng vừa chợt đến. Mình cùng bắt đầu từ đó nhé.</p>
   <button className="bloom-help-button mr-3" onClick={()=>window.dispatchEvent(new Event("bloom:companion"))}><Flower2 size={16}/> Trò chuyện cùng Bloom</button>
   <button className="bloom-help-button" aria-expanded={help} aria-controls="bloom-directions" onClick={()=>{setHelp(v=>!v);setDirection(null)}}><Heart size={16}/> Mình chưa biết bắt đầu từ đâu <ChevronRight size={15}/></button>
  </header>
  {help&&<section id="bloom-directions" className="bloom-directions" aria-label="Cùng tìm một việc nhỏ"><p>Bạn đang muốn gỡ rối điều gì? Chọn điều gần nhất với bạn nhé.</p><div>{DIRECTIONS.map(d=><button key={d.id} aria-pressed={direction===d.id} onClick={()=>setDirection(d.id)}>{d.label}</button>)}</div></section>}
  <section className="bloom-little-helps" aria-label="Những việc mình có thể giúp">
   <div className="bloom-section-label"><h2>{direction?"Có thể những gợi ý này sẽ giúp bạn":"Một vài việc mình có thể giúp"}</h2>{direction&&<button onClick={()=>setDirection(null)}>Xem các gợi ý khác</button>}</div>
   <div className="bloom-help-grid">{tasks.map(t=><Link key={t.href} href={t.href} className="bloom-help-card"><span className="bloom-task-icon" style={{color:t.color,background:t.color+"12"}}><t.icon size={23} strokeWidth={1.5}/></span><div><h3>{t.title}</h3><p>{t.desc}</p></div><ArrowUpRight size={17} className="bloom-card-arrow"/></Link>)}</div>
  </section>
  <details className="bloom-drawer" onToggle={e=>setShowSaved(e.currentTarget.open)}><summary>Những thứ bạn đã lưu</summary><p className="bloom-drawer-note">Vẫn ở đây, khi nào bạn muốn mở lại.</p>{!savedReady?<p className="bloom-drawer-note">Đang mở góc nhỏ của bạn…</p>:saved.length?<div className="bloom-saved-list">{saved.map(s=><Link key={s.href} href={s.href}><span>{s.label}<strong>{s.detail}</strong></span><ChevronRight size={16}/></Link>)}</div>:<p className="bloom-drawer-note">Những bài viết và tài liệu bạn lưu sẽ xuất hiện ở đây.</p>}</details>
  <details className="bloom-drawer"><summary>Khám phá thêm những công cụ nhỏ</summary><div className="bloom-tool-list">{TOOLS.map(t=><Link key={t.slug} href={`/studio/${t.slug}`}><t.icon size={17}/><span>{t.name}</span><ArrowUpRight size={14}/></Link>)}</div></details>
  <footer className="bloom-welcome-footer"><Flower2 size={21} strokeWidth={1.2}/><p>Ghé khi bạn cần, rời đi khi bạn muốn.<br/>Mong mọi thứ nhẹ nhàng hơn một chút.</p><details><summary><ShieldCheck size={13}/> Về những điều bạn lưu ở đây</summary><p>Bản nháp được lưu trong trình duyệt trên thiết bị này. Khi dùng tính năng AI, nội dung cần xử lý được gửi đến dịch vụ AI đã cấu hình. Bạn có thể tải bản sao để giữ riêng.</p></details></footer>
 </div>
}
