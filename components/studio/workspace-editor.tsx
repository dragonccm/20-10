"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Plus, Sparkles, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { Button, Input, Textarea, Select, Label, Card } from "./ui"
import { WORKSPACE_NAMES, htmlTemplate, sheetTemplate } from "@/lib/studio/workspace-templates"
import { cellValue, columnName, sheetCsv } from "@/lib/studio/sheet-calc"
import { downloadFile, readLS, safeFileName, useStored } from "@/lib/studio/storage"
import { callAi } from "@/lib/studio/ai"

type Kind="sheets"|"code"|"websites"|"email"
export function WorkspaceEditor({kind,initialIndex,legacy=false}:{kind:Kind;initialIndex:number;legacy?:boolean}) {
 const [index,setIndex]=useState(initialIndex)
 const [hasLegacy,setHasLegacy]=useState(false)
 useEffect(()=>{setHasLegacy(readLS(`bloom.${kind}.${index}`,null)!==null)},[kind,index])
 const title={sheets:"Bảng tính",code:"Code Playground",websites:"Website HTML",email:"Email HTML"}[kind]
 return <div className="workspace-engine"><header><Link href={`/studio/creative?library=${kind}`}><ArrowLeft size={17}/> Kho mẫu</Link><strong>{title}</strong><Select aria-label="Chọn mẫu" value={index} onValueChange={(value) => setIndex(Number(value))}>{WORKSPACE_NAMES[kind]!.map((n,i)=><option key={n} value={i}>{i+1}. {n}</option>)}</Select></header>
 <p className="engine-note">Mẫu Bloom nguyên bản · Tự lưu trên trình duyệt · Không có tài sản Canva</p>
 {hasLegacy&&<p className="engine-note">{legacy?"Bạn đang mở bản nháp phiên bản trước.":"Bản nháp phiên bản trước của bạn được lưu riêng."} <Link className="text-violet-700 underline" href={`/studio/create/${kind}?template=${index}${legacy?"":"&legacy=1"}`}>{legacy?"Mở mẫu mới":"Mở bản nháp cũ"}</Link></p>}
 {kind==="sheets"?<SheetEditor key={kind+index+legacy} index={index} legacy={legacy}/>:<HtmlEditor key={kind+index+legacy} index={index} kind={kind} legacy={legacy}/>}
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
