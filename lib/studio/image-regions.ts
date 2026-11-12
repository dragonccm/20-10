import { z } from "zod"
export const photoAdviceSchema = z
  .object({
    style: z.string().max(1200),
    brightness: z.number().min(50).max(150),
    contrast: z.number().min(50).max(150),
    saturate: z.number().min(0).max(200),
    captions: z.array(z.string().max(180)).max(4),
  })
  .strict()
function dimensions(pixels: Uint8ClampedArray, w: number, h: number) {
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w < 1 ||
    h < 1 ||
    pixels.length !== w * h * 4
  )
    throw Error("Kích thước ảnh không hợp lệ.")
}
export function colorRegion(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  tolerance: number,
): Uint8Array {
  dimensions(pixels, w, h)
  x = Math.floor(x)
  y = Math.floor(y)
  if (x < 0 || y < 0 || x >= w || y >= h)
    throw Error("Vị trí chọn nằm ngoài ảnh.")
  const mask = new Uint8Array(w * h),
    seen = new Uint8Array(w * h),
    queue = new Int32Array(w * h),
    origin = (y * w + x) * 4,
    limit = Math.max(0, Math.min(255, tolerance)) ** 2 * 3
  let head = 0,
    tail = 0
  const push = (p: number) => {
    if (seen[p]) return
    seen[p] = 1
    const i = p * 4,
      d =
        (pixels[i] - pixels[origin]) ** 2 +
        (pixels[i + 1] - pixels[origin + 1]) ** 2 +
        (pixels[i + 2] - pixels[origin + 2]) ** 2
    if (d > limit || Math.abs(pixels[i + 3] - pixels[origin + 3]) > 60) return
    mask[p] = 255
    queue[tail++] = p
  }
  push(y * w + x)
  while (head < tail) {
    const p = queue[head++],
      px = p % w,
      py = Math.floor(p / w)
    if (px > 0) push(p - 1)
    if (px < w - 1) push(p + 1)
    if (py > 0) push(p - w)
    if (py < h - 1) push(p + w)
  }
  return mask
}
export function changeRegion(
  pixels: Uint8ClampedArray,
  mask: Uint8Array,
  kind: "clear" | "color",
  color: [number, number, number] = [0, 0, 0],
) {
  if (pixels.length !== mask.length * 4)
    throw Error("Vùng chọn không khớp ảnh.")
  const out = new Uint8ClampedArray(pixels)
  for (let p = 0; p < mask.length; p++) {
    const alpha = mask[p] / 255
    if (!alpha) continue
    const i = p * 4
    if (kind === "clear") out[i + 3] = Math.round(out[i + 3] * (1 - alpha))
    else {
      const brightness =
        (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) /
        180
      for (let c = 0; c < 3; c++)
        out[i + c] = Math.round(
          pixels[i + c] * (1 - alpha) +
            Math.min(255, color[c] * Math.max(0.25, brightness)) * alpha,
        )
    }
  }
  return out
}
/** Local neighbor-based inpainting for small objects on simple backgrounds. */
export function inpaintRegion(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  mask: Uint8Array,
) {
  dimensions(pixels, w, h)
  if (mask.length !== w * h) throw Error("Vùng chọn không khớp ảnh.")
  const out = new Uint8ClampedArray(pixels),
    known = new Uint8Array(mask.length),
    queued = new Uint8Array(mask.length),
    queue = new Int32Array(mask.length)
  let head = 0,
    tail = 0,
    count = 0
  for (let p = 0; p < mask.length; p++) {
    known[p] = mask[p] < 64 ? 1 : 0
    if (!known[p]) count++
  }
  if (!count) throw Error("Bạn chọn vùng muốn xóa trước nhé.")
  if (count === mask.length)
    throw Error("Cần để lại một phần nền để lấy màu lân cận.")
  const neighbors = (p: number) => {
    const x = p % w,
      y = Math.floor(p / w),
      out: number[] = []
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h)
          out.push((y + dy) * w + x + dx)
      }
    return out
  }
  for (let p = 0; p < mask.length; p++)
    if (!known[p] && neighbors(p).some((n) => known[n])) {
      queued[p] = 1
      queue[tail++] = p
    }
  while (head < tail) {
    const p = queue[head++],
      ns = neighbors(p).filter((n) => known[n])
    if (!ns.length) continue
    for (let c = 0; c < 4; c++)
      out[p * 4 + c] = Math.round(
        ns.reduce((sum, n) => sum + out[n * 4 + c], 0) / ns.length,
      )
    known[p] = 1
    for (const n of neighbors(p))
      if (!known[n] && !queued[n]) {
        queued[n] = 1
        queue[tail++] = n
      }
  }
  for (let pass = 0; pass < 2; pass++) {
    const previous = new Uint8ClampedArray(out)
    for (let p = 0; p < mask.length; p++)
      if (mask[p] >= 64) {
        const ns = neighbors(p)
        for (let c = 0; c < 3; c++)
          out[p * 4 + c] = Math.round(
            ns.reduce((sum, n) => sum + previous[n * 4 + c], 0) / ns.length,
          )
      }
  }
  return out
}
