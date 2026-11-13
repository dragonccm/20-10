"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { documentTemplate, htmlTemplate, sheetTemplate, THEMES, WORKSPACE_NAMES } from "@/lib/studio/workspace-templates"
import { cellValue } from "@/lib/studio/sheet-calc"

type Kind="docs"|"sheets"|"code"|"websites"|"email"
export function WorkspaceThumbnail({kind,index}:{kind:Kind;index:number}) {
 const host=useRef<HTMLDivElement>(null)
 const [box,setBox]=useState({w:250,h:184}),[visible,setVisible]=useState(false)
 useEffect(()=>{
  const el=host.current;if(!el)return
  const size=new ResizeObserver(([e])=>setBox({w:e.contentRect.width,h:e.contentRect.height}));size.observe(el)
  const view=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVisible(true);view.disconnect()}},{rootMargin:"100px"});view.observe(el)
  return()=>{size.disconnect();view.disconnect()}
 },[])
 const html=useMemo(()=>{
  if(kind==="sheets")return ""
  const source=kind==="docs"?`<!doctype html><html><head><style>body{margin:0;padding:35px;font:14px/1.6 Arial;background:white;color:#263244}h1{font:30px/1.2 Georgia}h2{font-size:19px}p,li{font-size:14px}table{font-size:12px}blockquote{padding:15px;border-left:3px solid #777}th,td{padding:7px!important}</style></head><body>${documentTemplate(index).html}</body></html>`:htmlTemplate(kind,index)
  // Gallery previews never execute code or navigate; the editor owns interactions.
  const policy='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src data:; script-src \'none\'; form-action \'none\'">'
  return source.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<head(?:\s[^>]*)?>/i,m=>m+policy)
 },[kind,index])
 const width=kind==="docs"?620:kind==="email"?680:kind==="code"?720:1120
 const scale=box.w/width
 const rows=kind==="sheets"?sheetTemplate(index):[]
 return <div ref={host} className="workspace-thumbnail" aria-hidden="true">
  {visible&&(kind==="sheets"?<div className="sheet-thumbnail" style={{color:THEMES[index%5].ink}}><small>{WORKSPACE_NAMES.sheets![index]}</small><table><tbody>{rows.slice(0,7).map((row,r)=><tr key={r}>{row.slice(0,5).map((_,c)=><td key={c} style={{background:r===0?THEMES[index%5].accent:undefined,color:r===0?"white":undefined}}>{String(cellValue(rows,r,c))}</td>)}</tr>)}</tbody></table></div>:<iframe title={`Xem trước ${WORKSPACE_NAMES[kind]![index]}`} tabIndex={-1} sandbox="" srcDoc={html} style={{width,height:box.h/scale,transform:`scale(${scale})`}}/>) }
 </div>
}
