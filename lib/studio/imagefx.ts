"use client"

export type Filters = { brightness: number; contrast: number; saturate: number; grayscale: number; sepia: number; hue: number; blur: number }
export type Crop = { x: number; y: number; w: number; h: number } // fractions of the natural image

export const NO_FILTER: Filters = { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hue: 0, blur: 0 }
export const FULL_CROP: Crop = { x: 0, y: 0, w: 1, h: 1 }

export const PRESETS: { name: string; f: Partial<Filters> }[] = [
  { name: "Gốc", f: {} },
  { name: "Sáng", f: { brightness: 115, contrast: 105, saturate: 110 } },
  { name: "Rực rỡ", f: { saturate: 150, contrast: 110 } },
  { name: "Ấm", f: { sepia: 25, saturate: 120, brightness: 105 } },
  { name: "Lạnh", f: { saturate: 90, hue: 12, brightness: 104, contrast: 104 } },
  { name: "Đen trắng", f: { grayscale: 100, contrast: 110 } },
  { name: "Cổ điển", f: { sepia: 60, contrast: 90, brightness: 105, saturate: 80 } },
  { name: "Mơ màng", f: { brightness: 110, contrast: 85, saturate: 90, blur: 1 } },
]

export const withDefaults = (f?: Partial<Filters>): Filters => ({ ...NO_FILTER, ...(f ?? {}) })
export const isPlain = (f?: Partial<Filters>) => {
  const v = withDefaults(f)
  return (Object.keys(NO_FILTER) as (keyof Filters)[]).every((k) => v[k] === NO_FILTER[k])
}

/** CSS filter string; `blurPx` lets callers scale the blur to the rendered size. */
export function cssFilter(f: Partial<Filters> | undefined, blurPx?: number) {
  const v = withDefaults(f)
  const blur = blurPx ?? v.blur
  return `brightness(${v.brightness}%) contrast(${v.contrast}%) saturate(${v.saturate}%) grayscale(${v.grayscale}%) sepia(${v.sepia}%) hue-rotate(${v.hue}deg)${blur ? ` blur(${blur}px)` : ""}`
}

let filterSupport: boolean | null = null
function canvasFilterSupported() {
  if (filterSupport === null) {
    const ctx = document.createElement("canvas").getContext("2d")
    if (ctx) ctx.filter = "blur(1px)"
    filterSupport = !!ctx && ctx.filter === "blur(1px)"
  }
  return filterSupport
}

type M = number[] // 3x3 row-major colour matrix

const saturateM = (s: number): M => [
  0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
  0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
  0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
]
const grayscaleM = (a: number): M => {
  const r = 1 - a
  return [
    0.2126 + 0.7874 * r, 0.7152 - 0.7152 * r, 0.0722 - 0.0722 * r,
    0.2126 - 0.2126 * r, 0.7152 + 0.2848 * r, 0.0722 - 0.0722 * r,
    0.2126 - 0.2126 * r, 0.7152 - 0.7152 * r, 0.0722 + 0.9278 * r,
  ]
}
const sepiaM = (a: number): M => {
  const r = 1 - a
  return [
    0.393 + 0.607 * r, 0.769 - 0.769 * r, 0.189 - 0.189 * r,
    0.349 - 0.349 * r, 0.686 + 0.314 * r, 0.168 - 0.168 * r,
    0.272 - 0.272 * r, 0.534 - 0.534 * r, 0.131 + 0.869 * r,
  ]
}
const hueM = (deg: number): M => {
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ]
}

/** Pixel fallback that follows the CSS filter order (blur is skipped). */
function applyManual(data: Uint8ClampedArray, f: Filters) {
  const b = f.brightness / 100
  const k = f.contrast / 100
  const mats: M[] = []
  if (f.saturate !== 100) mats.push(saturateM(f.saturate / 100))
  if (f.grayscale) mats.push(grayscaleM(f.grayscale / 100))
  if (f.sepia) mats.push(sepiaM(f.sepia / 100))
  if (f.hue) mats.push(hueM(f.hue))
  for (let i = 0; i < data.length; i += 4) {
    let r = (data[i] / 255) * b
    let g = (data[i + 1] / 255) * b
    let bl = (data[i + 2] / 255) * b
    r = (r - 0.5) * k + 0.5
    g = (g - 0.5) * k + 0.5
    bl = (bl - 0.5) * k + 0.5
    for (const m of mats) {
      r = Math.min(1, Math.max(0, r))
      g = Math.min(1, Math.max(0, g))
      bl = Math.min(1, Math.max(0, bl))
      const nr = m[0] * r + m[1] * g + m[2] * bl
      const ng = m[3] * r + m[4] * g + m[5] * bl
      const nb = m[6] * r + m[7] * g + m[8] * bl
      r = nr
      g = ng
      bl = nb
    }
    data[i] = r * 255
    data[i + 1] = g * 255
    data[i + 2] = bl * 255
  }
}

/**
 * Crop + filter an image into a canvas of the cropped natural size.
 * `blurScale` converts the design-pixel blur into natural pixels.
 */
export function processImage(img: HTMLImageElement, crop: Crop, f: Partial<Filters> | undefined, blurScale = 1) {
  const sx = crop.x * img.naturalWidth
  const sy = crop.y * img.naturalHeight
  const sw = Math.max(1, crop.w * img.naturalWidth)
  const sh = Math.max(1, crop.h * img.naturalHeight)
  const c = document.createElement("canvas")
  c.width = Math.round(sw)
  c.height = Math.round(sh)
  const ctx = c.getContext("2d")!
  const v = withDefaults(f)
  if (isPlain(v)) {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
  } else if (canvasFilterSupported()) {
    ctx.filter = cssFilter(v, v.blur * blurScale)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
  } else {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
    const data = ctx.getImageData(0, 0, c.width, c.height)
    applyManual(data.data, v)
    ctx.putImageData(data, 0, 0)
  }
  return c
}
