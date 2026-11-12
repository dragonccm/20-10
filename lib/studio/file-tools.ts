export function pageSelection(value: string, total: number): number[] {
  if (!value.trim()) return Array.from({ length: total }, (_, i) => i)
  const out: number[] = []
  for (const token of value.split(",")) {
    const m = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) throw Error("Nhập trang theo dạng 1,3-5.")
    const from = Number(m[1]),
      to = Number(m[2] || m[1])
    if (from < 1 || to < from || to > total)
      throw Error(`Số trang phải nằm trong 1–${total}.`)
    for (let p = from; p <= to; p++) if (!out.includes(p - 1)) out.push(p - 1)
  }
  return out
}
export function renamedFiles(
  names: string[],
  prefix: string,
  start = 1,
  replaceFrom = "",
  replaceTo = "",
) {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim()
  const used = new Set<string>()
  return names.map((name, i) => {
    const dot = name.lastIndexOf("."),
      ext = dot > 0 ? name.slice(dot) : "",
      base = dot > 0 ? name.slice(0, dot) : name
    let target = clean(prefix)
      ? `${clean(prefix)}-${String(start + i).padStart(3, "0")}${ext}`
      : clean(replaceFrom ? base.split(replaceFrom).join(replaceTo) : base) +
        ext
    if (!target || target === ext) target = `tep-${i + 1}${ext}`
    const original = target
    let n = 2
    while (used.has(target.toLowerCase()))
      target =
        original.slice(0, original.length - ext.length) + ` (${n++})` + ext
    used.add(target.toLowerCase())
    return target
  })
}
export async function pdfTools(
  files: File[],
  selection = "",
  rotate = 0,
  signal?: AbortSignal,
) {
  const { PDFDocument, degrees } = await import("pdf-lib")
  const out = await PDFDocument.create()
  for (const file of files) {
    signal?.throwIfAborted()
    const pdf = await PDFDocument.load(await file.arrayBuffer())
    const indices = pageSelection(selection, pdf.getPageCount())
    for (const p of await out.copyPages(pdf, indices)) {
      if (rotate) p.setRotation(degrees(p.getRotation().angle + rotate))
      out.addPage(p)
    }
  }
  if (!out.getPageCount()) throw Error("Chưa có trang nào.")
  return out.save()
}
export async function imagesToPdf(files: File[], signal?: AbortSignal) {
  const { PDFDocument } = await import("pdf-lib")
  const out = await PDFDocument.create()
  for (const file of files) {
    signal?.throwIfAborted()
    const img = new Image(),
      url = URL.createObjectURL(file)
    try {
      img.src = url
      await img.decode()
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")!
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      const png = await out.embedPng(canvas.toDataURL("image/png"))
      const maxW = 595,
        maxH = 842,
        scale = Math.min(maxW / png.width, maxH / png.height),
        p = out.addPage([maxW, maxH])
      p.drawImage(png, {
        x: (maxW - png.width * scale) / 2,
        y: (maxH - png.height * scale) / 2,
        width: png.width * scale,
        height: png.height * scale,
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  return out.save()
}
export async function renameZip(
  files: File[],
  names: string[],
  signal?: AbortSignal,
) {
  const data: Record<string, Uint8Array> = Object.create(null)
  for (let i = 0; i < files.length; i++) {
    signal?.throwIfAborted()
    data[`files/${names[i]}`] = new Uint8Array(await files[i].arrayBuffer())
  }
  signal?.throwIfAborted()
  const { zipSync } = await import("fflate")
  return zipSync(data, { level: 0 })
}
export function emlDraft(to: string, subject: string, body: string) {
  const head = (s: string) => s.replace(/[\r\n]/g, " ").trim()
  const encoded = btoa(
    Array.from(new TextEncoder().encode(head(subject)), (b) =>
      String.fromCharCode(b),
    ).join(""),
  )
  return `To: ${head(to)}\r\nSubject: =?UTF-8?B?${encoded}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${body.replace(/\r?\n/g, "\r\n")}`
}
