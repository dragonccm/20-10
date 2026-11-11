import { z } from "zod"
import type { Design } from "./design"

const number = z.number().finite()
const color = z.string().regex(/^#[0-9a-f]{6}$/i)
const fields = z.object({
  x: number.min(-20000).max(20000).optional(), y: number.min(-20000).max(20000).optional(),
  w: number.min(1).max(10000).optional(), h: number.min(1).max(10000).optional(),
  rot: number.min(-360).max(360).optional(), opacity: number.min(0).max(1).optional(),
  text: z.string().max(10000).optional(), fontSize: number.min(8).max(1000).optional(),
  color: color.optional(), fill: color.optional(), weight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]).optional(),
  align: z.enum(["left", "center", "right"]).optional(), font: z.enum(["sans", "serif"]).optional(),
  italic: z.boolean().optional(), lineHeight: number.min(.8).max(2.5).optional(), radius: number.min(0).max(2000).optional(),
}).strict()
const id = z.string().min(1).max(100)
export const designActionSchema = z.object({
  summary: z.string().min(1).max(600),
  operations: z.array(z.discriminatedUnion("op", [
    z.object({ op: z.literal("update"), id, changes: fields }).strict(),
    z.object({ op: z.literal("remove"), id }).strict(),
    z.object({ op: z.literal("add"), element: fields.extend({ type: z.enum(["text", "rect", "circle"]), x: number, y: number, w: number.min(1).max(10000), h: number.min(1).max(10000) }).strict() }).strict(),
    z.object({ op: z.literal("background"), from: color, to: color, angle: number.min(0).max(360) }).strict(),
  ])).min(1).max(80),
}).strict()
export type DesignAction = z.infer<typeof designActionSchema>

/** Apply a validated command list; unrelated layers and source images retain their identity. */
export function applyDesignAction(design: Design, input: unknown, options: { selectedId?: string; idFactory: () => string }): { design: Design; action: DesignAction } {
  const parsed = designActionSchema.safeParse(input)
  if (!parsed.success) throw new Error("Đề xuất AI chứa thao tác hoặc giá trị chưa hợp lệ. Hãy thử lại với yêu cầu cụ thể hơn.")
  const action = parsed.data
  const next: Design = { ...design, bg: { ...design.bg }, els: [...design.els] }
  for (const op of action.operations) {
    if (op.op === "background") {
      if (options.selectedId) throw new Error("Chế độ thành phần không được đổi nền toàn trang.")
      next.bg = { from: op.from, to: op.to, angle: op.angle }
    } else if (op.op === "add") {
      if (options.selectedId) throw new Error("Chế độ thành phần không được thêm lớp ngoài lựa chọn.")
      const parsed = fields.parse(Object.fromEntries(Object.entries(op.element).filter(([key]) => key !== "type")))
      next.els.push({ ...parsed, type: op.element.type, id: options.idFactory(), x: op.element.x, y: op.element.y, w: op.element.w, h: op.element.h, opacity: op.element.opacity ?? 1 })
    } else {
      if (options.selectedId && op.id !== options.selectedId) throw new Error("AI đã đề xuất sửa một lớp ngoài lựa chọn. Hãy thử lại.")
      const index = next.els.findIndex((el) => el.id === op.id)
      if (index < 0) throw new Error("AI tham chiếu một lớp không có trên trang.")
      const el = next.els[index]
      if (el.locked) throw new Error("AI không được chỉnh lớp đang khóa.")
      if (op.op === "remove") next.els.splice(index, 1)
      else {
        if (op.changes.text !== undefined && el.type !== "text") throw new Error("Chỉ lớp văn bản mới được sửa nội dung chữ.")
        next.els[index] = { ...el, ...op.changes, ...(op.changes.font ? { fontFamily: undefined } : {}) }
      }
    }
  }
  if (next.els.length > 500) throw new Error("Trang có quá nhiều thành phần.")
  return { design: next, action }
}

/** Send only editing metadata, never image bytes, source URLs or local filenames. */
export function designContext(design: Design, selectedId?: string) {
  return { w: design.w, h: design.h, bg: design.bg, selectedId,
    els: design.els.filter((el) => !selectedId || el.id === selectedId).map((el) => ({ id: el.id, type: el.type, x: el.x, y: el.y, w: el.w, h: el.h, rot: el.rot, opacity: el.opacity,
      text: el.text, fontSize: el.fontSize, color: el.color, fill: el.fill, weight: el.weight, align: el.align, locked: el.locked })) }
}
