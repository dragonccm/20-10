"use client"

const imageCache = new Map<string, Promise<HTMLImageElement>>()
export function loadImg(src: string): Promise<HTMLImageElement> {
  const hit = imageCache.get(src)
  if (hit) { imageCache.delete(src); imageCache.set(src, hit); return hit }
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => { imageCache.delete(src); reject(new Error("Không tải được ảnh.")) }
    img.src = src
  })
  imageCache.set(src, pending)
  if (imageCache.size > 40) imageCache.delete(imageCache.keys().next().value!)
  return pending
}

/**
 * Downscale a picked photo to a data URL (keeps storage and upload small).
 * Photos become JPEG; with `keepAlpha`, PNG/WebP/GIF files that really are transparent stay transparent.
 */
export async function fileToDataUrl(file: File, max = 1600, quality = 0.85, keepAlpha = false, lossless = false) {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImg(url)
    const s = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement("canvas")
    c.width = Math.round(img.width * s)
    c.height = Math.round(img.height * s)
    const ctx = c.getContext("2d", { willReadFrequently: keepAlpha })!
    if(lossless){ctx.drawImage(img,0,0,c.width,c.height);return {src:c.toDataURL("image/png"),w:c.width,h:c.height,alpha:hasTransparency(ctx,c.width,c.height)}}
    if (keepAlpha && /image\/(png|webp|gif|svg)/.test(file.type)) {
      ctx.drawImage(img, 0, 0, c.width, c.height)
      if (hasTransparency(ctx, c.width, c.height)) return { src: c.toDataURL("image/png"), w: c.width, h: c.height, alpha: true }
      ctx.clearRect(0, 0, c.width, c.height)
    }
    ctx.fillStyle = "#fff" // flatten transparency for JPEG
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return { src: c.toDataURL("image/jpeg", quality), w: c.width, h: c.height, alpha: false }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h)
  for (let i = 3; i < data.length; i += 16) if (data[i] < 250) return true
  return false
}
