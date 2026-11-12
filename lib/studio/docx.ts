"use client"

import { escapeHtml } from "./storage"

// Minimal DOCX reader: unzips word/document.xml with the browser's DecompressionStream
// and keeps headings, paragraphs, lists, bold/italic/underline.

async function inflateRaw(data: Uint8Array) {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export type Zip = { names: string[]; bytes(name: string): Promise<Uint8Array | null>; text(name: string): Promise<string | null> }

/** Reads a ZIP (DOCX/PPTX) with the browser's DecompressionStream, no library needed. */
export function openZip(buf: Uint8Array): Zip {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error("Tệp bị hỏng hoặc không đúng định dạng.")
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const entries = new Map<string, { method: number; compSize: number; local: number }>()
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break
    const method = view.getUint16(p + 10, true)
    const compSize = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const local = view.getUint32(p + 42, true)
    entries.set(dec.decode(buf.subarray(p + 46, p + 46 + nameLen)), { method, compSize, local })
    p += 46 + nameLen + extraLen + commentLen
  }
  const bytes = async (name: string) => {
    const e = entries.get(name)
    if (!e) return null
    const lNameLen = view.getUint16(e.local + 26, true)
    const lExtraLen = view.getUint16(e.local + 28, true)
    const start = e.local + 30 + lNameLen + lExtraLen
    const raw = buf.subarray(start, start + e.compSize)
    return e.method === 0 ? raw : e.method === 8 ? await inflateRaw(raw) : null
  }
  return {
    names: [...entries.keys()],
    bytes,
    text: async (name) => {
      const b = await bytes(name)
      return b ? dec.decode(b) : null
    },
  }
}

async function readZipEntry(buf: Uint8Array, name: string): Promise<string | null> {
  return openZip(buf).text(name)
}

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

export async function docxToHtml(file: File): Promise<string> {
  const xml = await readZipEntry(new Uint8Array(await file.arrayBuffer()), "word/document.xml")
  if (!xml) throw new Error("Không đọc được nội dung tệp DOCX này.")
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  if(doc.querySelector('parsererror'))throw Error('Tệp Word có XML bị lỗi.')
  const paragraph=(p:Element)=>{
    const style=p.getElementsByTagNameNS(W,'pStyle')[0]?.getAttributeNS(W,'val')||''
    const isList=p.getElementsByTagNameNS(W,'numPr').length>0
    let inner=''
    for(const r of Array.from(p.getElementsByTagNameNS(W,'r'))){
      let text=''
      for(const node of Array.from(r.childNodes) as Element[]){if(node.localName==='t')text+=escapeHtml(node.textContent||'');else if(node.localName==='tab')text+=' ';else if(node.localName==='br')text+='<br>'}
      const rPr=r.getElementsByTagNameNS(W,'rPr')[0]
      for(const tag of ['b','i','u']){const el=rPr?.getElementsByTagNameNS(W,tag)[0],v=el?.getAttributeNS(W,'val');if(el&&!['0','false','none'].includes(v||''))text=`<${tag}>${text}</${tag}>`}
      inner+=text
    }
    if(!inner.trim())return '<p><br></p>'
    if(isList)return `<ul><li>${inner}</li></ul>`
    const tag=/^(Title|Heading1)$/i.test(style)?'h1':/^Heading2$/i.test(style)?'h2':/^Heading[3-6]$/i.test(style)?'h3':'p'
    return `<${tag}>${inner}</${tag}>`
  }
  const blocks=(parent:Element):string=>Array.from(parent.children).map(el=>{
    if(el.localName==='p')return paragraph(el)
    if(el.localName==='tbl')return '<table><tbody>'+Array.from(el.children).filter(e=>e.localName==='tr').map(tr=>'<tr>'+Array.from(tr.children).filter(e=>e.localName==='tc').map(td=>'<td>'+blocks(td)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'
    if(el.localName==='sdt'||el.localName==='sdtContent')return blocks(el)
    return ''
  }).join('')
  const body=doc.getElementsByTagNameNS(W,'body')[0]
  return body?blocks(body):''
}
