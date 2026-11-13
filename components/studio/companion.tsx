"use client"
import { useEffect, useRef, useState, type CSSProperties } from "react"
import { X, Send, Settings2, Square, ArrowUpRight } from "lucide-react"
import { BloomMark } from "./brand"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { callAi } from "@/lib/studio/ai"
import { COMPANION_TOOLS, companionReply, scopeCompanionReply, type CompanionReply } from "@/lib/studio/companion"
import { readLS, writeLS } from "@/lib/studio/storage"
import { textToHtml } from "@/lib/studio/text"
import { sendToWriting } from "@/lib/studio/handoff"

type Message={id:number;role:"user"|"assistant";text:string;proposal?:CompanionReply;created?:string;cancelled?:boolean}
export function Companion(){
 const path=usePathname(),router=useRouter(),[open,setOpen]=useState(false),[mode,setMode]=useState<"chat"|"help">("chat"),[messages,setMessages]=useState<Message[]>([]),[text,setText]=useState(""),[busy,setBusy]=useState(false),[settings,setSettings]=useState(false),[tone,setTone]=useState("gentle"),[remember,setRemember]=useState(false),[loaded,setLoaded]=useState(false),[allowOnce,setAllowOnce]=useState(false)
 const abort=useRef<AbortController|null>(null),permission=useRef(false),panel=useRef<HTMLDivElement>(null),launcher=useRef<HTMLButtonElement>(null),input=useRef<HTMLTextAreaElement>(null),bottom=useRef<HTMLDivElement>(null),sequence=useRef(0)
 const opener=useRef<HTMLElement|null>(null)
 const [available,setAvailable]=useState<{height:number;top:number}|null>(null)
 useEffect(()=>{const saved=readLS<{remember?:boolean;tone?:string}>("bloom.companion.settings",{});setRemember(!!saved.remember);setTone(saved.tone||"gentle");if(saved.remember)setMessages(readLS<Message[]>("bloom.companion.history",[]).slice(-30));setLoaded(true);return()=>abort.current?.abort()},[])
 useEffect(()=>{if(!loaded)return;writeLS("bloom.companion.settings",{remember,tone});if(remember)writeLS("bloom.companion.history",messages.slice(-30));else try{localStorage.removeItem("bloom.companion.history")}catch{}},[messages,remember,tone,loaded])
 useEffect(()=>{if(open)input.current?.focus()},[open])
 useEffect(()=>{
  if(!open)return
  const view=window.visualViewport
  const update=()=>setAvailable({height:view?.height??window.innerHeight,top:view?.offsetTop??0})
  update();view?.addEventListener("resize",update);view?.addEventListener("scroll",update);window.addEventListener("resize",update)
  return()=>{view?.removeEventListener("resize",update);view?.removeEventListener("scroll",update);window.removeEventListener("resize",update)}
 },[open])
 useEffect(()=>{bottom.current?.scrollIntoView({block:"nearest"})},[messages,busy])
 useEffect(()=>{const reveal=()=>{opener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setOpen(true)};window.addEventListener("bloom:companion",reveal);return()=>window.removeEventListener("bloom:companion",reveal)},[])
 const revoke=()=>{permission.current=false;setAllowOnce(false)}
 const cancel=()=>{sequence.current++;abort.current?.abort();setBusy(false);revoke()}
 const close=()=>{
  cancel();setOpen(false)
  const previous=opener.current
  const mobileTrigger=document.querySelector<HTMLButtonElement>("[data-mobile-companion-trigger]")
  const target=previous?.isConnected&&previous!==document.body&&previous.getClientRects().length
   ?previous:mobileTrigger?.getClientRects().length?mobileTrigger:launcher.current
  target?.focus()
 }
 const create=(id:number,draft:{title:string;text:string})=>{
  const docId=sendToWriting(draft.title,{text:draft.text,kind:"other",lang:"vi"})
  window.dispatchEvent(new CustomEvent("bloom:draft-created",{detail:{id:docId}}))
  setMessages(ms=>ms.map(m=>m.id===id?{...m,created:docId}:m));return docId
 }
 const undo=(message:Message)=>{
  const draft=message.proposal?.draft;if(!draft||!message.created)return
  if(path==="/studio/writing"&&readLS("bloom.writing.active","")===message.created)return toast.info("Bản nháp đang mở ở chỗ viết; mình giữ lại để bảo vệ những chỉnh sửa của bạn.")
  const docs=readLS<{id:string;title:string;html:string}[]>("bloom.writing.docs",[]),doc=docs.find(d=>d.id===message.created)
  // Never delete work the user has edited after the assistant created it.
  const plainHtml=textToHtml(draft.text)
  if(doc&&doc.title===draft.title&&doc.html===plainHtml){if(!writeLS("bloom.writing.docs",docs.filter(d=>d.id!==doc.id)))return toast.error("Chưa lưu được thay đổi.");if(readLS("bloom.writing.active","")===doc.id)writeLS("bloom.writing.active",docs.find(d=>d.id!==doc.id)?.id||"")}
  else if(doc)return toast.info("Bản nháp đã có chỉnh sửa của bạn nên mình giữ lại. Bạn có thể xem nó ở chỗ viết.")
  window.dispatchEvent(new CustomEvent("bloom:draft-removed",{detail:{id:message.created}}))
  setMessages(ms=>ms.map(m=>m.id===message.id?{...m,created:undefined,cancelled:true}:m))
 }
 const send=async()=>{
  if(!text.trim()||busy)return
  const latest=text.trim(),history=messages.slice(-8).map(m=>({role:m.role,text:(m.text+(m.proposal?.draft?"\nBản nháp đã đề xuất: "+m.proposal.draft.text:"")).slice(0,2000)})),turn=++sequence.current,id=Date.now(),requestedMode=mode,canCreate=permission.current
  setText("");setMessages(ms=>[...ms,{id,role:"user",text:latest}]);setBusy(true);abort.current=new AbortController()
  try{
   const result=companionReply.parse(await callAi("companion",{text:JSON.stringify({mode:requestedMode,tone,history,message:latest})},abort.current.signal))
   if(turn!==sequence.current)return
   // Enforce chat-only locally too; a model response can never grant itself permission.
   const proposal=scopeCompanionReply(result,requestedMode)
   const replyId=id+1
   setMessages(ms=>[...ms,{id:replyId,role:"assistant",text:proposal.reply,proposal}])
   if(canCreate&&permission.current&&requestedMode==="help"&&proposal.draft){try{create(replyId,proposal.draft)}catch(e){toast.error((e as Error).message)}}
  }catch(e){if(turn===sequence.current&&!abort.current?.signal.aborted){setText(latest);toast.error((e as Error).message)}}finally{if(turn===sequence.current){setBusy(false);revoke()}}
 }
 return <><button ref={launcher} className="companion-launcher" aria-label="Mở trợ lý Bloom" aria-expanded={open} onClick={()=>{if(open)close();else{opener.current=launcher.current;setOpen(true)}}}><BloomMark size={24}/><span>Trò chuyện cùng Bloom</span></button>
 {open&&<><div className="companion-backdrop" onClick={close} aria-hidden="true"/><div className="companion-panel" style={available?{"--companion-available-height":`${available.height}px`,"--companion-top":`${available.top}px`} as CSSProperties:undefined} ref={panel} role="dialog" aria-modal="true" aria-labelledby="companion-title" onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();close()}if(e.key==="Tab"){const all=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),textarea,input,select,a[href]')||[]);const first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}}>
 <header><BloomMark size={32}/><div><strong id="companion-title">Bloom ở đây</strong><small>Trợ lý AI · Bạn chọn cách mình giúp</small></div><button aria-label="Tùy chọn trợ lý" aria-expanded={settings} onClick={()=>setSettings(v=>!v)}><Settings2 size={17}/></button><button aria-label="Đóng trò chuyện" onClick={close}><X size={19}/></button></header>
 {settings&&<div className="companion-settings"><label>Cách trả lời<select value={tone} onChange={e=>setTone(e.target.value)}><option value="gentle">Nhẹ nhàng, tự nhiên</option><option value="brief">Ngắn gọn</option><option value="direct">Đi thẳng vào việc</option></select></label><label><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Giữ cuộc trò chuyện trên thiết bị này</label><p>Mặc định chỉ giữ trong lần mở trang này. Mỗi lần gửi, lời nhắn và một phần hội thoại gần đây được chuyển đến dịch vụ AI. Mình không tự đọc các tài liệu bạn đã lưu.</p><button onClick={()=>{cancel();setMessages([])}}>Bắt đầu cuộc trò chuyện mới</button></div>}
 <div className="companion-modes" aria-label="Cách trợ lý giúp"><button aria-pressed={mode==="chat"} onClick={()=>{cancel();setMode("chat")}}>Chỉ trò chuyện</button><button aria-pressed={mode==="help"} onClick={()=>{cancel();setMode("help")}}>Nhờ làm một việc</button></div>
 {mode==="help"&&<div className="companion-permission"><p>Mình đề xuất bản nháp hoặc công cụ; bạn chọn thực hiện.</p><label><input type="checkbox" checked={allowOnce} onChange={e=>{permission.current=e.target.checked;setAllowOnce(e.target.checked)}}/> Cho tạo bản nháp trong lượt gửi tiếp theo</label>{allowOnce&&<small>Bạn có thể bỏ chọn hoặc bấm Dừng để thu hồi. Quyền hết sau lượt này hoặc khi đóng trợ lý.</small>}</div>}
 <div className="companion-messages">{!messages.length&&<div className="companion-empty"><BloomMark size={48} className="mx-auto"/><h2>Bạn muốn kể điều gì?</h2><p>Kể mình nghe, hoặc cùng gỡ một việc nhỏ nhé.</p><small>Bloom là AI. Bạn có thể đóng bất cứ lúc nào.</small></div>}{messages.map(m=><div key={m.id} className={`companion-message ${m.role}`}><small>{m.role==="user"?"Bạn":"Bloom · AI"}</small><p>{m.text}</p>{m.proposal?.draft&&!m.cancelled&&<div className="companion-proposal"><strong>{m.proposal.draft.title}</strong><pre>{m.proposal.draft.text}</pre>{m.created?<><span>Đã tạo bản nháp riêng</span><button onClick={()=>{window.dispatchEvent(new CustomEvent('bloom:draft-open',{detail:{id:m.created}}));router.push('/studio/writing');close()}}>Mở bản nháp</button><button onClick={()=>undo(m)}>Hoàn tác tạo nháp</button></>:<button disabled={mode!=="help"} onClick={()=>{try{create(m.id,m.proposal!.draft!)}catch(e){toast.error((e as Error).message)}}}>Tạo bản nháp này</button>}</div>}{m.proposal?.tool&&<button className="companion-tool" disabled={mode!=="help"} onClick={()=>{router.push(COMPANION_TOOLS[m.proposal!.tool!].href);close()}}>{COMPANION_TOOLS[m.proposal.tool].label}<ArrowUpRight size={14}/></button>}</div>)}{busy&&<p role="status" className="companion-wait">Mình đang đọc lời nhắn của bạn…</p>}<div ref={bottom}/></div>
 <form onSubmit={e=>{e.preventDefault();send()}}><label className="sr-only" htmlFor="companion-input">Lời nhắn cho Bloom</label><textarea id="companion-input" ref={input} maxLength={4000} rows={2} value={text} onChange={e=>setText(e.target.value)} placeholder="Bạn cứ viết theo cách của mình…"/><div><small>Chỉ nội dung trò chuyện được gửi khi bạn chọn Gửi.</small>{busy?<button type="button" onClick={cancel}><Square size={14}/>Dừng</button>:<button type="submit" disabled={!text.trim()}><Send size={15}/>Gửi</button>}</div></form>
 </div></>}</>
}
