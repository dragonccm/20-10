"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Play, Pause, Plus, Sparkles, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Button, Input, Textarea, Select, Label, Card } from "./ui"
import { WORKSPACE_NAMES, THEMES, htmlTemplate, sheetTemplate } from "@/lib/studio/workspace-templates"
import { cellValue, columnName, sheetCsv } from "@/lib/studio/sheet-calc"
import { downloadFile, readLS, safeFileName, useStored } from "@/lib/studio/storage"
import { callAi } from "@/lib/studio/ai"
import { paintVideo, type VideoConfig } from "@/lib/studio/video-scenes"

type Kind="video"|"sheets"|"code"|"websites"|"email"
export function WorkspaceEditor({kind,initialIndex,legacy=false}:{kind:Kind;initialIndex:number;legacy?:boolean}) {
 const [index,setIndex]=useState(initialIndex)
 const [hasLegacy,setHasLegacy]=useState(false)
 useEffect(()=>{setHasLegacy(kind!=="video"&&readLS(`bloom.${kind}.${index}`,null)!==null)},[kind,index])
 const title={video:"Video chữ chuyển động",sheets:"Bảng tính",code:"Code Playground",websites:"Website HTML",email:"Email HTML"}[kind]
 return <div className="workspace-engine"><header><Link href={`/studio/creative?library=${kind}`}><ArrowLeft size={17}/> Kho mẫu</Link><strong>{title}</strong><Select aria-label="Chọn mẫu" value={index} onValueChange={(value) => setIndex(Number(value))}>{WORKSPACE_NAMES[kind]!.map((n,i)=><option key={n} value={i}>{i+1}. {n}</option>)}</Select></header>
 <p className="engine-note">Mẫu Bloom nguyên bản · Tự lưu trên trình duyệt · Không có tài sản Canva</p>
 {hasLegacy&&<p className="engine-note">{legacy?"Bạn đang mở bản nháp phiên bản trước.":"Bản nháp phiên bản trước của bạn được lưu riêng."} <Link className="text-violet-700 underline" href={`/studio/create/${kind}?template=${index}${legacy?"":"&legacy=1"}`}>{legacy?"Mở mẫu mới":"Mở bản nháp cũ"}</Link></p>}
 {kind==="sheets"?<SheetEditor key={kind+index+legacy} index={index} legacy={legacy}/>:kind==="video"?<VideoEditor key={kind+index} index={index}/>:<HtmlEditor key={kind+index+legacy} index={index} kind={kind} legacy={legacy}/>}
 </div>
}
function SheetEditor({index,legacy}:{index:number;legacy:boolean}) {
 const [cells,setCells]=useStored<string[][]>(`bloom.sheets.${legacy?"":"v2."}${index}`,sheetTemplate(index));const [selected,setSelected]=useState<[number,number]>([1,1]);const [past,setPast]=useState<string[][]|null>(null)
 const [r,c]=selected;const change=(r:number,c:number,value:string)=>{setPast(cells);setCells(rows=>rows.map((row,ri)=>ri===r?row.map((old,ci)=>ci===c?value:old):row))}
 return <>
 <div className="engine-toolbar"><Button icon={Download} onClick={()=>downloadFile(`${safeFileName(WORKSPACE_NAMES.sheets![index])}.csv`,sheetCsv(cells),"text/csv;charset=utf-8")}>Tải CSV</Button><Button variant="outline" onClick={()=>downloadFile("bang-tinh.json",JSON.stringify(cells,null,2),"application/json")}>Sao lưu JSON</Button><Button icon={Plus} variant="outline" disabled={cells.length>=101} onClick={()=>setCells(v=>[...v,Array(v[0].length).fill("")])}>Thêm hàng</Button><Button icon={Undo2} variant="ghost" disabled={!past} onClick={()=>{if(past){setCells(past);setPast(null)}}}>Hoàn tác ô</Button></div>
 <div className="sheet-formula"><b>{columnName(c)}{r+1}</b><Input aria-label="Công thức hoặc giá trị ô" value={cells[r]?.[c]??""} onChange={e=>change(r,c,e.target.value)}/><span>= {cellValue(cells,r,c)}</span></div>
 <div className="sheet-scroll"><table className="native-sheet"><thead><tr><th></th>{cells[0].map((_,c)=><th key={c}>{columnName(c)}</th>)}</tr></thead><tbody>{cells.map((row,r)=><tr key={r}><th>{r+1}</th>{row.map((value,c)=><td key={c} className={selected[0]===r&&selected[1]===c?"selected-cell":""}><input aria-label={`${columnName(c)}${r+1}`} value={selected[0]===r&&selected[1]===c?value:String(cellValue(cells,r,c))} onFocus={()=>setSelected([r,c])} onChange={e=>change(r,c,e.target.value)}/></td>)}</tr>)}</tbody></table></div>
 <p className="engine-note">Công thức hỗ trợ + − × ÷, tham chiếu ô và SUM, AVERAGE, MIN, MAX, COUNT theo vùng. CSV chứa kết quả đã tính; JSON giữ công thức. Chưa hỗ trợ toàn bộ hàm Excel.</p>
 </>
}
function HtmlEditor({index,kind,legacy}:{index:number;kind:"code"|"websites"|"email";legacy:boolean}) {
 const [html,setHtml]=useStored(`bloom.${kind}.${legacy?"":"v2."}${index}`,htmlTemplate(kind,index));const [preview,setPreview]=useState(html);const [prompt,setPrompt]=useState("");const [busy,setBusy]=useState(false);const [proposal,setProposal]=useState<{html:string;summary:string}|null>(null);const [before,setBefore]=useState("")
 useEffect(()=>{const t=setTimeout(()=>setPreview(html),350);return()=>clearTimeout(t)},[html])
 const protectedDoc=(source:string)=>{const policy=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; font-src data:; form-action 'none'; connect-src 'none'">`;return source.replace(/<head(?:\s[^>]*)?>/i,m=>m+policy).includes(policy)?source.replace(/<head(?:\s[^>]*)?>/i,m=>m+policy):policy+source}
 const ask=async()=>{if(!prompt.trim())return;setBusy(true);try{if(html.length>18000)throw Error("Mã quá dài cho một lần chỉnh AI. Hãy rút gọn dưới 18.000 ký tự.");const value=await callAi<{html:string;summary:string}>("html-edit",{text:JSON.stringify({request:prompt,html,kind})});if(typeof value.html!=="string"||value.html.length>60000||!value.html.includes("<"))throw Error("AI chưa trả mã hợp lệ.");setBefore(html);setProposal(value)}catch(e){toast.error((e as Error).message)}finally{setBusy(false)}}
 return <>
 <div className="engine-toolbar"><Button icon={Download} onClick={()=>downloadFile(`${safeFileName(WORKSPACE_NAMES[kind]![index])}.html`,html,"text/html;charset=utf-8")}>Tải HTML</Button><Button variant="outline" onClick={()=>{setBefore(html);setHtml(htmlTemplate(kind,index))}}>Đặt lại mẫu</Button><Button variant="ghost" icon={Undo2} disabled={!before} onClick={()=>{setHtml(before);setBefore("")}}>Hoàn tác</Button></div>
 <div className="engine-ai"><Input aria-label="Yêu cầu AI sửa mã" placeholder="AI: đổi màu, sửa bố cục, thêm tương tác…" value={prompt} onChange={e=>setPrompt(e.target.value)}/><Button icon={Sparkles} loading={busy} onClick={ask}>Đề xuất</Button></div>
 {proposal&&<Card className="p-4 mb-4"><strong>Đề xuất AI</strong><p className="text-sm my-2">{proposal.summary}</p><div className="flex gap-2"><Button onClick={()=>{if(html!==before){toast.error("Mã đã thay đổi sau khi gửi AI; hãy tạo đề xuất mới.");return}setHtml(proposal.html);setProposal(null)}}>Áp dụng thay đổi</Button><Button variant="outline" onClick={()=>setProposal(null)}>Bỏ qua</Button></div></Card>}
 <div className="html-editor-grid"><div><Label>Mã nguồn có thể chỉnh sửa</Label><textarea spellCheck={false} aria-label="Mã HTML" value={html} onChange={e=>setHtml(e.target.value)} /></div><div><Label>{proposal?"Xem trước đề xuất AI":"Xem trước cách ly"}</Label><iframe title="Xem trước thiết kế HTML" sandbox="allow-scripts" srcDoc={protectedDoc(proposal?.html??preview)}/></div></div>
 <p className="engine-note">Bản xem trước chạy cách ly, dùng CSP để hạn chế tài nguyên ngoài và chặn gửi form. Tệp tải về là HTML tự chứa; bạn tự chọn nơi lưu trữ. Email chưa gửi thư, website chưa tự xuất bản; form mẫu chưa kết nối backend.</p>
 </>
}

function VideoEditor({index}:{index:number}) {
 const theme=THEMES[index%5];const initial:VideoConfig={title:WORKSPACE_NAMES.video![index],subtitle:"Ý tưởng của bạn bắt đầu từ đây.",...theme,duration:5,portrait:index%3===1}
 const [cfg,setCfg]=useStored<VideoConfig>(`bloom.video.${index}`,initial);const [playing,setPlaying]=useState(false);const [position,setPosition]=useState(.4);const [exporting,setExporting]=useState(false);const canvas=useRef<HTMLCanvasElement>(null);const playbackPosition=useRef(.4);const cancelExport=useRef(false)
 useEffect(()=>{if(!canvas.current)return;let frame=0,last=0;const started=performance.now()-position*cfg.duration*1000;const draw=(now:number)=>{let p=playing?((now-started)/(cfg.duration*1000)):position;if(p>=1){setPlaying(false);setPosition(0);p=0}playbackPosition.current=p;paintVideo(canvas.current!,cfg,p,index);if(playing){if(now-last>100){last=now}frame=requestAnimationFrame(draw)}};if(playing)frame=requestAnimationFrame(draw);else draw(performance.now());return()=>cancelAnimationFrame(frame)},[cfg,playing,position,index])
 useEffect(()=>()=>{cancelExport.current=true},[])
 const record=async()=>{
  if(typeof MediaRecorder==="undefined")return toast.error("Trình duyệt này chưa hỗ trợ ghi video; hãy dùng Chrome hoặc Edge.")
  setPlaying(false);setExporting(true);cancelExport.current=false
  const out=document.createElement("canvas");out.width=cfg.portrait?720:1280;out.height=cfg.portrait?1280:720
  const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/mp4"].find(x=>MediaRecorder.isTypeSupported(x));if(!mime){setExporting(false);return toast.error("Không có định dạng video được hỗ trợ.")}
  const stream=out.captureStream(30),chunks:BlobPart[]=[];let recorder:MediaRecorder|undefined
  try {
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3_000_000});const done=new Promise<Blob>((resolve,reject)=>{recorder!.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder!.onstop=()=>resolve(new Blob(chunks,{type:mime}));recorder!.onerror=()=>reject(Error("Không thể ghi video."))});recorder.start();const start=performance.now()
   await new Promise<void>(resolve=>{const frame=(now:number)=>{const p=Math.min(1,(now-start)/(cfg.duration*1000));paintVideo(out,cfg,p,index);if(p>=1||cancelExport.current)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)})
   recorder.stop();const blob=await done;if(!cancelExport.current)downloadFile(`${safeFileName(cfg.title)}.${mime.includes("mp4")?"mp4":"webm"}`,blob,mime)
  }catch(e){toast.error((e as Error).message);if(recorder?.state==="recording")recorder.stop()}finally{stream.getTracks().forEach(t=>t.stop());setExporting(false)}
 }
 return <div className="video-editor-grid"><Card className="p-5 space-y-4"><label><Label>Tiêu đề</Label><Textarea aria-label="Tiêu đề video" rows={3} value={cfg.title} onChange={e=>setCfg({...cfg,title:e.target.value.slice(0,120)})}/></label><label><Label>Dòng mô tả</Label><Input value={cfg.subtitle} onChange={e=>setCfg({...cfg,subtitle:e.target.value.slice(0,70)})}/></label><label><Label>Thời lượng (giây)</Label><Input type="number" min={3} max={20} value={cfg.duration} onChange={e=>setCfg({...cfg,duration:Math.max(3,Math.min(20,Number(e.target.value)||5))})}/></label><label><Label>Tỉ lệ</Label><Select value={cfg.portrait?"portrait":"landscape"} onValueChange={(value) => setCfg({...cfg,portrait:value==="portrait"})}><option value="landscape">Ngang 16:9</option><option value="portrait">Dọc 9:16</option></Select></label><div className="flex gap-4">{(["accent","paper","ink"] as const).map(key=><label key={key}><Label>{key==="accent"?"Màu nhấn":key==="paper"?"Nền":"Chữ"}</Label><input aria-label={`Video ${key}`} type="color" value={cfg[key]} onChange={e=>setCfg({...cfg,[key]:e.target.value})}/></label>)}</div><Button icon={Download} loading={exporting} onClick={record}>Xuất video</Button>{exporting&&<Button variant="outline" onClick={()=>{cancelExport.current=true}}>Hủy ghi</Button>}<p className="text-xs text-slate-500">Ghi trực tiếp mất thời gian bằng độ dài video. Đây là video chữ chuyển động, chưa có âm thanh hay timeline nhiều clip.</p></Card><div><canvas ref={canvas} width={cfg.portrait?720:1280} height={cfg.portrait?1280:720} className="video-preview"/><div className="engine-toolbar"><Button icon={playing?Pause:Play} onClick={()=>{if(playing)setPosition(playbackPosition.current);setPlaying(v=>!v)}}>{playing?"Dừng":"Xem chuyển động"}</Button><input aria-label="Vị trí video" type="range" min="0" max=".99" step=".01" value={position} onChange={e=>{setPlaying(false);setPosition(Number(e.target.value))}}/></div></div></div>
}
