import { z } from "zod"
import type { Design } from "./design"
import { uid } from "./storage"
const coordinate=z.number().finite().min(-100000).max(100000)
const size=z.number().finite().positive().max(10000)
const color=z.string().regex(/^#[a-f0-9]{6}$/i)
const element=z.object({
 id:z.string().optional(),type:z.enum(["text","rect","circle","image"]),x:coordinate,y:coordinate,w:size,h:size,opacity:z.number().min(0).max(1),
 rot:z.number().finite().optional(),fontSize:size.optional(),text:z.string().max(20000).optional(),color:color.optional(),fill:color.optional(),
 src:z.string().max(12_000_000).regex(/^data:image\/(?:png|jpe?g|webp|svg\+xml)(?:;charset=[a-z0-9-]+)?(?:;base64)?,/i).optional(),
}).passthrough().refine(el=>el.type!=="image"||!!el.src,"Ảnh phải được nhúng trong bản sao lưu.")
const page=z.object({name:z.string().max(300),w:size,h:size,bg:z.object({from:color,to:color,angle:z.number().finite()}),els:z.array(element).max(500),deck:z.object({id:z.string(),name:z.string()}).passthrough().optional()}).passthrough()
export function parseDesignBackup(raw:unknown):Design[] {
 const source=raw as {collection?:string;templates?:unknown[]}
 const pages=Array.isArray(raw)?raw:source?.collection==="Bloom Original"&&Array.isArray(source.templates)?source.templates.flat():[raw]
 const result=z.array(page).min(1).max(200).safeParse(pages)
 if(!result.success)throw Error("JSON chưa đúng định dạng thiết kế. Chọn bản sao lưu canvas Bloom có ảnh được nhúng; gói CV, bảng tính và HTML dùng công cụ riêng.")
 const decks=new Map<string,string>()
 return result.data.map((draft,index)=>{
  if(draft.deck&&!decks.has(draft.deck.id))decks.set(draft.deck.id,uid())
  return {...draft,id:uid(),els:draft.els.map(el=>({...el,id:uid()})),updatedAt:Date.now()-index,deck:draft.deck?{id:decks.get(draft.deck.id)!,name:draft.deck.name}:undefined,provenance:{kind:"user"}} as Design
 })
}
