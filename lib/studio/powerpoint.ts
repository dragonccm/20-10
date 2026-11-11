import PptxGenJS from "pptxgenjs"
import type { Design } from "./design"
import { safeFileName } from "./storage"

type Render = (design: Design, type: "image/png", transparent?: boolean) => Promise<Blob>

function imageData(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function exportPowerPoint(title: string, pages: Design[], render: Render) {
  const first = pages[0]
  if (!first) return
  const pptx = new PptxGenJS()
  const width = 13.333
  const height = width * first.h / first.w
  pptx.defineLayout({ name: "Bloom", width, height })
  pptx.layout = "Bloom"
  pptx.title = title

  for (const page of pages) {
    const slide = pptx.addSlide()
    const scale = Math.min(width / page.w, height / page.h)
    const left = (width - page.w * scale) / 2
    const top = (height - page.h * scale) / 2
    slide.background = { color: "FFFFFF" }
    slide.addImage({
      data: await imageData(await render({ ...page, els: [] }, "image/png")),
      x: left, y: top, w: page.w * scale, h: page.h * scale,
    })

    for (const el of page.els) {
      if (el.w <= 0 || el.h <= 0 || el.opacity <= 0) continue
      const box = { x: left + el.x * scale, y: top + el.y * scale, w: el.w * scale, h: el.h * scale, rotate: el.rot ?? 0 }
      const transparency = (1 - el.opacity) * 100
      if (el.type === "text") {
        const fontSize = (el.fontSize ?? 48) * scale * 72
        slide.addText(el.text ?? "", {
          ...box, margin: 0, valign: el.verticalAlign === "middle" ? "mid" : el.verticalAlign === "bottom" ? "bottom" : "top", align: el.align ?? "left",
          fontFace: el.fontFamily?.replace(/^Bloom /, "") ?? (el.font === "serif" ? "Georgia" : "Arial"),
          fontSize, lineSpacing: fontSize * (el.lineHeight ?? 1.25),
          bold: (el.weight ?? 400) >= 600, italic: el.italic,
          color: (el.color ?? "#000000").slice(1), transparency,
        })
      } else if (el.type === "image" && el.src) {
        const w = Math.ceil(el.w)
        const h = Math.ceil(el.h)
        const frame = { ...page, w, h, els: [{ ...el, x: 0, y: 0, w, h, rot: 0 }] }
        slide.addImage({ ...box, data: await imageData(await render(frame, "image/png", true)) })
      } else if (el.type === "rect" || el.type === "circle") {
        const kind = el.type === "circle" ? pptx.ShapeType.ellipse : el.radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect
        slide.addShape(kind, { ...box, fill: { color: (el.fill ?? "#000000").slice(1), transparency }, line: { transparency: 100 } })
      }
    }
  }

  await pptx.writeFile({ fileName: safeFileName(title) + ".pptx" })
}
