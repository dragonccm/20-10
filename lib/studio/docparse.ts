"use client"

import { docxToHtml, openZip, type Zip } from "./docx"
import { fileToDataUrl } from "./image"

/**
 * Reads uploaded documents in the browser: PDF (pdf.js from CDN), Word .docx, PowerPoint .pptx,
 * plain text / Markdown. Files are never uploaded anywhere; only extracted text goes to the AI
 * when the user presses an AI button.
 */

export type FileKind = "pdf" | "docx" | "pptx" | "text" | "image"
export type DocKind = "essay" | "cv" | "slides" | "other"

export type Parsed = {
  kind: FileKind
  /** Clean text, paragraphs separated by blank lines. */
  text: string
  /** One entry per page (PDF) or slide (PPTX). */
  parts: string[]
  /** Width / height of a page or slide. */
  ratio: number
  html?: string
}

export type SlideEl =
  | {
      kind: "text"
      x: number
      y: number
      w: number
      h: number
      text: string
      size: number
      bold: boolean
      color?: string
      align: "left" | "center" | "right"
      role: "title" | "body" | "other"
    }
  | { kind: "image"; x: number; y: number; w: number; h: number; src: string; nw: number; nh: number; alpha: boolean }
  | { kind: "shape"; x: number; y: number; w: number; h: number; fill: string; ellipse: boolean }

/** Coordinates are fractions of the slide (0..1); `size` is a fraction of the slide width. */
export type RichSlide = { bg?: string; els: SlideEl[]; notes: string }

export const ACCEPT = ".pdf,.docx,.pptx,.txt,.md,.markdown,image/png,image/jpeg,image/webp"
export const MAX_FILE = 40 * 1024 * 1024

export function fileKind(name: string, type = ""): FileKind | null {
  const n = name.toLowerCase()
  if (n.endsWith(".pdf") || type === "application/pdf") return "pdf"
  if (n.endsWith(".docx")) return "docx"
  if (n.endsWith(".pptx")) return "pptx"
  if (/\.(txt|md|markdown)$/.test(n) || type.startsWith("text/")) return "text"
  if (/^image\/(png|jpeg|webp)$/.test(type) || /\.(png|jpe?g|webp)$/.test(n)) return "image"
  return null
}

export function unsupportedReason(name: string) {
  if (/\.(doc|ppt|xls|xlsx)$/i.test(name)) return "Định dạng cũ (.doc/.ppt/.xls) chưa đọc được. Hãy mở bằng Word/PowerPoint rồi lưu lại thành .docx, .pptx hoặc PDF nhé."
  if (/\.(heic|heif)$/i.test(name)) return "Ảnh HEIC chưa hỗ trợ, hãy chụp màn hình hoặc đổi sang JPG."
  return "Hiện hỗ trợ PDF, Word (.docx), PowerPoint (.pptx), ảnh chụp (JPG/PNG) và .txt."
}

export async function parseFile(file: Blob, name: string): Promise<Parsed> {
  const kind = fileKind(name, file.type)
  if (!kind) throw new Error(unsupportedReason(name))
  if (kind === "pdf") return parsePdf(file)
  if (kind === "docx") {
    const html = await docxToHtml(file as File)
    const text = htmlText(html)
    return { kind, text, parts: [text], ratio: 1 / 1.414, html }
  }
  if (kind === "pptx") return parsePptx(file)
  if (kind === "text") {
    const text = (await file.text()).replace(/\r/g, "").trim()
    return { kind, text, parts: [text], ratio: 1 / 1.414 }
  }
  return { kind, text: "", parts: [], ratio: 1 }
}

function htmlText(html: string) {
  const d = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html")
  return Array.from(d.body.firstElementChild!.children)
    .map((el) => (el.tagName === "UL" || el.tagName === "OL" ? Array.from(el.children).map((li) => "- " + li.textContent).join("\n") : el.textContent ?? ""))
    .filter((s) => s.trim())
    .join("\n\n")
}

export function wordCount(s: string) {
  const latin = s.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0
  return latin
}

export function detectLang(s: string): "vi" | "en" | "ko" {
  const sample = s.slice(0, 4000)
  const hangul = (sample.match(/[가-힣]/g) ?? []).length
  const letters = (sample.match(/\p{L}/gu) ?? []).length || 1
  if (hangul / letters > 0.2) return "ko"
  const vi = (sample.match(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/gi) ?? []).length
  return vi / letters > 0.03 ? "vi" : "en"
}

/** Best guess of what the document is; the user can change it. */
export function guessKind(p: Parsed, name: string): DocKind {
  const t = p.text.toLowerCase()
  const n = name.toLowerCase()
  if (p.kind === "pptx") return "slides"
  if (/\b(cv|resume|résumé)\b|이력서/.test(n)) return "cv"
  const words = wordCount(p.text)
  const cvHits = [/@[\w-]+\.\w+/, /(kinh nghiệm|experience|경력)/, /(học vấn|education|학력)/, /(kỹ năng|skills|기술|능력)/, /(\+?84|0)\d[\d .]{7,}/].filter((r) => r.test(t)).length
  if (cvHits >= 3 && words < 1500) return "cv"
  if (p.kind === "pdf" && p.ratio > 1.2 && words / Math.max(1, p.parts.length) < 120) return "slides"
  if (/slide|presentation|thuyết trình|발표/.test(n)) return "slides"
  if (words >= 150) return "essay"
  return "other"
}

/** Text to send to the AI: keeps slide/page markers so answers can point to them. */
export function aiText(text: string, parts: string[], kind: DocKind, fileKind: FileKind, max = 23000) {
  const marker = fileKind === "pptx" || kind === "slides" ? "Slide" : "Trang"
  const body = parts.length > 1 ? parts.map((p, i) => `[${marker} ${i + 1}]\n${p}`).join("\n\n") : text
  return body.length > max ? body.slice(0, max) + "\n\n[...tài liệu dài, phần sau đã được lược bớt]" : body
}

/* ---------------- PDF ---------------- */

const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs"
const PDF_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjs: Promise<any> | null = null

function loadPdfjs() {
  if (!pdfjs) {
    pdfjs = import(/* webpackIgnore: true */ PDFJS).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = PDF_WORKER
      return lib
    })
    pdfjs.catch(() => (pdfjs = null))
  }
  return pdfjs
}

async function openPdf(file: Blob) {
  let lib
  try {
    lib = await loadPdfjs()
  } catch {
    throw new Error("Không tải được bộ đọc PDF. Kiểm tra mạng rồi thử lại.")
  }
  try {
    return await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  } catch (e) {
    if ((e as Error)?.name === "PasswordException") throw new Error("PDF này có mật khẩu, hãy bỏ mật khẩu rồi tải lại.")
    throw new Error("Không đọc được tệp PDF này.")
  }
}

type Line = { text: string; y: number; h: number }

async function parsePdf(file: Blob): Promise<Parsed> {
  const pdf = await openPdf(file)
  const parts: string[] = []
  let ratio = 1 / 1.414
  const pages = Math.min(pdf.numPages, 80)
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i)
    if (i === 1) {
      const vp = page.getViewport({ scale: 1 })
      ratio = vp.width / vp.height
    }
    const tc = await page.getTextContent()
    const lines: Line[] = []
    let cur = ""
    let y = 0
    let h = 10
    for (const it of tc.items as { str?: string; hasEOL?: boolean; transform?: number[]; height?: number }[]) {
      if (typeof it.str !== "string") continue
      if (!cur && it.str.trim()) {
        y = it.transform?.[5] ?? 0
        h = it.height || 10
      }
      cur += it.str
      if (it.hasEOL) {
        if (cur.trim()) lines.push({ text: cur.replace(/\s+/g, " ").trim(), y, h })
        cur = ""
      }
    }
    if (cur.trim()) lines.push({ text: cur.replace(/\s+/g, " ").trim(), y, h })
    parts.push(linesToParagraphs(lines))
  }
  await pdf.destroy?.()
  const text = parts.filter(Boolean).join("\n\n")
  return { kind: "pdf", text, parts, ratio }
}

/** Joins wrapped lines back into paragraphs using vertical gaps and line length. */
function linesToParagraphs(lines: Line[]) {
  if (!lines.length) return ""
  const gaps = lines.slice(1).map((l, i) => Math.abs(lines[i].y - l.y)).filter((g) => g > 0).sort((a, b) => a - b)
  const typical = gaps[Math.floor(gaps.length / 2)] || 14
  const longest = Math.max(...lines.map((l) => l.text.length))
  let out = lines[0].text
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1]
    const l = lines[i]
    const gap = Math.abs(prev.y - l.y)
    const shortEnd = prev.text.length < longest * 0.7 && /[.!?:;。"”)]$/.test(prev.text)
    const bullet = /^([-•●▪◦*]|\d+[.)])\s/.test(l.text)
    const heading = prev.h > l.h * 1.25
    if (gap > typical * 1.3 || shortEnd || bullet || heading) out += "\n\n" + l.text
    else if (/-$/.test(out) && /^\p{Ll}/u.test(l.text)) out = out.slice(0, -1) + l.text
    else out += " " + l.text
  }
  return out
}

/** Renders PDF pages to JPEG data URLs (for thumbnails or importing as slide images). */
export async function renderPdfPages(file: Blob, width = 1600, maxPages = 40, onProgress?: (i: number, n: number) => void) {
  const pdf = await openPdf(file)
  const out: { src: string; w: number; h: number }[] = []
  const n = Math.min(pdf.numPages, maxPages)
  for (let i = 1; i <= n; i++) {
    onProgress?.(i, n)
    const page = await pdf.getPage(i)
    const vp1 = page.getViewport({ scale: 1 })
    const vp = page.getViewport({ scale: width / vp1.width })
    const c = document.createElement("canvas")
    c.width = Math.round(vp.width)
    c.height = Math.round(vp.height)
    const ctx = c.getContext("2d")!
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, c.width, c.height)
    await page.render({ canvasContext: ctx, viewport: vp }).promise
    out.push({ src: c.toDataURL("image/jpeg", 0.82), w: c.width, h: c.height })
  }
  await pdf.destroy?.()
  return out
}

/* ---------------- PPTX ---------------- */

const all = (el: Element | Document, local: string) => Array.from(el.getElementsByTagNameNS("*", local))
const first = (el: Element | Document, local: string) => el.getElementsByTagNameNS("*", local)[0] as Element | undefined
const kids = (el: Element, local: string) => Array.from(el.children).filter((c) => c.localName === local)
const kid = (el: Element | undefined, local: string) => (el ? Array.from(el.children).find((c) => c.localName === local) : undefined)
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

function xml(s: string) {
  return new DOMParser().parseFromString(s, "application/xml")
}

async function rels(zip: Zip, part: string) {
  const dir = part.slice(0, part.lastIndexOf("/") + 1)
  const file = part.slice(part.lastIndexOf("/") + 1)
  const src = await zip.text(`${dir}_rels/${file}.rels`)
  const map = new Map<string, { target: string; type: string }>()
  if (!src) return map
  for (const r of all(xml(src), "Relationship")) {
    const t = r.getAttribute("Target") ?? ""
    map.set(r.getAttribute("Id") ?? "", { target: r.getAttribute("TargetMode") === "External" ? "" : resolvePath(dir, t), type: r.getAttribute("Type") ?? "" })
  }
  return map
}

function resolvePath(dir: string, target: string) {
  if (target.startsWith("/")) return target.slice(1)
  const parts = (dir + target).split("/")
  const out: string[] = []
  for (const p of parts) {
    if (p === "..") out.pop()
    else if (p && p !== ".") out.push(p)
  }
  return out.join("/")
}

async function slideOrder(zip: Zip) {
  const pres = await zip.text("ppt/presentation.xml")
  if (!pres) throw new Error("Không đọc được tệp PowerPoint này.")
  const doc = xml(pres)
  const sz = first(doc, "sldSz")
  const cx = Number(sz?.getAttribute("cx")) || 12192000
  const cy = Number(sz?.getAttribute("cy")) || 6858000
  const rel = await rels(zip, "ppt/presentation.xml")
  const slides = all(doc, "sldId")
    .map((s) => rel.get(s.getAttributeNS(R_NS, "id") ?? s.getAttribute("r:id") ?? "")?.target)
    .filter((x): x is string => !!x)
  return { slides, cx, cy }
}

function paragraphs(sp: Element) {
  const body = first(sp, "txBody")
  if (!body) return []
  return kids(body, "p").map((p) => {
    let s = ""
    for (const c of Array.from(p.children)) {
      if (c.localName === "r" || c.localName === "fld") s += first(c, "t")?.textContent ?? ""
      else if (c.localName === "br") s += "\n"
    }
    const ppr = kid(p, "pPr")
    const rpr = first(p, "rPr") ?? first(p, "endParaRPr")
    return {
      text: s,
      level: Number(ppr?.getAttribute("lvl") ?? 0),
      bulletNone: !!(ppr && kid(ppr, "buNone")),
      bullet: !!(ppr && (kid(ppr, "buChar") || kid(ppr, "buAutoNum"))),
      algn: ppr?.getAttribute("algn") ?? "",
      sz: Number(rpr?.getAttribute("sz") ?? 0),
      b: rpr?.getAttribute("b") === "1",
      color: (rpr && first(rpr, "srgbClr")?.getAttribute("val")) || "",
    }
  })
}

function phKey(sp: Element) {
  const ph = first(sp, "ph")
  if (!ph) return null
  const type = ph.getAttribute("type") ?? "body"
  return { type: type === "ctrTitle" ? "title" : type, idx: ph.getAttribute("idx") ?? "" }
}

type Xfrm = { x: number; y: number; w: number; h: number }
function xfrmOf(el: Element): Xfrm | null {
  const spPr = kid(el, "spPr") ?? kid(el, "grpSpPr")
  const xf = kid(spPr, "xfrm")
  const off = kid(xf, "off")
  const ext = kid(xf, "ext")
  if (!off || !ext) return null
  return { x: Number(off.getAttribute("x")), y: Number(off.getAttribute("y")), w: Number(ext.getAttribute("cx")), h: Number(ext.getAttribute("cy")) }
}

/** Placeholder positions defined on the layout / master, used when a slide shape has none. */
function placeholderBoxes(doc: Document | null) {
  const map = new Map<string, Xfrm>()
  if (!doc) return map
  for (const sp of all(doc, "sp")) {
    const k = phKey(sp)
    const xf = xfrmOf(sp)
    if (!k || !xf) continue
    if (k.idx) map.set("idx:" + k.idx, xf)
    if (!map.has("type:" + k.type)) map.set("type:" + k.type, xf)
  }
  return map
}

function slideTextOf(doc: Document) {
  const lines: string[] = []
  let title = ""
  for (const sp of all(doc, "sp")) {
    const ps = paragraphs(sp).filter((p) => p.text.trim())
    if (!ps.length) continue
    const k = phKey(sp)
    if (k?.type === "title" && !title) {
      title = ps.map((p) => p.text).join(" ")
      continue
    }
    if (k?.type === "sldNum" || k?.type === "dt" || k?.type === "ftr") continue
    for (const p of ps) lines.push(("  ".repeat(p.level) + (k?.type === "body" || p.bullet ? "- " : "")) + p.text)
  }
  // Text inside tables.
  for (const tc of all(doc, "tc")) {
    const t = all(tc, "t").map((x) => x.textContent).join(" ").trim()
    if (t) lines.push(t)
  }
  return [title, ...lines].filter(Boolean).join("\n")
}

async function notesOf(zip: Zip, slidePath: string) {
  const r = await rels(zip, slidePath)
  const n = [...r.values()].find((x) => x.type.endsWith("/notesSlide"))
  if (!n) return ""
  const src = await zip.text(n.target)
  if (!src) return ""
  const doc = xml(src)
  return all(doc, "sp")
    .filter((sp) => phKey(sp)?.type === "body")
    .flatMap((sp) => paragraphs(sp).map((p) => p.text))
    .filter((s) => s.trim())
    .join("\n")
}

async function parsePptx(file: Blob): Promise<Parsed> {
  const zip = openZip(new Uint8Array(await file.arrayBuffer()))
  const { slides, cx, cy } = await slideOrder(zip)
  const parts: string[] = []
  for (const path of slides) {
    const src = await zip.text(path)
    if (!src) continue
    const body = slideTextOf(xml(src))
    const notes = await notesOf(zip, path)
    parts.push(notes ? `${body}\n(Ghi chú người nói: ${notes})` : body)
  }
  if (!parts.length) throw new Error("Không tìm thấy slide nào trong tệp này.")
  return { kind: "pptx", text: parts.join("\n\n"), parts, ratio: cx / cy }
}

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp" }

/** Full slide structure (text boxes with position and size, pictures, filled shapes) for editing. */
export async function readPptxSlides(file: Blob, onProgress?: (i: number, n: number) => void): Promise<{ ratio: number; slides: RichSlide[] }> {
  const zip = openZip(new Uint8Array(await file.arrayBuffer()))
  const { slides, cx, cy } = await slideOrder(zip)
  const out: RichSlide[] = []
  const media = new Map<string, Promise<{ src: string; w: number; h: number; alpha: boolean } | null>>()
  const loadMedia = (path: string) => {
    if (!media.has(path)) {
      media.set(
        path,
        (async () => {
          const ext = path.split(".").pop()?.toLowerCase() ?? ""
          const type = MIME[ext]
          const bytes = type ? await zip.bytes(path) : null
          if (!bytes) return null // EMF/WMF/SVG previews etc. are skipped
          try {
            return await fileToDataUrl(new File([bytes as BlobPart], path, { type }), 1600, 0.85, true)
          } catch {
            return null
          }
        })(),
      )
    }
    return media.get(path)!
  }

  for (let si = 0; si < slides.length; si++) {
    onProgress?.(si + 1, slides.length)
    const path = slides[si]
    const src = await zip.text(path)
    if (!src) continue
    const doc = xml(src)
    const r = await rels(zip, path)
    const layoutPath = [...r.values()].find((x) => x.type.endsWith("/slideLayout"))?.target
    const layoutSrc = layoutPath ? await zip.text(layoutPath) : null
    const layoutDoc = layoutSrc ? xml(layoutSrc) : null
    const masterPath = layoutPath ? [...(await rels(zip, layoutPath)).values()].find((x) => x.type.endsWith("/slideMaster"))?.target : undefined
    const masterSrc = masterPath ? await zip.text(masterPath) : null
    const masterDoc = masterSrc ? xml(masterSrc) : null
    const layoutBoxes = placeholderBoxes(layoutDoc)
    const masterBoxes = placeholderBoxes(masterDoc)
    const box = (sp: Element): Xfrm | null => {
      const own = xfrmOf(sp)
      if (own) return own
      const k = phKey(sp)
      if (!k) return null
      return layoutBoxes.get("idx:" + k.idx) ?? layoutBoxes.get("type:" + k.type) ?? masterBoxes.get("type:" + k.type) ?? null
    }

    const slide: RichSlide = { els: [], notes: await notesOf(zip, path) }
    const bgOf = (d: Document | null) => {
      const bg = d ? first(d, "bg") : undefined
      return bg ? first(bg, "srgbClr")?.getAttribute("val") : undefined
    }
    const bg = bgOf(doc) ?? bgOf(layoutDoc) ?? bgOf(masterDoc)
    if (bg) slide.bg = "#" + bg.toLowerCase()
    const bgBlip = first(doc, "bg") && first(first(doc, "bg")!, "blip")
    if (bgBlip) {
      const t = r.get(bgBlip.getAttributeNS(R_NS, "embed") ?? "")?.target
      const m = t ? await loadMedia(t) : null
      if (m) slide.els.push({ kind: "image", x: 0, y: 0, w: 1, h: 1, src: m.src, nw: m.w, nh: m.h, alpha: false })
    }

    type T = (b: Xfrm) => Xfrm
    const walk = async (parent: Element, tf: T) => {
      for (const node of Array.from(parent.children)) {
        if (node.localName === "grpSp") {
          const g = kid(node, "grpSpPr")
          const xf = kid(g, "xfrm")
          const off = kid(xf, "off")
          const ext = kid(xf, "ext")
          const chOff = kid(xf, "chOff")
          const chExt = kid(xf, "chExt")
          let inner = tf
          if (off && ext && chOff && chExt) {
            const ox = Number(off.getAttribute("x")), oy = Number(off.getAttribute("y"))
            const sx = Number(ext.getAttribute("cx")) / (Number(chExt.getAttribute("cx")) || 1)
            const sy = Number(ext.getAttribute("cy")) / (Number(chExt.getAttribute("cy")) || 1)
            const cxo = Number(chOff.getAttribute("x")), cyo = Number(chOff.getAttribute("y"))
            inner = (b) => tf({ x: ox + (b.x - cxo) * sx, y: oy + (b.y - cyo) * sy, w: b.w * sx, h: b.h * sy })
          }
          await walk(node, inner)
          continue
        }
        if (node.localName === "pic") {
          const blip = first(node, "blip")
          const xf = xfrmOf(node) ?? box(node)
          const t = blip ? r.get(blip.getAttributeNS(R_NS, "embed") ?? "")?.target : undefined
          if (!xf || !t) continue
          const m = await loadMedia(t)
          if (!m) continue
          const b = tf(xf)
          slide.els.push({ kind: "image", x: b.x / cx, y: b.y / cy, w: b.w / cx, h: b.h / cy, src: m.src, nw: m.w, nh: m.h, alpha: m.alpha })
          continue
        }
        if (node.localName !== "sp") continue
        const xf = box(node)
        if (!xf) continue
        const b = tf(xf)
        const frac = { x: b.x / cx, y: b.y / cy, w: b.w / cx, h: b.h / cy }
        const spPr = kid(node, "spPr")
        const fill = kid(spPr, "solidFill")
        const fillHex = fill ? first(fill, "srgbClr")?.getAttribute("val") : undefined
        const geom = first(spPr ?? node, "prstGeom")?.getAttribute("prst") ?? ""
        if (fillHex && frac.w > 0.005 && frac.h > 0.005) slide.els.push({ kind: "shape", ...frac, fill: "#" + fillHex.toLowerCase(), ellipse: geom === "ellipse" })

        const ps = paragraphs(node)
        if (!ps.some((p) => p.text.trim())) continue
        const k = phKey(node)
        if (k && ["sldNum", "dt", "ftr"].includes(k.type)) continue
        const role = k?.type === "title" ? "title" : k?.type === "body" || k?.type === "subTitle" || k?.type === "obj" ? "body" : "other"
        const sized = ps.filter((p) => p.sz)
        const pt = sized.length ? Math.max(...sized.map((p) => p.sz)) / 100 : role === "title" ? 40 : role === "body" ? 24 : 18
        const text = ps
          .map((p) => {
            const bullet = !p.bulletNone && (p.bullet || (role === "body" && k?.type === "body")) && p.text.trim()
            return "  ".repeat(p.level) + (bullet ? "• " : "") + p.text
          })
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
        const algn = ps.find((p) => p.algn)?.algn ?? (k?.type === "title" && phKey(node)?.type === "title" && first(doc, "ph")?.getAttribute("type") === "ctrTitle" ? "ctr" : "")
        const color = ps.find((p) => p.color)?.color
        slide.els.push({
          kind: "text",
          ...frac,
          text,
          size: (pt * 12700) / cx,
          bold: role === "title" || ps.some((p) => p.b),
          color: color ? "#" + color.toLowerCase() : undefined,
          align: algn === "ctr" ? "center" : algn === "r" ? "right" : "left",
          role,
        })
      }
    }
    const tree = first(doc, "spTree")
    if (tree) await walk(tree, (b) => b)
    out.push(slide)
  }
  return { ratio: cx / cy, slides: out }
}
