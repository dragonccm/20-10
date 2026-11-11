import { notFound } from "next/navigation"
import { WorkspaceEditor } from "@/components/studio/workspace-editor"
export default async function CreatePage({params,searchParams}:{params:Promise<{kind:string}>;searchParams:Promise<{template?:string}>}) {
 const {kind}=await params;const query=await searchParams
 if(!["video","sheets","code","websites","email"].includes(kind))notFound()
 const index=Math.max(0,Math.min(19,Math.floor(Number(query.template)||0)))
 return <WorkspaceEditor kind={kind as "video"|"sheets"|"code"|"websites"|"email"} initialIndex={index}/>
}
