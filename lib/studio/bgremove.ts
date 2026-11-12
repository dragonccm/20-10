"use client"

import { loadImg } from "./image"

/**
 * Background removal that runs entirely in the browser (no API cost, photos never leave the device).
 * Uses Transformers.js + the RMBG-1.4 model (~44MB, cached by the browser after the first run).
 * RMBG-1.4 is licensed for non-commercial use, which fits this personal workspace.
 */
const LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js"
const MODEL = "briaai/RMBG-1.4"

type Status = (msg: string) => void
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let engine: Promise<{ T: any; model: any; processor: any }> | null = null

function loadEngine(onStatus?: Status) {
  if (!engine) {
    engine = (async () => {
      onStatus?.("Đang tải mô hình xóa nền (lần đầu khoảng 45MB)...")
      const T = await import(/* webpackIgnore: true */ LIB)
      const model = await T.AutoModel.from_pretrained(MODEL, { config: { model_type: "custom" }, dtype: "q8" })
      const processor = await T.AutoProcessor.from_pretrained(MODEL, {
        config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          feature_extractor_type: "ImageFeatureExtractor",
          image_std: [1, 1, 1],
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 },
        },
      })
      return { T, model, processor }
    })().catch((e) => {
      engine = null
      throw e
    })
  }
  return engine
}

export type Cutout = { src: string; w: number; h: number }

/** Remove the background with the AI model. Returns a trimmed transparent PNG. */
export async function removeBackgroundAI(src: string, onStatus?: Status, trimResult = true): Promise<Cutout> {
  let eng
  try {
    eng = await loadEngine(onStatus)
  } catch {
    throw new Error("Không tải được mô hình xóa nền. Kiểm tra mạng rồi thử lại.")
  }
  onStatus?.("Đang tách nền (khoảng 10–30 giây)...")
  const { T, model, processor } = eng
  const image = await T.RawImage.fromURL(src)
  const { pixel_values } = await processor(image)
  const { output } = await model({ input: pixel_values })
  const mask = await T.RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(image.width, image.height)

  const img = await loadImg(src)
  const c = document.createElement("canvas")
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext("2d")!
  ctx.drawImage(img, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height)
  const m = mask.data as Uint8Array
  for (let i = 0; i < m.length; i++) d.data[i * 4 + 3] = Math.min(d.data[i * 4 + 3], m[i])
  ctx.putImageData(d, 0, 0)
  return trimResult ? trim(c) : {src:c.toDataURL("image/png"),w:c.width,h:c.height}
}

/**
 * Quick, offline removal of a plain background (white paper, studio wall, solid colour):
 * flood-fills from the borders with pixels close to the edge colour, with a soft edge.
 */
export async function removeFlatBackground(src: string, tolerance = 40): Promise<Cutout> {
  const img = await loadImg(src)
  const c = document.createElement("canvas")
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext("2d", { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const { width: W, height: H } = c
  const d = ctx.getImageData(0, 0, W, H)
  const px = d.data

  // Reference colour = median of the border pixels.
  const border: number[][] = []
  for (let x = 0; x < W; x += Math.max(1, Math.floor(W / 200))) border.push(at(x, 0), at(x, H - 1))
  for (let y = 0; y < H; y += Math.max(1, Math.floor(H / 200))) border.push(at(0, y), at(W - 1, y))
  const med = [0, 1, 2].map((k) => border.map((p) => p[k]).sort((a, b) => a - b)[Math.floor(border.length / 2)])
  function at(x: number, y: number) {
    const i = (y * W + x) * 4
    return [px[i], px[i + 1], px[i + 2]]
  }
  const dist = (i: number) => Math.hypot(px[i] - med[0], px[i + 1] - med[1], px[i + 2] - med[2])

  const seen = new Uint8Array(W * H)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    const p = y * W + x
    if (!seen[p] && dist(p * 4) <= tolerance * 1.6) {
      seen[p] = 1
      stack.push(p)
    }
  }
  for (let x = 0; x < W; x++) push(x, 0), push(x, H - 1)
  for (let y = 0; y < H; y++) push(0, y), push(W - 1, y)
  while (stack.length) {
    const p = stack.pop()!
    const x = p % W
    const y = (p - x) / W
    const dd = dist(p * 4)
    // Soft edge: fully clear near the reference colour, partial alpha towards the tolerance limit.
    px[p * 4 + 3] = dd <= tolerance ? 0 : Math.round(((dd - tolerance) / (tolerance * 0.6)) * 255)
    if (x > 0) push(x - 1, y)
    if (x < W - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < H - 1) push(x, y + 1)
  }
  ctx.putImageData(d, 0, 0)
  return trim(c)
}

/** Crop away fully transparent margins so the sticker's box hugs the subject. */
function trim(c: HTMLCanvasElement): Cutout {
  const ctx = c.getContext("2d")!
  const { data } = ctx.getImageData(0, 0, c.width, c.height)
  let x0 = c.width
  let y0 = c.height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (data[(y * c.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) throw new Error("Không tìm thấy chủ thể trong ảnh, thử cách xóa nền khác nhé.")
  const pad = 4
  x0 = Math.max(0, x0 - pad)
  y0 = Math.max(0, y0 - pad)
  x1 = Math.min(c.width - 1, x1 + pad)
  y1 = Math.min(c.height - 1, y1 + pad)
  const out = document.createElement("canvas")
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  out.getContext("2d")!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  return { src: out.toDataURL("image/png"), w: out.width, h: out.height }
}

/** Small preview sent to the AI so it knows what each photo shows. */
export async function thumbnail(src: string, max = 320) {
  const img = await loadImg(src)
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.round(img.naturalWidth * s))
  c.height = Math.max(1, Math.round(img.naturalHeight * s))
  const ctx = c.getContext("2d")!
  // Light checker so the model can tell a cut-out sticker from a photo with a white background.
  ctx.fillStyle = "#e5e7eb"
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.fillStyle = "#ffffff"
  for (let y = 0; y < c.height; y += 16) for (let x = (y / 16) % 2 ? 16 : 0; x < c.width; x += 32) ctx.fillRect(x, y, 16, 16)
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL("image/jpeg", 0.8)
}
