import { z } from "zod"
// Design basis: autonomy support (Deci & Ryan), Microsoft HAI guidelines 7–10,
// Google PAIR Feedback + Control. Choices must be honored, revocable, and bounded.
export const COMPANION_TOOLS={documents:{label:"Mở tài liệu",href:"/studio/documents"},writing:{label:"Mở chỗ viết",href:"/studio/writing"},photos:{label:"Mở góc sửa ảnh",href:"/studio/creative?library=photos"},slides:{label:"Mở mẫu slide",href:"/studio/creative?library=presentations"},career:{label:"Mở CV",href:"/studio/career"},language:{label:"Mở góc ngoại ngữ",href:"/studio/korean"}} as const
export const companionReply=z.object({reply:z.string().min(1).max(6000),draft:z.object({title:z.string().min(1).max(120),text:z.string().min(1).max(12000)}).nullable(),tool:z.enum(["documents","writing","photos","slides","career","language"]).nullable()}).strict()
export type CompanionReply=z.infer<typeof companionReply>
export function scopeCompanionReply(reply:CompanionReply,mode:"chat"|"help"):CompanionReply {
 return mode==="chat"?{...reply,draft:null,tool:null}:reply
}
