"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  BringToFront,
  Circle,
  CopyPlus,
  Crop as CropIcon,
  Download,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Italic,
  LayoutTemplate,
  Maximize,
  Palette,
  Plus,
  Redo2,
  RotateCw,
  SendToBack,
  SlidersHorizontal,
  Eraser,
  FileUp,
  Presentation,
  ImageMinus,
  Sparkles,
  WandSparkles,
  Square,
  Trash2,
  Type,
  Undo2,
  Wallpaper,
  X,
  type LucideIcon,
} from "lucide-react"
import { AiNotice, Button, Card, Input, Label, PageHeader, Select, Textarea } from "@/components/studio/ui"
import { TOOLS } from "@/lib/studio/tools"
import { downloadFile, safeFileName, uid } from "@/lib/studio/storage"
import { documentToDesigns, loadDesigns, storeDesigns } from "@/lib/studio/handoff"
import { fileKind } from "@/lib/studio/docparse"
import { fileToDataUrl, loadImg } from "@/lib/studio/image"
import { FULL_CROP, NO_FILTER, PRESETS, cssFilter, processImage, withDefaults, type Crop, type Filters } from "@/lib/studio/imagefx"
import { BGS, FONTS, SIZES, TEMPLATES, TEMPLATE_CATS, bgCss, blank, designForAi, fitText, wrap, sanitizeDesign, shape, text, type Design, type DesignDraft, type El, type TemplateCat } from "@/lib/studio/design"
import { callAi } from "@/lib/studio/ai"
import { removeBackgroundAI, removeFlatBackground, thumbnail } from "@/lib/studio/bgremove"
import { cn } from "@/lib/utils"
import { createSlideSet, slideSetPage, SLIDE_SETS } from "@/lib/studio/design"
import { CANVA_DECKS, loadCanvaDeck, type CanvaDeckInfo } from "@/lib/studio/canva-templates"
import {
  checkImageServerStatus,
  generateImageTask,
  fetchImageAsDataUrl,
  PROMPT_PRESETS,
  ASPECT_RATIOS as AI_ASPECT_RATIOS,
  type AspectRatio as AiAspectRatio,
  type ImageServerStatus,
} from "@/lib/studio/imagegen"

const tool = TOOLS.find((t) => t.slug === "creative")!

const SWATCHES = ["#1e293b", "#ffffff", "#7c3aed", "#db2777", "#0284c7", "#059669", "#f59e0b", "#fde68a", "#fbcfe8", "#ddd6fe"]
const ASPECTS: { label: string; r: number | null | "orig" }[] = [
  { label: "Tự do", r: null },
  { label: "Gốc", r: "orig" },
  { label: "1:1", r: 1 },
  { label: "4:5", r: 4 / 5 },
  { label: "3:4", r: 3 / 4 },
  { label: "16:9", r: 16 / 9 },
  { label: "9:16", r: 9 / 16 },
]

/* ---------- PNG / JPG rendering ---------- */

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, rr)
  else ctx.rect(x, y, w, h)
}

async function renderDesign(d: Design, type: "image/png" | "image/jpeg", transparent = false) {
  const c = document.createElement("canvas")
  c.width = d.w
  c.height = d.h
  const ctx = c.getContext("2d")!
  if (d.bg.from === d.bg.to) ctx.fillStyle = d.bg.from
  else {
    const a = (d.bg.angle * Math.PI) / 180
    const dx = Math.sin(a)
    const dy = -Math.cos(a)
    const len = Math.abs(d.w * dx) + Math.abs(d.h * dy)
    const g = ctx.createLinearGradient(d.w / 2 - (dx * len) / 2, d.h / 2 - (dy * len) / 2, d.w / 2 + (dx * len) / 2, d.h / 2 + (dy * len) / 2)
    g.addColorStop(0, d.bg.from)
    g.addColorStop(1, d.bg.to)
    ctx.fillStyle = g
  }
  if (!transparent) ctx.fillRect(0, 0, d.w, d.h)

  for (const el of d.els) {
    ctx.save()
    ctx.globalAlpha = el.opacity
    ctx.translate(el.x + el.w / 2, el.y + el.h / 2)
    if (el.rot) ctx.rotate((el.rot * Math.PI) / 180)
    const x = -el.w / 2
    const y = -el.h / 2
    if (el.shadow) {
      ctx.shadowColor = "rgba(0,0,0,0.35)"
      ctx.shadowBlur = el.type === "text" ? 12 : 30
      ctx.shadowOffsetY = el.type === "text" ? 3 : 10
    }
    if (el.type === "rect") {
      ctx.fillStyle = el.fill ?? "#000"
      rounded(ctx, x, y, el.w, el.h, el.radius ?? 0)
      ctx.fill()
    } else if (el.type === "circle") {
      ctx.fillStyle = el.fill ?? "#000"
      ctx.beginPath()
      ctx.ellipse(0, 0, el.w / 2, el.h / 2, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (el.type === "image" && el.src) {
      const img = await loadImg(el.src)
      const crop = el.crop ?? FULL_CROP
      const processed = processImage(img, crop, el.filters, (crop.w * img.naturalWidth) / el.w)
      if (el.cutout) {
        // Stickers: the shadow follows the subject's outline, no frame.
        ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1)
        ctx.drawImage(processed, x, y, el.w, el.h)
        ctx.restore()
        continue
      }
      if (el.shadow) {
        // Shadow follows the rounded frame, drawn before clipping.
        ctx.fillStyle = "#fff"
        rounded(ctx, x, y, el.w, el.h, el.radius ?? 0)
        ctx.fill()
        ctx.shadowColor = "transparent"
      }
      rounded(ctx, x, y, el.w, el.h, el.radius ?? 0)
      ctx.clip()
      ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1)
      ctx.drawImage(processed, x, y, el.w, el.h)
    } else if (el.type === "text") {
      const fs = el.fontSize ?? 48
      ctx.font = `${el.italic ? "italic " : ""}${el.weight ?? 400} ${fs}px ${FONTS[el.font ?? "sans"]}`
      ctx.fillStyle = el.color ?? "#000"
      ctx.textBaseline = "middle"
      ctx.textAlign = el.align ?? "left"
      const lh = fs * (el.lineHeight ?? 1.25)
      const tx = el.align === "center" ? 0 : el.align === "right" ? x + el.w : x
      wrap(ctx, el.text ?? "", el.w).forEach((line, i) => ctx.fillText(line, tx, y + i * lh + lh / 2))
    }
    ctx.restore()
  }
  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), type, 0.92))
}

/* ---------- Page ---------- */

type Guides = { v: number[]; h: number[] }
type HistoryMode = "push" | "throttle" | "none"

export default function CreativePage() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [curId, setCurId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [draggedLayer, setDraggedLayer] = useState<string | null>(null)
  const [layerTarget, setLayerTarget] = useState<{ id: string; above: boolean } | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [libraryTab, setLibraryTab] = useState<"slides" | "single" | "ai" | "imagegen" | "import">("slides")
  const [showImageGenModal, setShowImageGenModal] = useState(false)
  const [imageGenPrompt, setImageGenPrompt] = useState("")
  const [imageGenAspect, setImageGenAspect] = useState<AiAspectRatio>("1:1")
  const [imageGenLoading, setImageGenLoading] = useState(false)
  const [imageGenProgress, setImageGenProgress] = useState(0)
  const [imageGenResult, setImageGenResult] = useState<string | null>(null)
  const [imageGenResultDataUrl, setImageGenResultDataUrl] = useState<string | null>(null)
  const [imageServerStatus, setImageServerStatus] = useState<ImageServerStatus | null>(null)
  const [imageServerChecking, setImageServerChecking] = useState(false)
  const [scale, setScale] = useState(0.4)
  const [guides, setGuides] = useState<Guides>({ v: [], h: [] })
  const [cropping, setCropping] = useState<El | null>(null)
  const [panel, setPanel] = useState<"edit" | "adjust">("edit")
  const [cat, setCat] = useState<TemplateCat | "all">("all")
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiSize, setAiSize] = useState("auto")
  const [aiBusy, setAiBusy] = useState<"" | "create" | "edit">("")
  const [editOpen, setEditOpen] = useState(false)
  const [editPrompt, setEditPrompt] = useState("")
  const [bgBusy, setBgBusy] = useState<"" | "ai" | "flat">("")
  const [bgStatus, setBgStatus] = useState("")
  const [flatTol, setFlatTol] = useState(40)
  const [aiImgs, setAiImgs] = useState<{ id: string; src: string; w: number; h: number; cutout: boolean; busy?: boolean }[]>([])
  const aiImgRef = useRef<HTMLInputElement>(null)
  const deckRef = useRef<HTMLInputElement>(null)
  const [deckBusy, setDeckBusy] = useState("")
  const [exportingDeck, setExportingDeck] = useState(false)
  const [presenting, setPresenting] = useState(false)
  const [, setHistTick] = useState(0)
  const stageWrap = useRef<HTMLDivElement>(null)
  const textEditor = useRef<HTMLLabelElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const quotaWarned = useRef(false)
  const past = useRef<Design[]>([])
  const future = useRef<Design[]>([])
  const lastPush = useRef(0)

  useEffect(() => {
    loadDesigns().then((ds) => {
      setDesigns(ds)
      setCurId(ds[0]?.id ?? null)
      setShowNew(!ds.length)
      setLoaded(true)
    })
  }, [])

  // Debounced persistence (designs may contain images, so they live in IndexedDB).
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(async () => {
      if (!(await storeDesigns(designs)) && !quotaWarned.current) {
        quotaWarned.current = true
        toast.error("Bộ nhớ trình duyệt đã đầy, thay đổi mới chưa được lưu. Hãy xóa bớt thiết kế có ảnh lớn.")
      }
    }, 500)
    return () => clearTimeout(t)
  }, [designs, loaded])

  const cur = designs.find((d) => d.id === curId) ?? null
  const deck = cur?.deck
  const pages = deck ? designs.filter((d) => d.deck?.id === deck.id) : []
  const pageIndex = pages.findIndex((d) => d.id === curId)
  const curRef = useRef(cur)
  curRef.current = cur
  const selected = cur?.els.find((e) => e.id === sel) ?? null

  // History is per open design.
  useEffect(() => {
    past.current = []
    future.current = []
    setHistTick((t) => t + 1)
  }, [curId])

  const pushHistory = useCallback(() => {
    if (!curRef.current) return
    past.current = [...past.current.slice(-49), curRef.current]
    future.current = []
    lastPush.current = Date.now()
    setHistTick((t) => t + 1)
  }, [])

  const update = useCallback(
    (fn: (d: Design) => Design, mode: HistoryMode = "throttle") => {
      if (mode === "push" || (mode === "throttle" && Date.now() - lastPush.current > 700)) pushHistory()
      setDesigns((ds) => ds.map((d) => (d.id === curId ? { ...fn(d), updatedAt: Date.now() } : d)))
    },
    [curId, pushHistory],
  )
  const updateEl = useCallback(
    (id: string, patch: Partial<El>, mode: HistoryMode = "throttle") => update((d) => ({ ...d, els: d.els.map((e) => (e.id === id ? { ...e, ...patch } : e)) }), mode),
    [update],
  )

  const undo = useCallback(() => {
    const prev = past.current.pop()
    if (!prev || !curRef.current) return
    future.current.push(curRef.current)
    setDesigns((ds) => ds.map((d) => (d.id === prev.id ? prev : d)))
    setHistTick((t) => t + 1)
  }, [])
  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next || !curRef.current) return
    past.current.push(curRef.current)
    setDesigns((ds) => ds.map((d) => (d.id === next.id ? next : d)))
    setHistTick((t) => t + 1)
  }, [])

  const addDesign = (d: Design, select?: string) => {
    setDesigns((ds) => d.deck && cur?.deck?.id === d.deck.id
      ? ds.flatMap((page) => page.id === cur.id ? [page, d] : [page])
      : [d, ...ds])
    setCurId(d.id)
    setSel(select ?? null)
    setShowNew(false)
  }

  const openDeck = (pages: Design[]) => {
    setDesigns((ds) => [...pages, ...ds])
    setCurId(pages[0].id)
    setSel(null)
    setShowNew(false)
  }

  const movePage = (step: number) => {
    const neighbor = pages[pageIndex + step]
    if (!cur || !neighbor) return
    setDesigns((ds) => ds.map((d) => d.id === cur.id ? neighbor : d.id === neighbor.id ? cur : d))
  }

  const importDeck = async (file: File) => {
    const kind = fileKind(file.name, file.type)
    if (kind !== "pptx" && kind !== "pdf") return toast.error("Hãy chọn tệp PowerPoint (.pptx) hoặc PDF.")
    setDeckBusy("Đang đọc tệp...")
    try {
      const news = await documentToDesigns(file, file.name, kind, setDeckBusy)
      if (!news.length) throw new Error("Không có trang nào để nhập.")
      const deck = { id: uid(), name: file.name.replace(/\.[^.]+$/, "") }
      openDeck(news.map((page) => ({ ...page, deck })))
      toast.success(`Đã nhập ${news.length} ${kind === "pptx" ? "slide" : "trang"} thành thiết kế sửa được.`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeckBusy("")
    }
  }

  const openCanvaPresetDeck = async (deckInfo: CanvaDeckInfo) => {
    setDeckBusy(`Đang tải trọn bộ "${deckInfo.name}"...`)
    try {
      const news = await loadCanvaDeck(deckInfo.id)
      if (!news.length) throw new Error("Không có slide nào trong mẫu này.")
      openDeck(news)
      toast.success(`Đã mở thành công ${news.length} slide mẫu "${deckInfo.name}".`)
    } catch (e) {
      toast.error((e as Error).message || "Không thể tải mẫu slide.")
    } finally {
      setDeckBusy("")
    }
  }

  const addEl = (el: El, center = true) => {
    if (!cur) return
    update((d) => ({ ...d, els: [...d.els, center ? { ...el, x: Math.round(d.w / 2 - el.w / 2), y: Math.round(d.h / 2 - el.h / 2) } : el] }), "push")
    setSel(el.id)
  }

  const removeSel = useCallback(() => {
    if (!sel) return
    update((d) => ({ ...d, els: d.els.filter((e) => e.id !== sel) }), "push")
    setSel(null)
  }, [sel, update])

  const duplicateSel = useCallback(() => {
    if (!selected) return
    const copy = { ...selected, id: uid(), x: selected.x + 30, y: selected.y + 30 }
    update((d) => ({ ...d, els: [...d.els, copy] }), "push")
    setSel(copy.id)
  }, [selected, update])

  const move = (dir: 1 | -1) =>
    update((d) => {
      const i = d.els.findIndex((e) => e.id === sel)
      const j = i + dir
      if (i < 0 || j < 0 || j >= d.els.length) return d
      const els = [...d.els]
      ;[els[i], els[j]] = [els[j], els[i]]
      return { ...d, els }
    }, "push")

  const dropLayer = (targetId: string, above: boolean) => {
    setLayerTarget(null)
    setDraggedLayer(null)
    if (!draggedLayer || draggedLayer === targetId || !cur) return
    const layer = cur.els.find((el) => el.id === draggedLayer)
    if (!layer) return
    const remaining = cur.els.filter((el) => el.id !== draggedLayer)
    const targetIndex = remaining.findIndex((el) => el.id === targetId)
    if (targetIndex < 0) return
    // The canvas paints frontmost last. The list shows that layer first.
    remaining.splice(targetIndex + Number(above), 0, layer)
    if (remaining.some((el, index) => el.id !== cur.els[index].id)) {
      update((d) => ({ ...d, els: remaining }), "push")
    }
    setSel(layer.id)
  }

  const align = (how: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => {
    if (!selected || !cur) return
    const p: Partial<El> = {
      left: { x: 0 },
      hcenter: { x: Math.round((cur.w - selected.w) / 2) },
      right: { x: cur.w - selected.w },
      top: { y: 0 },
      vcenter: { y: Math.round((cur.h - selected.h) / 2) },
      bottom: { y: cur.h - selected.h },
    }[how]
    updateEl(selected.id, p, "push")
  }

  // Fit stage to available space.
  useEffect(() => {
    const el = stageWrap.current
    if (!el || !cur) return
    const fit = () => setScale(Math.min(Math.max(1, el.clientWidth - 32) / cur.w, (window.innerHeight * 0.68) / cur.h, 1))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cur?.w, cur?.h, cur, showNew])

  useEffect(() => {
    if (showNew || presenting) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      // Sliders/checkboxes keep focus after use; shortcuts should still work there.
      const typing = t?.closest("textarea,select,[contenteditable]") || (t instanceof HTMLInputElement && !["range", "checkbox", "color", "button"].includes(t.type))
      if (typing) return
      if (t instanceof HTMLInputElement && !(e.ctrlKey || e.metaKey) && e.key !== "Escape") return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
        return
      }
      if (!sel) return
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault()
        duplicateSel()
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        removeSel()
      } else if (e.key === "Escape") setSel(null)
      const step = e.shiftKey ? 10 : 1
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
      if (delta && selected) {
        e.preventDefault()
        updateEl(sel, { x: selected.x + delta[0], y: selected.y + delta[1] })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showNew, presenting, sel, selected, removeSel, duplicateSel, updateEl, undo, redo])

  const startDrag = (e: React.PointerEvent, el: El, mode: "move" | "resize" | "rotate") => {
    e.stopPropagation()
    e.preventDefault()
    setSel(el.id)
    if (!cur) return
    pushHistory()
    const sx = e.clientX
    const sy = e.clientY
    const start = { x: el.x, y: el.y, w: el.w, h: el.h }
    const W = cur.w
    const H = cur.h
    const rect = stageRef.current?.getBoundingClientRect()
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / scale
      const dy = (ev.clientY - sy) / scale
      if (mode === "move") {
        let nx = start.x + dx
        let ny = start.y + dy
        const thr = 8 / scale
        const g: Guides = { v: [], h: [] }
        const snapX: [number, number][] = [
          [nx + el.w / 2, W / 2],
          [nx, 0],
          [nx + el.w, W],
        ]
        for (const [val, target] of snapX)
          if (Math.abs(val - target) < thr) {
            nx += target - val
            g.v.push(target)
            break
          }
        const snapY: [number, number][] = [
          [ny + el.h / 2, H / 2],
          [ny, 0],
          [ny + el.h, H],
        ]
        for (const [val, target] of snapY)
          if (Math.abs(val - target) < thr) {
            ny += target - val
            g.h.push(target)
            break
          }
        setGuides(g)
        updateEl(el.id, { x: Math.round(nx), y: Math.round(ny) }, "none")
      } else if (mode === "resize") {
        let w = Math.max(20, Math.round(start.w + dx))
        let h = Math.max(20, Math.round(start.h + dy))
        if (ev.shiftKey || el.type === "image") {
          const r = start.w / start.h
          if (w / h > r) h = Math.round(w / r)
          else w = Math.round(h * r)
        }
        updateEl(el.id, { w, h }, "none")
      } else if (rect) {
        const cx = rect.left + (el.x + el.w / 2) * scale
        const cy = rect.top + (el.y + el.h / 2) * scale
        let deg = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90
        deg = ((deg % 360) + 360) % 360
        if (ev.shiftKey) deg = Math.round(deg / 15) * 15
        else {
          const near = Math.round(deg / 90) * 90
          if (Math.abs(deg - near) < 4) deg = near
        }
        updateEl(el.id, { rot: Math.round(deg) % 360 }, "none")
      }
    }
    const onUp = () => {
      setGuides({ v: [], h: [] })
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const exportAs = async (type: "image/png" | "image/jpeg") => {
    if (!cur) return
    try {
      const blob = await renderDesign(cur, type)
      downloadFile(`${safeFileName(cur.name)}.${type === "image/png" ? "png" : "jpg"}`, blob, type)
    } catch {
      toast.error("Không xuất được ảnh, thử lại nhé.")
    }
  }

  const exportDeck = async () => {
    if (!deck || !pages.length || exportingDeck) return
    setExportingDeck(true)
    try {
      const { exportPowerPoint } = await import("@/lib/studio/powerpoint")
      await exportPowerPoint(deck.name, pages, renderDesign)
    } catch {
      toast.error("Không xuất được PowerPoint. Hãy thử lại.")
    } finally {
      setExportingDeck(false)
    }
  }

  const addImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Hãy chọn một tệp ảnh.")
    try {
      const img = await fileToDataUrl(file, 1600, 0.85, true)
      const maxW = (cur?.w ?? 1080) * 0.6
      const s = Math.min(1, maxW / img.w)
      addEl({ id: uid(), type: "image", x: 0, y: 0, w: Math.round(img.w * s), h: Math.round(img.h * s), opacity: 1, radius: 0, src: img.src, nw: img.w, nh: img.h, cutout: img.alpha || undefined })
    } catch {
      toast.error("Không đọc được ảnh này.")
    }
  }

  const openPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Hãy chọn một tệp ảnh.")
    try {
      const img = await fileToDataUrl(file, 1600, 0.9)
      const el: El = { id: uid(), type: "image", x: 0, y: 0, w: img.w, h: img.h, opacity: 1, radius: 0, src: img.src, nw: img.w, nh: img.h }
      addDesign({ id: uid(), name: file.name.replace(/\.[^.]+$/, "") || "Ảnh", w: img.w, h: img.h, bg: BGS[0], els: [el], updatedAt: Date.now() }, el.id)
      setPanel("adjust")
    } catch {
      toast.error("Không đọc được ảnh này.")
    }
  }

  const refreshImageServer = useCallback(async () => {
    setImageServerChecking(true)
    const s = await checkImageServerStatus()
    setImageServerStatus(s)
    setImageServerChecking(false)
  }, [])

  const handleGenerateAiImage = async () => {
    if (!imageGenPrompt.trim()) return toast.error("Vui lòng nhập mô tả bức ảnh.")
    setImageGenLoading(true)
    setImageGenProgress(10)
    setImageGenResult(null)
    setImageGenResultDataUrl(null)
    try {
      const url = await generateImageTask(imageGenPrompt, imageGenAspect, (p) => {
        setImageGenProgress(p.progress)
      })
      setImageGenResult(url)
      try {
        const dataUrl = await fetchImageAsDataUrl(url)
        setImageGenResultDataUrl(dataUrl)
      } catch {
        setImageGenResultDataUrl(url)
      }
      toast.success("Tạo ảnh thành công!")
    } catch (e: any) {
      toast.error(e.message || "Tạo ảnh thất bại.")
    } finally {
      setImageGenLoading(false)
    }
  }

  const handleInsertAiImage = async (asSticker: boolean) => {
    const src = imageGenResultDataUrl || imageGenResult
    if (!src || !cur) return
    try {
      let finalSrc = src
      let finalCutout = false
      if (asSticker) {
        toast.info("Đang tách nền ảnh thành sticker...")
        const cut = await removeBackgroundAI(src, setBgStatus)
        finalSrc = cut.src
        finalCutout = true
      }
      const img = await loadImg(finalSrc)
      const maxW = cur.w * 0.6
      const maxH = cur.h * 0.6
      const s = Math.min(1, maxW / img.w, maxH / img.h)
      const w = Math.round(img.w * s)
      const h = Math.round(img.h * s)
      const x = Math.round((cur.w - w) / 2)
      const y = Math.round((cur.h - h) / 2)
      addEl({
        id: uid(),
        type: "image",
        x,
        y,
        w,
        h,
        opacity: 1,
        radius: 0,
        src: finalSrc,
        nw: img.w,
        nh: img.h,
        cutout: finalCutout || undefined,
      })
      setShowImageGenModal(false)
      toast.success(asSticker ? "Đã chèn sticker vào trang" : "Đã chèn ảnh vào trang")
    } catch (e: any) {
      toast.error(e.message || "Không thể chèn ảnh vào trang.")
    }
  }

  const natural = async (el: El) => {
    if (el.nw && el.nh) return { nw: el.nw, nh: el.nh }
    const img = await loadImg(el.src!)
    return { nw: img.naturalWidth, nh: img.naturalHeight }
  }

  const setAsBackground = async (el: El) => {
    if (!cur) return
    const { nw, nh } = await natural(el)
    const pageR = cur.w / cur.h
    const imgR = nw / nh
    const crop: Crop = imgR > pageR ? { x: (1 - pageR / imgR) / 2, y: 0, w: pageR / imgR, h: 1 } : { x: 0, y: (1 - imgR / pageR) / 2, w: 1, h: imgR / pageR }
    update((d) => {
      const rest = d.els.filter((e) => e.id !== el.id)
      return { ...d, els: [{ ...el, x: 0, y: 0, w: d.w, h: d.h, rot: 0, radius: 0, crop, nw, nh }, ...rest] }
    }, "push")
  }

  const fitPageToImage = (el: El) => {
    update((d) => ({ ...d, w: Math.round(el.w), h: Math.round(el.h), els: d.els.map((e) => (e.id === el.id ? { ...e, x: 0, y: 0, rot: 0 } : { ...e, x: e.x - el.x, y: e.y - el.y })) }), "push")
  }

  const applyCrop = (el: El, crop: Crop, nw: number, nh: number) => {
    const h = Math.round(el.w * ((crop.h * nh) / (crop.w * nw)))
    updateEl(el.id, { crop, nw, nh, h }, "push")
    setCropping(null)
  }

  const cutBackground = async (el: El, how: "ai" | "flat") => {
    if (!el.src) return
    setBgBusy(how)
    setBgStatus(how === "flat" ? "Đang xóa nền..." : "")
    try {
      const source = el.origSrc ?? el.src
      const curNw = el.nw ? el.nw : (await loadImg(el.src)).naturalWidth
      const cut = how === "ai" ? await removeBackgroundAI(source, setBgStatus) : await removeFlatBackground(source, flatTol)
      // Same on-screen scale as before; the box shrinks to hug the subject around the same centre.
      const k = el.w / ((el.crop?.w ?? 1) * curNw)
      const w = Math.max(20, Math.round(cut.w * k))
      const h = Math.max(20, Math.round(cut.h * k))
      updateEl(el.id, { src: cut.src, origSrc: source, cutout: true, nw: cut.w, nh: cut.h, crop: undefined, radius: 0, w, h, x: Math.round(el.x + el.w / 2 - w / 2), y: Math.round(el.y + el.h / 2 - h / 2) }, "push")
      toast.success("Đã xóa nền. Ảnh giờ là sticker, kéo đi trang trí thoải mái.")
    } catch (e) {
      toast.error((e as Error).message || "Không xóa được nền ảnh này.")
    } finally {
      setBgBusy("")
      setBgStatus("")
    }
  }

  const restoreOriginal = async (el: El) => {
    if (!el.origSrc) return
    const img = await loadImg(el.origSrc)
    const k = el.w / (el.nw ?? img.naturalWidth)
    const w = Math.round(img.naturalWidth * k)
    const h = Math.round(img.naturalHeight * k)
    updateEl(el.id, { src: el.origSrc, origSrc: undefined, cutout: undefined, nw: img.naturalWidth, nh: img.naturalHeight, crop: undefined, w, h, x: Math.round(el.x + el.w / 2 - w / 2), y: Math.round(el.y + el.h / 2 - h / 2) }, "push")
  }

  const addAiImages = async (files: FileList) => {
    const room = 4 - aiImgs.length
    if (room <= 0) return toast.info("Tối đa 4 ảnh cho mỗi lần tạo.")
    for (const f of Array.from(files).slice(0, room)) {
      if (!f.type.startsWith("image/")) continue
      try {
        const img = await fileToDataUrl(f, 1400, 0.85, true)
        setAiImgs((xs) => [...xs, { id: uid(), src: img.src, w: img.w, h: img.h, cutout: img.alpha }])
      } catch {
        toast.error(`Không đọc được ${f.name}.`)
      }
    }
  }

  const cutAiImage = async (id: string) => {
    const it = aiImgs.find((x) => x.id === id)
    if (!it) return
    setAiImgs((xs) => xs.map((x) => (x.id === id ? { ...x, busy: true } : x)))
    try {
      const cut = await removeBackgroundAI(it.src, setBgStatus)
      setAiImgs((xs) => xs.map((x) => (x.id === id ? { ...x, src: cut.src, w: cut.w, h: cut.h, cutout: true, busy: false } : x)))
    } catch (e) {
      toast.error((e as Error).message)
      setAiImgs((xs) => xs.map((x) => (x.id === id ? { ...x, busy: false } : x)))
    } finally {
      setBgStatus("")
    }
  }

  /** Describe the photos for the model: refs, kind and a small preview of each. */
  const imageBrief = async (els: El[]) => {
    const imgs = els.map((e, i) => ({ e, ref: `img${i}` })).filter(({ e }) => e.type === "image" && e.src).slice(0, 4)
    const thumbs = await Promise.all(imgs.map(({ e }) => thumbnail(e.src!).catch(() => "")))
    const lines = imgs.map(({ e, ref }) => `${ref}: ${e.cutout ? "sticker đã tách nền (nền trong suốt), hợp để trang trí, đặt chồng lên nền hoặc cạnh chữ" : "ảnh chụp có nền, hợp đặt trong khung bo góc hoặc làm nền"}; tỉ lệ w/h = ${(e.w / e.h).toFixed(2)}`)
    return { text: lines.length ? `\nẢnh của người dùng (ảnh xem trước gửi kèm theo đúng thứ tự):\n${lines.join("\n")}` : "", images: thumbs.filter(Boolean) }
  }

  const aiCreate = async () => {
    if (!aiPrompt.trim()) return toast.info("Hãy mô tả thiết kế bạn muốn, ví dụ: poster mời dự workshop tiếng Hàn, tông xanh mint.")
    const size = aiSize === "auto" ? null : SIZES[Number(aiSize)]
    setAiBusy("create")
    try {
      const prompt =
        `Tạo thiết kế mới. Yêu cầu: ${aiPrompt.trim()}\n` +
        (size ? `Kích thước bắt buộc: w=${size.w}, h=${size.h}.` : "Tự chọn kích thước phù hợp nhất trong: 1080x1080, 1080x1350, 1080x1920, 1920x1080, 1280x720, 1240x1754.")
      const W = size?.w ?? 1080
      const H = size?.h ?? 1080
      const baseEls: El[] = aiImgs.map((im) => {
        const s = Math.min((W * 0.45) / im.w, (H * 0.45) / im.h, 1)
        const w = Math.round(im.w * s)
        const h = Math.round(im.h * s)
        return { id: uid(), type: "image", x: Math.round(W / 2 - w / 2), y: Math.round(H / 2 - h / 2), w, h, opacity: 1, radius: 0, src: im.src, nw: im.w, nh: im.h, cutout: im.cutout || undefined }
      })
      const brief = await imageBrief(baseEls)
      const res = await callAi<unknown>("design", {
        text: prompt + (brief.text ? `${brief.text}\nHãy dùng TẤT CẢ các ảnh này (mỗi ảnh đúng một lần, qua "ref"), chọn màu hài hòa với ảnh.` : ""),
        images: brief.images,
      })
      const raw = sanitizeDesign(res, { w: W, h: H, els: baseEls })
      if (!raw) throw new Error("AI chưa tạo được thiết kế hợp lệ, thử mô tả cụ thể hơn nhé.")
      const d = fitText(raw)
      if (size) Object.assign(d, { w: size.w, h: size.h })
      addDesign({ ...d, id: uid(), updatedAt: Date.now() })
      setAiImgs([])
      toast.success("Đã tạo xong. Bạn có thể sửa từng chữ, màu, vị trí như mẫu bình thường.")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setAiBusy("")
    }
  }

  const aiEdit = async () => {
    if (!cur) return
    if (!editPrompt.trim()) return toast.info("Hãy nói AI cần chỉnh gì, ví dụ: đổi sang tông hồng pastel.")
    setAiBusy("edit")
    try {
      const brief = await imageBrief(cur.els)
      const prompt = `Chỉnh sửa thiết kế hiện có. Yêu cầu: ${editPrompt.trim()}\nGiữ nguyên kích thước w=${cur.w}, h=${cur.h}.${brief.text}\nThiết kế hiện tại (JSON):\n${JSON.stringify(designForAi(cur))}`
      const res = await callAi<unknown>("design", { text: prompt, images: brief.images })
      const raw = sanitizeDesign(res, cur)
      if (!raw) throw new Error("AI chưa chỉnh được, thử nói cụ thể hơn nhé.")
      const d = fitText(raw)
      update((x) => ({ ...x, bg: d.bg, els: d.els }), "push")
      setSel(null)
      toast.success("Đã chỉnh theo yêu cầu. Chưa ưng thì bấm Hoàn tác (Ctrl+Z).")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setAiBusy("")
    }
  }

  useEffect(() => {
    document.getElementById("studio-scroll")?.scrollTo({ top: 0 })
  }, [showNew])

  const histPast = past.current.length
  const histFuture = future.current.length

  if (!loaded) return null

  return (
    <div>
      <PageHeader
        icon={tool.icon}
        tint={tool.tint}
        title={tool.name} guide={tool.guide}
        desc="Chỉnh ảnh, làm poster, slide, thẻ từ vựng. Kéo để di chuyển, kéo chấm tím để đổi cỡ, kéo chấm tròn phía trên để xoay."
        actions={
          <>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) openPhoto(f)
                e.target.value = ""
              }}
            />
            <Button variant="outline" icon={SlidersHorizontal} onClick={() => photoRef.current?.click()}>
              Chỉnh sửa ảnh
            </Button>
            <Button variant={showNew ? "soft" : "outline"} icon={Plus} onClick={() => setShowNew((v) => !v)} disabled={showNew && !cur}>
              {showNew && cur ? "Quay lại chỉnh sửa" : "Kho mẫu & tạo mới"}
            </Button>
          </>
        }
      />

      {showNew && (
        <Card className="mb-5 p-4">
          <div role="group" aria-label="Cách bắt đầu thiết kế" className="mb-5 flex flex-wrap gap-2">
            {([
              ["slides", "Bộ slide"],
              ["single", "Mẫu lẻ & trang trống"],
              ["ai", "Tạo bằng AI"],
              ["imagegen", "Vẽ ảnh AI (Imagen)"],
              ["import", "Nhập tệp"],
            ] as const).map(([id, label]) => (
              <Button key={id} variant={libraryTab === id ? "primary" : "outline"} aria-pressed={libraryTab === id} onClick={() => setLibraryTab(id)}>
                {label}
              </Button>
            ))}
          </div>
          {libraryTab === "slides" && (
          <section id="slide-sets" className="mb-5 space-y-8 scroll-mt-4">
            {/* Canva Showcase Presets */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-50/70 via-rose-50/40 to-violet-50/50 p-5 ring-1 ring-amber-200/60 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-600 to-rose-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                    <Sparkles className="h-3 w-3" />
                    Canva Presets Sẵn Dùng
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">Mẫu slide Canva nguyên bản</h2>
                  <p className="mt-0.5 text-sm text-slate-600 max-w-2xl">
                    Trọn bộ 10 slide thiết kế hoàn chỉnh từ Canva (đầy đủ đồ họa, sticker, tranh ảnh, font chữ & layout chuẩn). Mở trực tiếp 1 click để sửa từng thành phần.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {CANVA_DECKS.map((deck) => (
                  <div
                    key={deck.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                      {deck.coverImage ? (
                        <img
                          src={deck.coverImage}
                          alt={deck.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="grid h-full place-items-center"
                          style={{ background: deck.paper }}
                        >
                          <span className="font-semibold" style={{ color: deck.accent }}>{deck.name}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                          {deck.category}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <span className="rounded-md bg-amber-500/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-sm">
                          {deck.slidesCount} SLIDES
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 left-3 right-3 text-white">
                        <h3 className="text-base font-bold drop-shadow-sm">{deck.name}</h3>
                        <p className="text-xs text-slate-200 drop-shadow-sm">{deck.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <p className="text-xs leading-relaxed text-slate-600">
                          {deck.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {deck.tags.map((t) => (
                            <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 font-medium">Tỉ lệ 16:9 · Sửa tự do</span>
                        <Button
                          size="sm"
                          variant="primary"
                          className="gap-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white shadow-sm"
                          onClick={() => openCanvaPresetDeck(deck)}
                        >
                          <Presentation className="h-3.5 w-3.5" />
                          Mở trọn bộ {deck.slidesCount} slide
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Generator Slide Sets */}
            <div>
              <h2 className="font-semibold text-slate-800">Bộ slide sinh nhanh theo phong cách</h2>
              <p className="mt-1 text-sm text-slate-600">Chọn cấu trúc dàn bài và phối màu sẵn để sinh trọn bộ các trang thuyết trình 16:9.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {SLIDE_SETS.map((set) => (
                  <button key={set.name} type="button" onClick={() => openDeck(createSlideSet(set))} className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:border-violet-400 hover:shadow-md">
                    <div aria-hidden="true" className="grid h-44 place-items-center overflow-hidden p-2" style={{ background: set.paper }}>
                      <Mini d={slideSetPage(set, 0)} maxW={260} maxH={146} />
                    </div>
                    <div className="border-t border-slate-100 px-4 py-3">
                      <span className="block font-semibold text-slate-800">{set.name}</span>
                      <span className="mt-1 block text-xs text-slate-600">{set.style} · {set.pages.length} trang · 16:9</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <details className="mt-3 text-sm text-slate-600">
              <summary className="cursor-pointer font-medium">Tìm thêm mẫu miễn phí</summary>
              <p className="mt-2">Mở thư viện bên ngoài, chọn mẫu và tải PowerPoint nếu mẫu hỗ trợ. Sau đó dùng nút nhập bên dưới. Giữ phần ghi công theo điều khoản của mẫu.</p>
              <ul className="mt-2 flex flex-wrap gap-4 text-violet-700 underline">
                <li><a href="https://www.slidescarnival.com/category/education/free-templates" target="_blank" rel="noopener noreferrer">SlidesCarnival</a></li>
                <li><a href="https://www.canva.com/presentations/templates/education/" target="_blank" rel="noopener noreferrer">Canva Education</a></li>
                <li><a href="https://slidesgo.com/for-education" target="_blank" rel="noopener noreferrer">Slidesgo Education</a></li>
              </ul>
            </details>
          </section>
          )}
          {libraryTab === "ai" && (
          <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 p-4 ring-1 ring-violet-100">
            <h3 className="flex items-center gap-2 font-medium text-slate-800">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Tạo bằng AI theo ý bạn
            </h3>
            <AiNotice />
            <Textarea
              rows={2}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="mt-2 bg-white"
              placeholder="Ví dụ: Poster mời dự workshop luyện nói tiếng Hàn tối thứ Bảy 23/11 ở phòng A101, tông xanh mint, trẻ trung"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Poster workshop tiếng Hàn, tông xanh mint", "Bài đăng chúc mừng sinh nhật bạn thân, pastel", "Slide giới thiệu nhóm 4 người", "Thẻ từ vựng chủ đề món ăn Hàn"].map((x) => (
                <button key={x} type="button" onClick={() => setAiPrompt(x)} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200 hover:text-violet-700 hover:ring-violet-300">
                  {x}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-white/70 p-2.5 ring-1 ring-violet-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">Ảnh của bạn để AI dùng trang trí (tùy chọn, tối đa 4)</span>
                <input
                  ref={aiImgRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addAiImages(e.target.files)
                    e.target.value = ""
                  }}
                />
                <Button size="sm" variant="outline" icon={ImagePlus} onClick={() => aiImgRef.current?.click()} disabled={aiImgs.length >= 4}>
                  Thêm ảnh
                </Button>
              </div>
              {aiImgs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {aiImgs.map((im) => (
                    <div key={im.id} className="w-28 rounded-lg bg-white p-1.5 ring-1 ring-slate-200">
                      <div className="checker grid h-20 place-items-center overflow-hidden rounded-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={im.src} alt="" className="max-h-20 max-w-full object-contain" />
                      </div>
                      <div className="mt-1 flex gap-1">
                        <button
                          type="button"
                          disabled={im.cutout || im.busy}
                          onClick={() => cutAiImage(im.id)}
                          className="flex-1 truncate rounded-md bg-violet-50 px-1 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60"
                        >
                          {im.busy ? "Đang tách..." : im.cutout ? "Đã tách nền" : "Xóa nền"}
                        </button>
                        <button type="button" aria-label="Bỏ ảnh" onClick={() => setAiImgs((xs) => xs.filter((x) => x.id !== im.id))} className="grid w-6 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {bgStatus && aiImgs.some((x) => x.busy) && <p className="mt-1.5 text-xs text-violet-700">{bgStatus}</p>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select value={aiSize} onChange={(e) => setAiSize(e.target.value)} className="h-10 w-auto min-w-0 flex-1 sm:flex-none" aria-label="Kích thước">
                <option value="auto">AI tự chọn kích thước</option>
                {SIZES.map((x, i) => (
                  <option key={x.label} value={i}>
                    {x.label}
                  </option>
                ))}
              </Select>
              <Button icon={WandSparkles} loading={aiBusy === "create"} onClick={aiCreate}>
                {aiBusy === "create" ? "Đang thiết kế..." : "Tạo thiết kế"}
              </Button>
            </div>
          </div>

          )}
          {libraryTab === "import" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-100">
            <Presentation className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-slate-800">Nhập slide có sẵn</h3>
              <p className="text-xs text-slate-500">{deckBusy || "PowerPoint (.pptx): mỗi slide thành thiết kế sửa được chữ, ảnh, màu. PDF: mỗi trang thành ảnh nền để thêm chữ, sticker."}</p>
            </div>
            <input
              ref={deckRef}
              type="file"
              accept=".pptx,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importDeck(f)
                e.target.value = ""
              }}
            />
            <Button variant="outline" icon={FileUp} loading={!!deckBusy} onClick={() => deckRef.current?.click()}>
              Chọn tệp PPTX / PDF
            </Button>
          </div>

          )}
          {libraryTab === "imagegen" && (
            <div className="mt-3 rounded-2xl bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50 p-5 ring-1 ring-violet-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  <div>
                    <h3 className="font-semibold text-slate-800">Tạo ảnh bằng AI (Google Labs Imagen)</h3>
                    <p className="text-xs text-slate-500">Tạo ảnh minh họa chất lượng cao để chèn vào slide hoặc làm sticker</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      imageServerStatus?.running ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${imageServerStatus?.running ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {imageServerStatus?.running ? "Máy chủ sẵn sàng" : "Chưa kết nối máy chủ"}
                  </span>
                  <Button variant="outline" size="sm" loading={imageServerChecking} onClick={refreshImageServer} className="h-7 text-xs">
                    Kiểm tra
                  </Button>
                </div>
              </div>

              {!imageServerStatus?.running && (
                <div className="mt-3 rounded-xl bg-white/90 p-3 text-xs text-slate-600 ring-1 ring-amber-200">
                  <p className="font-medium text-amber-800">💡 Hướng dẫn kết nối máy chủ:</p>
                  <p className="mt-1">
                    Khởi động dự án <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">api-ai-flowchart</code> tại cổng 3069 (<code className="rounded bg-slate-100 px-1 py-0.5 font-mono">npm start</code>). Sau đó bấm nút “Kiểm tra” bên trên.
                  </p>
                </div>
              )}

              <div className="mt-4 space-y-3.5">
                <div>
                  <Label>Mô tả ảnh bạn muốn tạo (Prompt)</Label>
                  <Textarea
                    rows={2}
                    value={imageGenPrompt}
                    onChange={(e) => setImageGenPrompt(e.target.value)}
                    placeholder="Ví dụ: chú mèo pastel ngồi đọc sách bên cửa sổ hoa tulip, màu nước nhẹ nhàng..."
                    className="mt-1.5 bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-500">Gợi ý phong cách nhanh:</Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {PROMPT_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setImageGenPrompt((prev) => (prev ? `${prev}, ${p.style}` : `${p.hint}, ${p.style}`))}
                        className="rounded-lg bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200 transition hover:bg-violet-50 hover:text-violet-700 hover:ring-violet-300"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[160px]">
                    <Label className="text-xs text-slate-500">Tỉ lệ khung hình:</Label>
                    <Select value={imageGenAspect} onChange={(v) => setImageGenAspect(v as AiAspectRatio)} className="mt-1 bg-white">
                      {AI_ASPECT_RATIOS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="pt-5">
                    <Button
                      icon={Sparkles}
                      loading={imageGenLoading}
                      onClick={handleGenerateAiImage}
                      className="bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-sm"
                    >
                      {imageGenLoading ? `Đang tạo (${imageGenProgress}%)...` : "Tạo ảnh với AI"}
                    </Button>
                  </div>
                </div>

                {imageGenLoading && (
                  <div className="mt-2 rounded-xl bg-white p-3 ring-1 ring-violet-200">
                    <div className="flex justify-between text-xs text-violet-700 mb-1.5">
                      <span>Đang xử lý qua Google Labs Imagen...</span>
                      <span className="font-semibold">{imageGenProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-gradient-to-r from-violet-600 to-pink-500 transition-all duration-300" style={{ width: `${imageGenProgress}%` }} />
                    </div>
                  </div>
                )}

                {imageGenResult && (
                  <div className="mt-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Ảnh đã tạo hoàn thành</h4>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <img
                        src={imageGenResultDataUrl || imageGenResult}
                        alt="AI Result"
                        className="h-44 w-44 rounded-xl object-cover shadow-sm ring-1 ring-slate-200"
                      />
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <Button variant="primary" onClick={() => handleInsertAiImage(false)}>
                          Chèn vào trang thiết kế
                        </Button>
                        <Button variant="outline" onClick={() => handleInsertAiImage(true)} className="border-violet-300 text-violet-700 hover:bg-violet-50">
                          ✨ Tách nền & Chèn làm Sticker
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {libraryTab === "single" && (
          <>
          <div className="mt-5 mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-medium text-slate-800">
              <LayoutTemplate className="h-4 w-4 text-pink-500" />
              Hoặc bắt đầu từ {TEMPLATES.length} mẫu có sẵn
            </h3>
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {(["all", ...TEMPLATE_CATS] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium", cat === c ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
                >
                  {c === "all" ? "Tất cả" : c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {TEMPLATES.filter((t) => cat === "all" || t.cat === cat).map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => addDesign({ ...t.make(), id: uid(), updatedAt: Date.now() })}
                className="group overflow-hidden rounded-2xl bg-slate-50 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-pink-300"
              >
                <div className="grid h-44 place-items-center p-3">
                  <Mini d={t.make()} maxH={150} maxW={230} />
                </div>
                <div className="border-t border-slate-200 bg-white px-3 py-2">
                  <div className="truncate text-sm font-medium text-slate-700">{t.name}</div>
                  <div className="text-[11px] text-slate-400">{t.cat}</div>
                </div>
              </button>
            ))}
          </div>
          <h3 className="mt-5 mb-2 text-sm font-medium text-slate-700">Hoặc trang trống</h3>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <Button key={s.label} variant="outline" size="sm" onClick={() => addDesign(blank(s.w, s.h))}>
                {s.label}
              </Button>
            ))}
            <Button variant="soft" size="sm" icon={SlidersHorizontal} onClick={() => photoRef.current?.click()}>
              Mở một ảnh để chỉnh
            </Button>
          </div>
          </>
          )}
        </Card>
      )}

      {cur && !showNew && (
        <>
          {deck && (
            <Card className="mb-3 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="mr-auto font-medium text-slate-800">{deck.name} · Trang {pageIndex + 1}/{pages.length}</h2>
                <Button size="sm" variant="outline" icon={Presentation} onClick={() => setPresenting(true)}>Trình chiếu</Button>
                <Button size="sm" icon={Download} loading={exportingDeck} onClick={exportDeck}>Tải PowerPoint</Button>
                <Button size="sm" variant="outline" disabled={pageIndex <= 0} onClick={() => movePage(-1)}>Đưa lên trước</Button>
                <Button size="sm" variant="outline" disabled={pageIndex >= pages.length - 1} onClick={() => movePage(1)}>Đưa ra sau</Button>
                <Button size="sm" variant="soft" icon={Plus} onClick={() => addDesign({ ...blank(cur.w, cur.h, "Trang mới"), deck })}>Thêm trang</Button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {pages.map((page, index) => (
                  <Button key={page.id} size="sm" variant={page.id === curId ? "soft" : "outline"} aria-current={page.id === curId ? "page" : undefined} onClick={() => { setCurId(page.id); setSel(null) }}>
                    {index + 1}. {page.name}
                  </Button>
                ))}
              </div>
            </Card>
          )}
          {presenting && deck && <SlideShow pages={pages} start={pageIndex} onClose={() => setPresenting(false)} />}
          {/* Top toolbar */}
          <Card className="mb-4 flex flex-wrap items-center gap-2 p-2">
            <label className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 pl-2 text-xs font-medium text-slate-600">Tên thiết kế</span>
              <Input value={cur.name} onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} className="h-9 w-44 min-w-0" />
            </label>
            {designs.length > 1 && (
              <details className="relative">
                <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">Đổi thiết kế</summary>
                <div className="absolute left-0 z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  {designs.map((d) => (
                    <button key={d.id} type="button" aria-current={d.id === cur.id ? "true" : undefined} className={cn("block w-full truncate rounded-lg px-3 py-2 text-left text-sm", d.id === cur.id ? "bg-violet-50 font-medium text-violet-800" : "hover:bg-slate-50")} onClick={(e) => {
                      e.currentTarget.closest("details")?.removeAttribute("open")
                      setCurId(d.id)
                      setSel(null)
                    }}>
                      {d.name || "Thiết kế chưa đặt tên"}
                    </button>
                  ))}
                </div>
              </details>
            )}
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
            <Button size="icon" variant="ghost" icon={Undo2} aria-label="Hoàn tác" title="Hoàn tác (Ctrl+Z)" onClick={undo} disabled={!histPast} />
            <Button size="icon" variant="ghost" icon={Redo2} aria-label="Làm lại" title="Làm lại (Ctrl+Shift+Z)" onClick={redo} disabled={!histFuture} />
            <Button size="sm" variant={editOpen ? "soft" : "outline"} icon={Sparkles} onClick={() => setEditOpen((v) => !v)}>
              Chỉnh bằng AI
            </Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" icon={Download} onClick={() => exportAs("image/jpeg")}>
                Tải JPG
              </Button>
              <Button size="sm" icon={Download} onClick={() => exportAs("image/png")}>
                Tải PNG
              </Button>
            </div>
          </Card>

          {editOpen && (
            <Card className="mb-4 p-3">
              <AiNotice />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Textarea
                  rows={2}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && aiEdit()}
                  className="flex-1"
                  placeholder="Nói AI cần đổi gì: đổi sang tông hồng pastel, tiêu đề to hơn, thêm họa tiết, viết lại chữ bằng tiếng Hàn..."
                />
                <Button icon={WandSparkles} loading={aiBusy === "edit"} onClick={aiEdit} className="sm:h-auto">
                  {aiBusy === "edit" ? "Đang chỉnh..." : "Chỉnh"}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["Đổi sang tông hồng pastel", "Tông tối sang trọng", "Làm tiêu đề nổi bật hơn", "Thêm họa tiết trang trí", "Bố cục thoáng, tối giản hơn"].map((x) => (
                  <button key={x} type="button" onClick={() => setEditPrompt(x)} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-violet-50 hover:text-violet-700">
                    {x}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Ảnh của bạn được giữ nguyên, AI chỉ sắp xếp lại. Mỗi lần chỉnh đều hoàn tác được.</p>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-[185px_minmax(0,1fr)_245px] xl:grid-cols-[220px_minmax(0,1fr)_270px]">
            {/* Left: add & background */}
            <Card className="h-fit space-y-3 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Thêm vào trang</h2>
              <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-2">
                <AddBtn icon={Type} label="Chữ" onClick={() => addEl(text({ w: Math.round(cur.w * 0.6), fontSize: Math.round(cur.w / 18) }))} />
                <AddBtn icon={Square} label="Hình khối" onClick={() => addEl(shape("rect", { w: Math.round(cur.w * 0.4), h: Math.round(cur.w * 0.25) }))} />
                <AddBtn icon={Circle} label="Hình tròn" onClick={() => addEl(shape("circle", { w: Math.round(cur.w * 0.3), h: Math.round(cur.w * 0.3) }))} />
                <AddBtn icon={ImagePlus} label="Ảnh" onClick={() => fileRef.current?.click()} />
              </div>
              <button
                type="button"
                onClick={() => {
                  refreshImageServer()
                  setShowImageGenModal(true)
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-2 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95"
              >
                <Sparkles className="h-4 w-4" />
                Vẽ ảnh bằng AI
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) addImage(f)
                  e.target.value = ""
                }}
              />
              <details className="rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-slate-800">
                  Lớp <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{cur.els.length}</span>
                </summary>
                <div className="border-t border-slate-100 p-2">
                  <p className="px-1 pb-2 text-xs text-slate-600">Lớp trên cùng nằm trước. Kéo để đổi thứ tự.</p>
                  {selected && (
                    <div className="mb-2 flex gap-1">
                      <Button size="sm" variant="outline" className="min-w-0 flex-1 px-1" aria-label="Đưa lên một lớp" disabled={cur.els[cur.els.length - 1]?.id === sel} onClick={() => move(1)}>↑ Lên</Button>
                      <Button size="sm" variant="outline" className="min-w-0 flex-1 px-1" aria-label="Đưa xuống một lớp" disabled={cur.els[0]?.id === sel} onClick={() => move(-1)}>↓ Xuống</Button>
                    </div>
                  )}
                  {cur.els.length === 0 && <p className="px-1 text-xs text-slate-500">Trang này chưa có lớp nào.</p>}
                  <ol className="space-y-1" onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setLayerTarget(null)
                  }}>
                    {[...cur.els].reverse().map((el) => {
                      const Icon = el.type === "text" ? Type : el.type === "image" ? ImagePlus : el.type === "circle" ? Circle : Square
                      const name = el.type === "text" ? el.text?.trim() || "Văn bản" : el.type === "image" ? "Ảnh" : el.type === "circle" ? "Hình tròn" : "Hình khối"
                      return (
                        <li key={el.id} className="relative" onDragOver={(event) => {
                          if (!draggedLayer || draggedLayer === el.id) return
                          event.preventDefault()
                          event.dataTransfer.dropEffect = "move"
                          const bounds = event.currentTarget.getBoundingClientRect()
                          const above = event.clientY < bounds.top + bounds.height / 2
                          if (layerTarget?.id !== el.id || layerTarget.above !== above) setLayerTarget({ id: el.id, above })
                        }} onDrop={(event) => {
                          if (!draggedLayer || draggedLayer === el.id) return
                          event.preventDefault()
                          const bounds = event.currentTarget.getBoundingClientRect()
                          dropLayer(el.id, event.clientY < bounds.top + bounds.height / 2)
                        }}>
                          <button type="button" draggable title={name} aria-pressed={sel === el.id} onClick={() => setSel(el.id)} onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", el.id)
                            event.dataTransfer.effectAllowed = "move"
                            setDraggedLayer(el.id)
                            setSel(el.id)
                          }} onDragEnd={() => {
                            setDraggedLayer(null)
                            setLayerTarget(null)
                          }} className={cn("flex w-full items-center gap-2 rounded-lg border px-1.5 py-1.5 text-left text-xs", sel === el.id ? "border-violet-300 bg-violet-50 font-medium text-violet-800" : "border-transparent text-slate-700 hover:bg-slate-50", draggedLayer === el.id && "opacity-60")}>
                            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                            <span className="line-clamp-2 min-w-0 flex-1 break-words">{name}</span>
                            <span aria-hidden="true" className="shrink-0 cursor-grab text-slate-400">⠿</span>
                          </button>
                          {layerTarget?.id === el.id && <span aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded bg-violet-600", layerTarget.above ? "top-0" : "bottom-0")} />}
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </details>
              <details className="space-y-3 rounded-xl bg-slate-50 p-2.5">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">Thiết lập trang</summary>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" />
                  Nền trang
                </Label>
                <div className="grid grid-cols-8 gap-1.5 xl:grid-cols-4">
                  {BGS.map((b, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label="Chọn nền"
                      onClick={() => update((d) => ({ ...d, bg: b }), "push")}
                      className={cn("aspect-square rounded-lg ring-1 ring-slate-200", cur.bg.from === b.from && cur.bg.to === b.to && "ring-2 ring-violet-500")}
                      style={{ background: bgCss(b) }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <input type="color" value={cur.bg.from} onChange={(e) => update((d) => ({ ...d, bg: { ...d.bg, from: e.target.value } }))} className="h-7 w-9 cursor-pointer rounded" aria-label="Màu nền 1" />
                  <input type="color" value={cur.bg.to} onChange={(e) => update((d) => ({ ...d, bg: { ...d.bg, to: e.target.value } }))} className="h-7 w-9 cursor-pointer rounded" aria-label="Màu nền 2" />
                </div>
              </div>
              <div>
                <Label>Kích thước trang</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input type="number" min={100} value={cur.w} onChange={(e) => update((d) => ({ ...d, w: Math.max(100, Number(e.target.value) || 100) }))} className="h-9 px-2" aria-label="Chiều rộng" />
                  <Input type="number" min={100} value={cur.h} onChange={(e) => update((d) => ({ ...d, h: Math.max(100, Number(e.target.value) || 100) }))} className="h-9 px-2" aria-label="Chiều cao" />
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                className="w-full"
                onClick={() => {
                  if (!confirm(`Xóa thiết kế "${cur.name}"?`)) return
                  const rest = designs.filter((d) => d.id !== cur.id)
                  setDesigns(rest)
                  setCurId(rest[0]?.id ?? null)
                  setSel(null)
                  if (!rest.length) setShowNew(true)
                }}
              >
                Xóa thiết kế
              </Button>
              </details>
            </Card>

            {/* Stage */}
            <div ref={stageWrap} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100">
              <div className="flex min-h-14 flex-wrap items-center justify-center gap-1.5 rounded-t-2xl border-b border-slate-200 bg-white p-2">
                {!selected && <span className="text-xs text-slate-500">Chọn chữ, ảnh hoặc hình khối để chỉnh</span>}
                {selected?.type === "text" && (
                  <>
                    <Select aria-label="Kiểu chữ" value={selected.font ?? "sans"} onChange={(e) => updateEl(selected.id, { font: e.target.value as "sans" | "serif" }, "push")} className="h-8 w-32 pr-6">
                      <option value="sans">Hiện đại</option>
                      <option value="serif">Cổ điển</option>
                    </Select>
                    <Input aria-label="Cỡ chữ" type="number" min={8} value={selected.fontSize ?? 48} onChange={(e) => updateEl(selected.id, { fontSize: Math.max(8, Number(e.target.value)) })} className="h-8 w-16" />
                    <details key={selected.id + "-color"} className="relative">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
                        <span className="h-4 w-4 rounded border border-slate-300" style={{ background: selected.color ?? "#000000" }} />
                        Màu chữ
                      </summary>
                      <div className="absolute left-0 z-30 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                        <ColorRow label="Chọn màu chữ" value={selected.color ?? "#000000"} onChange={(color) => updateEl(selected.id, { color }, "push")} />
                      </div>
                    </details>
                    <Select aria-label="Độ đậm" value={selected.weight ?? 400} onChange={(e) => updateEl(selected.id, { weight: Number(e.target.value) }, "push")} className="h-8 w-28 pr-6">
                      <option value={400}>Thường</option>
                      <option value={500}>Vừa</option>
                      <option value={600}>Đậm vừa</option>
                      <option value={700}>Đậm</option>
                      <option value={800}>Rất đậm</option>
                    </Select>
                    <Button size="icon" variant={selected.italic ? "soft" : "ghost"} icon={Italic} aria-label="Chữ nghiêng" aria-pressed={!!selected.italic} onClick={() => updateEl(selected.id, { italic: !selected.italic }, "push")} />
                    {([["left", AlignLeft, "Căn trái"], ["center", AlignCenter, "Căn giữa"], ["right", AlignRight, "Căn phải"]] as const).map(([value, Icon, label]) => (
                      <Button key={value} size="icon" variant={(selected.align ?? "left") === value ? "soft" : "ghost"} icon={Icon} aria-label={label} title={label} onClick={() => updateEl(selected.id, { align: value }, "push")} />
                    ))}
                  </>
                )}
                {selected?.type === "image" && <Button size="sm" variant="outline" icon={CropIcon} onClick={() => setCropping(selected)}>Cắt ảnh</Button>}
                {selected && (
                  <>
                    <details key={selected.id} className="relative">
                      <summary className="cursor-pointer rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Lớp</summary>
                      <div className="absolute right-0 z-30 mt-1 grid w-40 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                        <Button size="sm" variant="ghost" icon={BringToFront} disabled={cur.els[cur.els.length - 1]?.id === sel} onClick={() => move(1)}>Lên một lớp</Button>
                        <Button size="sm" variant="ghost" icon={SendToBack} disabled={cur.els[0]?.id === sel} onClick={() => move(-1)}>Xuống một lớp</Button>
                      </div>
                    </details>
                    <Button size="icon" variant="ghost" icon={CopyPlus} aria-label="Nhân bản" title="Nhân bản (Ctrl+D)" onClick={duplicateSel} />
                    <Button size="icon" variant="danger" icon={Trash2} aria-label="Xóa thành phần" title="Xóa thành phần" onClick={removeSel} />
                  </>
                )}
              </div>
              <div className="flex justify-center py-4">
                <div
                  ref={stageRef}
                  className="relative shadow-lg ring-1 ring-slate-200 select-none"
                  style={{ width: cur.w * scale, height: cur.h * scale, background: bgCss(cur.bg), touchAction: "none" }}
                  onPointerDown={() => setSel(null)}
                >
                  <div className="absolute inset-0 overflow-hidden">
                    {cur.els.map((el) => (
                      <div
                        key={el.id}
                        onPointerDown={(e) => startDrag(e, el, "move")}
                        onDoubleClick={() => {
                          if (el.type === "image") setCropping(el)
                          if (el.type === "text") {
                            setSel(el.id)
                            requestAnimationFrame(() => {
                              const field = textEditor.current?.querySelector("textarea")
                              field?.focus()
                              field?.select()
                            })
                          }
                        }}
                        className="absolute cursor-move"
                        style={{ left: el.x * scale, top: el.y * scale, width: el.w * scale, height: el.h * scale, transform: el.rot ? `rotate(${el.rot}deg)` : undefined }}
                      >
                        <ElView el={el} scale={scale} />
                      </div>
                    ))}
                  </div>
                  {/* Selection frame drawn outside the clipping layer so handles stay visible */}
                  {selected && (
                    <div
                      className="pointer-events-none absolute outline-2 outline-violet-500 outline-dashed"
                      style={{
                        left: selected.x * scale,
                        top: selected.y * scale,
                        width: selected.w * scale,
                        height: selected.h * scale,
                        transform: selected.rot ? `rotate(${selected.rot}deg)` : undefined,
                      }}
                    >
                      <span
                        onPointerDown={(e) => startDrag(e, selected, "rotate")}
                        title="Kéo để xoay (giữ Shift: mỗi 15°)"
                        className="pointer-events-auto absolute -top-7 left-1/2 grid h-5 w-5 -translate-x-1/2 cursor-grab place-items-center rounded-full border-2 border-white bg-white text-violet-600 shadow ring-1 ring-violet-300"
                      >
                        <RotateCw className="h-3 w-3" />
                      </span>
                      <span
                        onPointerDown={(e) => startDrag(e, selected, "resize")}
                        title="Kéo để đổi kích thước"
                        className="pointer-events-auto absolute -right-2 -bottom-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-violet-600 shadow"
                      />
                    </div>
                  )}
                  {guides.v.map((x) => (
                    <div key={`v${x}`} className="pointer-events-none absolute top-0 bottom-0 w-px bg-pink-500" style={{ left: x * scale }} />
                  ))}
                  {guides.h.map((y) => (
                    <div key={`h${y}`} className="pointer-events-none absolute right-0 left-0 h-px bg-pink-500" style={{ top: y * scale }} />
                  ))}
                </div>
              </div>
              <p className="px-3 pb-3 text-center text-xs text-slate-600">
                {cur.w}×{cur.h}px · Bấm đúp vào chữ để sửa hoặc vào ảnh để cắt
              </p>
            </div>

            {/* Properties */}
            <Card className="h-fit p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">{selected?.type === "text" ? "Sửa văn bản" : selected?.type === "image" ? "Chỉnh ảnh" : selected ? "Chỉnh hình khối" : "Thuộc tính"}</h2>
              {!selected ? (
                <p className="text-sm text-slate-500">Chọn một thành phần trên thiết kế để chỉnh sửa.</p>
              ) : (
                <div className="space-y-4">
                  {selected.type === "image" && (
                    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                      {(
                        [
                          ["edit", "Bố cục"],
                          ["adjust", "Màu sắc"],
                        ] as const
                      ).map(([id, l]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPanel(id)}
                          className={cn("flex-1 rounded-lg py-1.5 text-xs font-medium", panel === id ? "bg-white text-violet-700 shadow-sm" : "text-slate-500")}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}

                  {selected.type === "image" && panel === "adjust" ? (
                    <AdjustPanel el={selected} onChange={(f, mode) => updateEl(selected.id, { filters: f }, mode)} />
                  ) : (
                    <>
                      {selected.type === "text" && (
                        <>
                          <label ref={textEditor} className="block">
                            <Label>Nội dung trên trang</Label>
                            <Textarea rows={3} value={selected.text ?? ""} onChange={(e) => updateEl(selected.id, { text: e.target.value })} />
                          </label>
                          <Slider label="Giãn dòng" min={0.8} max={2.5} step={0.05} value={selected.lineHeight ?? 1.25} onChange={(v) => updateEl(selected.id, { lineHeight: v })} format={(v) => v.toFixed(2)} />

                        </>
                      )}
                      {(selected.type === "rect" || selected.type === "circle") && (
                        <ColorRow label="Màu khối" value={selected.fill ?? "#000000"} onChange={(c) => updateEl(selected.id, { fill: c }, "push")} />
                      )}
                      {selected.type === "image" && (
                        <div className="rounded-xl bg-violet-50/70 p-2.5 ring-1 ring-violet-100">
                          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-violet-800">
                            <Eraser className="h-3.5 w-3.5" />
                            Xóa nền ảnh
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button size="sm" icon={Sparkles} loading={bgBusy === "ai"} disabled={!!bgBusy} onClick={() => cutBackground(selected, "ai")}>
                              Tự động
                            </Button>
                            <Button size="sm" variant="outline" icon={Eraser} loading={bgBusy === "flat"} disabled={!!bgBusy} onClick={() => cutBackground(selected, "flat")}>
                              Nền trơn
                            </Button>
                          </div>
                          {bgStatus && <p className="mt-1.5 text-xs text-violet-700">{bgStatus}</p>}
                          <Slider label="Độ mạnh (nền trơn)" min={10} max={100} step={1} value={flatTol} onChange={setFlatTol} />
                          {selected.origSrc && (
                            <Button size="sm" variant="ghost" icon={ImageMinus} className="mt-1 w-full" onClick={() => restoreOriginal(selected)}>
                              Khôi phục ảnh gốc
                            </Button>
                          )}
                          <p className="mt-1 text-[11px] leading-snug text-slate-500">"Tự động" dùng AI chạy ngay trên máy, ảnh không gửi đi đâu. "Nền trơn" nhanh, hợp với ảnh nền trắng hoặc một màu.</p>
                        </div>
                      )}
                      {selected.type === "image" && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button size="sm" variant="outline" icon={RotateCw} onClick={() => updateEl(selected.id, { rot: ((selected.rot ?? 0) + 90) % 360 }, "push")}>
                            Xoay 90°
                          </Button>
                          <Button size="sm" variant={selected.flipX ? "soft" : "outline"} icon={FlipHorizontal2} onClick={() => updateEl(selected.id, { flipX: !selected.flipX }, "push")}>
                            Lật ngang
                          </Button>
                          <Button size="sm" variant={selected.flipY ? "soft" : "outline"} icon={FlipVertical2} onClick={() => updateEl(selected.id, { flipY: !selected.flipY }, "push")}>
                            Lật dọc
                          </Button>
                          <Button size="sm" variant="outline" icon={Wallpaper} onClick={() => setAsBackground(selected)}>
                            Làm nền
                          </Button>
                          <Button size="sm" variant="outline" icon={Maximize} onClick={() => fitPageToImage(selected)}>
                            Trang vừa ảnh
                          </Button>
                        </div>
                      )}
                      {(selected.type === "rect" || selected.type === "image") && (
                        <Slider label="Bo góc" min={0} max={Math.round(Math.min(selected.w, selected.h) / 2)} step={1} value={selected.radius ?? 0} onChange={(v) => updateEl(selected.id, { radius: v })} />
                      )}
                      <details className="space-y-3 rounded-xl bg-slate-50 p-2.5">
                        <summary className="cursor-pointer text-sm font-medium text-slate-700">Vị trí và hiệu ứng</summary>
                      <Slider label="Độ trong suốt" min={0.05} max={1} step={0.05} value={selected.opacity} onChange={(v) => updateEl(selected.id, { opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
                      <Slider label="Góc xoay" min={0} max={359} step={1} value={selected.rot ?? 0} onChange={(v) => updateEl(selected.id, { rot: v })} format={(v) => `${v}°`} />
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={!!selected.shadow} onChange={(e) => updateEl(selected.id, { shadow: e.target.checked }, "push")} className="accent-violet-600" />
                        Đổ bóng
                      </label>
                      <div>
                        <Label>Căn theo trang</Label>
                        <div className="grid grid-cols-6 gap-1">
                          {(
                            [
                              ["left", AlignStartVertical, "Trái"],
                              ["hcenter", AlignCenterVertical, "Giữa ngang"],
                              ["right", AlignEndVertical, "Phải"],
                              ["top", AlignStartHorizontal, "Trên"],
                              ["vcenter", AlignCenterHorizontal, "Giữa dọc"],
                              ["bottom", AlignEndHorizontal, "Dưới"],
                            ] as const
                          ).map(([k, Icon, l]) => (
                            <Button key={k} size="icon" variant="ghost" icon={Icon} aria-label={l} title={l} onClick={() => align(k)} className="h-8 w-full" />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(["x", "y", "w", "h"] as const).map((k) => (
                          <label key={k}>
                            <Label>{k.toUpperCase()}</Label>
                            <Input type="number" value={selected[k]} onChange={(e) => updateEl(selected.id, { [k]: Number(e.target.value) })} className="h-9 px-2" />
                          </label>
                        ))}
                      </div>
                      </details>
                    </>
                  )}


                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {cropping && <CropModal el={cropping} onClose={() => setCropping(null)} onApply={(c, nw, nh) => applyCrop(cropping, c, nw, nh)} />}

      {showImageGenModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4" onPointerDown={() => setShowImageGenModal(false)}>
          <Card className="w-full max-w-xl bg-white p-5 shadow-2xl" onPointerDown={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 text-violet-600">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-800">Tạo ảnh bằng AI (Google Labs Imagen)</h3>
                  <p className="text-xs text-slate-500">Tạo hình minh họa, sticker trang trí hoặc ảnh nền</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" icon={X} aria-label="Đóng" onClick={() => setShowImageGenModal(false)} />
            </div>

            {/* Server status banner */}
            <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
              <div className="flex items-center gap-2 text-xs">
                <span className={`h-2.5 w-2.5 rounded-full ${imageServerStatus?.running ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                <span className="font-medium text-slate-700">
                  {imageServerStatus?.running ? "Máy chủ tạo ảnh đã sẵn sàng" : "Máy chủ chưa khởi động (Cổng 3069)"}
                </span>
              </div>
              <Button size="sm" variant="outline" loading={imageServerChecking} onClick={refreshImageServer} className="h-7 text-xs">
                Kiểm tra lại
              </Button>
            </div>

            {!imageServerStatus?.running && (
              <div className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
                <p className="font-semibold">💡 Hướng dẫn chạy máy chủ tạo ảnh:</p>
                <p className="mt-1">
                  Mở terminal và chạy lệnh: <code className="rounded bg-white px-1.5 py-0.5 font-mono text-amber-950 ring-1 ring-amber-300">cd /home/dragonccm/Documents/api-ai-flowchart && npm start</code>
                </p>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <Label>Mô tả ảnh bạn muốn tạo (Prompt)</Label>
                <Textarea
                  rows={2}
                  value={imageGenPrompt}
                  onChange={(e) => setImageGenPrompt(e.target.value)}
                  placeholder="Ví dụ: chú mèo pastel ngồi đọc sách bên cửa sổ hoa tulip, màu nước nhẹ nhàng..."
                  className="mt-1.5 bg-white"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-500">Gợi ý phong cách nhanh:</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PROMPT_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setImageGenPrompt((prev) => (prev ? `${prev}, ${p.style}` : `${p.hint}, ${p.style}`))}
                      className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200 transition hover:bg-violet-50 hover:text-violet-700 hover:ring-violet-300"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px]">
                  <Label className="text-xs text-slate-500">Tỉ lệ khung hình:</Label>
                  <Select value={imageGenAspect} onChange={(v) => setImageGenAspect(v as AiAspectRatio)} className="mt-1 bg-white">
                    {AI_ASPECT_RATIOS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="pt-5">
                  <Button
                    icon={Sparkles}
                    loading={imageGenLoading}
                    onClick={handleGenerateAiImage}
                    className="bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-sm"
                  >
                    {imageGenLoading ? `Đang tạo (${imageGenProgress}%)...` : "Bắt đầu tạo ảnh"}
                  </Button>
                </div>
              </div>

              {imageGenLoading && (
                <div className="rounded-xl bg-violet-50/50 p-3 ring-1 ring-violet-200">
                  <div className="flex justify-between text-xs text-violet-700 mb-1.5">
                    <span>Đang render bằng Google Labs Imagen...</span>
                    <span className="font-semibold">{imageGenProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full bg-gradient-to-r from-violet-600 to-pink-500 transition-all duration-300" style={{ width: `${imageGenProgress}%` }} />
                  </div>
                </div>
              )}

              {imageGenResult && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Ảnh đã hoàn thành</h4>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <img
                      src={imageGenResultDataUrl || imageGenResult}
                      alt="AI Result"
                      className="h-44 w-44 rounded-xl object-cover shadow-md ring-1 ring-black/10"
                    />
                    <div className="flex flex-1 flex-col gap-2 w-full">
                      <Button variant="primary" onClick={() => handleInsertAiImage(false)} className="w-full">
                        Chèn vào trang thiết kế
                      </Button>
                      <Button variant="outline" onClick={() => handleInsertAiImage(true)} className="w-full border-violet-300 text-violet-700 hover:bg-violet-50">
                        ✨ Tách nền & Chèn làm Sticker
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

/* ---------- Element view ---------- */

function ElView({ el, scale }: { el: El; scale: number }) {
  const base: React.CSSProperties = { width: "100%", height: "100%", opacity: el.opacity }
  const boxShadow = el.shadow ? `0 ${10 * scale}px ${30 * scale}px rgba(0,0,0,0.35)` : undefined
  if (el.type === "rect") return <div style={{ ...base, background: el.fill, borderRadius: (el.radius ?? 0) * scale, boxShadow }} />
  if (el.type === "circle") return <div style={{ ...base, background: el.fill, borderRadius: "50%", boxShadow }} />
  if (el.type === "image") {
    const c = el.crop ?? FULL_CROP
    const f = withDefaults(el.filters)
    return (
      <div
        style={{
          ...base,
          position: "relative",
          overflow: el.cutout ? "visible" : "hidden",
          borderRadius: el.cutout ? 0 : (el.radius ?? 0) * scale,
          boxShadow: el.cutout ? undefined : boxShadow,
          filter: el.cutout && el.shadow ? `drop-shadow(0 ${10 * scale}px ${15 * scale}px rgba(0,0,0,0.35))` : undefined,
        }}
      >
        <div style={{ position: "absolute", inset: 0, transform: el.flipX || el.flipY ? `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})` : undefined }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={el.src}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              maxWidth: "none",
              width: `${100 / c.w}%`,
              height: `${100 / c.h}%`,
              left: `${(-c.x / c.w) * 100}%`,
              top: `${(-c.y / c.h) * 100}%`,
              filter: cssFilter(f, f.blur * scale),
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    )
  }
  return (
    <div
      style={{
        ...base,
        color: el.color,
        fontSize: (el.fontSize ?? 48) * scale,
        fontWeight: el.weight,
        fontStyle: el.italic ? "italic" : undefined,
        fontFamily: FONTS[el.font ?? "sans"],
        textAlign: el.align,
        lineHeight: el.lineHeight ?? 1.25,
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        textShadow: el.shadow ? `0 ${3 * scale}px ${12 * scale}px rgba(0,0,0,0.35)` : undefined,
      }}
    >
      {el.text}
    </div>
  )
}

function SlideShow({ pages, start, onClose }: { pages: Design[]; start: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(start)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    dialog.current?.showModal()
    const node = stage.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const move = (step: number) => setIndex((i) => Math.max(0, Math.min(pages.length - 1, i + step)))
  const page = pages[index]

  return (
    <dialog
      ref={dialog}
      aria-label="Trình chiếu slide"
      onCancel={onClose}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault()
          move(event.key === "ArrowLeft" ? -1 : 1)
        }
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-slate-950 p-4 text-white backdrop:bg-slate-950"
    >
      <div className="flex h-full flex-col gap-3">
        <div ref={stage} className="grid min-h-0 flex-1 place-items-center overflow-hidden">
          {page && size.w > 0 && size.h > 0 && <Mini d={page} maxW={size.w} maxH={size.h} />}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={index === 0} onClick={() => move(-1)}>Trang trước</Button>
          <span className="px-2 text-sm" aria-live="polite">{index + 1} / {pages.length}</span>
          <Button size="sm" variant="outline" disabled={index === pages.length - 1} onClick={() => move(1)}>Trang sau</Button>
          <Button size="sm" onClick={onClose}>Thoát trình chiếu</Button>
        </div>
      </div>
    </dialog>
  )
}

function Mini({ d, maxW, maxH }: { d: Omit<Design, "id" | "updatedAt">; maxW: number; maxH: number }) {
  const s = Math.min(maxW / d.w, maxH / d.h)
  return (
    <div className="relative overflow-hidden rounded-md shadow-sm" style={{ width: d.w * s, height: d.h * s, background: bgCss(d.bg) }}>
      {d.els.map((el) => (
        <div key={el.id} className="absolute" style={{ left: el.x * s, top: el.y * s, width: el.w * s, height: el.h * s, transform: el.rot ? `rotate(${el.rot}deg)` : undefined }}>
          <ElView el={el} scale={s} />
        </div>
      ))}
    </div>
  )
}

/* ---------- Colour adjustments ---------- */

function AdjustPanel({ el, onChange }: { el: El; onChange: (f: Partial<Filters>, mode: HistoryMode) => void }) {
  const f = withDefaults(el.filters)
  const set = (k: keyof Filters, v: number) => onChange({ ...f, [k]: v }, "throttle")
  const activePreset = PRESETS.find((p) => (Object.keys(NO_FILTER) as (keyof Filters)[]).every((k) => withDefaults(p.f)[k] === f[k]))?.name
  return (
    <div className="space-y-4">
      <div>
        <Label>Bộ lọc</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => onChange(withDefaults(p.f), "push")} className="group text-center">
              <span className={cn("block aspect-square overflow-hidden rounded-lg ring-1 ring-slate-200", activePreset === p.name && "ring-2 ring-violet-500")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={el.src} alt="" className="h-full w-full object-cover" style={{ filter: cssFilter(withDefaults(p.f), withDefaults(p.f).blur * 0.5) }} />
              </span>
              <span className={cn("mt-1 block truncate text-[11px]", activePreset === p.name ? "font-medium text-violet-700" : "text-slate-500")}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
      <Slider label="Độ sáng" min={40} max={160} step={1} value={f.brightness} onChange={(v) => set("brightness", v)} format={(v) => `${v - 100 > 0 ? "+" : ""}${v - 100}`} />
      <Slider label="Tương phản" min={40} max={160} step={1} value={f.contrast} onChange={(v) => set("contrast", v)} format={(v) => `${v - 100 > 0 ? "+" : ""}${v - 100}`} />
      <Slider label="Độ bão hòa" min={0} max={200} step={1} value={f.saturate} onChange={(v) => set("saturate", v)} format={(v) => `${v - 100 > 0 ? "+" : ""}${v - 100}`} />
      <Slider label="Tông ấm (sepia)" min={0} max={100} step={1} value={f.sepia} onChange={(v) => set("sepia", v)} />
      <Slider label="Đổi sắc độ" min={-180} max={180} step={1} value={f.hue} onChange={(v) => set("hue", v)} format={(v) => `${v}°`} />
      <Slider label="Đen trắng" min={0} max={100} step={1} value={f.grayscale} onChange={(v) => set("grayscale", v)} />
      <Slider label="Làm mờ" min={0} max={20} step={0.5} value={f.blur} onChange={(v) => set("blur", v)} />
      <Button size="sm" variant="ghost" icon={X} onClick={() => onChange({ ...NO_FILTER }, "push")}>
        Đặt lại màu gốc
      </Button>
    </div>
  )
}

/* ---------- Crop modal ---------- */

function CropModal({ el, onApply, onClose }: { el: El; onApply: (c: Crop, nw: number, nh: number) => void; onClose: () => void }) {
  const [nat, setNat] = useState<{ nw: number; nh: number } | null>(null)
  const [c, setC] = useState<Crop>(el.crop ?? FULL_CROP)
  const [aspect, setAspect] = useState<number | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadImg(el.src!).then((img) => setNat({ nw: img.naturalWidth, nh: img.naturalHeight }))
  }, [el.src])

  const maxW = 560
  const maxH = 380
  const s = nat ? Math.min(maxW / nat.nw, maxH / nat.nh) : 1
  const dw = nat ? nat.nw * s : 0
  const dh = nat ? nat.nh * s : 0

  // Height fraction for a width fraction under the locked aspect (pixel ratio w/h).
  const hFor = (w: number, r: number) => (nat ? (w * nat.nw) / r / nat.nh : w)

  const chooseAspect = (r: number | null | "orig") => {
    if (!nat) return
    const ratio = r === "orig" ? nat.nw / nat.nh : r
    setAspect(ratio)
    if (!ratio) return
    let w = 1
    let h = hFor(1, ratio)
    if (h > 1) {
      h = 1
      w = (ratio * nat.nh) / nat.nw
    }
    setC({ x: (1 - w) / 2, y: (1 - h) / 2, w, h })
  }

  const drag = (e: React.PointerEvent, mode: "move" | "tl" | "tr" | "bl" | "br") => {
    e.preventDefault()
    e.stopPropagation()
    const box = boxRef.current?.getBoundingClientRect()
    if (!box || !nat) return
    const start = { ...c }
    const sx = e.clientX
    const sy = e.clientY
    const anchor = { x: mode.includes("l") ? start.x + start.w : start.x, y: mode.includes("t") ? start.y + start.h : start.y }
    const onMove = (ev: PointerEvent) => {
      if (mode === "move") {
        const dx = (ev.clientX - sx) / dw
        const dy = (ev.clientY - sy) / dh
        setC({ ...start, x: Math.min(1 - start.w, Math.max(0, start.x + dx)), y: Math.min(1 - start.h, Math.max(0, start.y + dy)) })
        return
      }
      const px = Math.min(1, Math.max(0, (ev.clientX - box.left) / dw))
      const py = Math.min(1, Math.max(0, (ev.clientY - box.top) / dh))
      let w = Math.max(0.05, Math.abs(px - anchor.x))
      let h = Math.max(0.05, Math.abs(py - anchor.y))
      const left = mode.includes("l")
      const top = mode.includes("t")
      if (aspect) {
        h = hFor(w, aspect)
        const maxWFrac = left ? anchor.x : 1 - anchor.x
        const maxHFrac = top ? anchor.y : 1 - anchor.y
        if (w > maxWFrac) {
          w = maxWFrac
          h = hFor(w, aspect)
        }
        if (h > maxHFrac) {
          h = maxHFrac
          w = (h * aspect * nat.nh) / nat.nw
        }
      }
      setC({ x: left ? anchor.x - w : anchor.x, y: top ? anchor.y - h : anchor.y, w, h })
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onPointerDown={onClose}>
      <Card className="w-full max-w-2xl bg-white p-4" onPointerDown={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-medium text-slate-800">
            <CropIcon className="h-4 w-4 text-violet-600" />
            Cắt ảnh
          </h3>
          <Button size="icon" variant="ghost" icon={X} aria-label="Đóng" onClick={onClose} />
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {ASPECTS.map((a) => {
            const active = a.r === "orig" ? nat && aspect === nat.nw / nat.nh : aspect === a.r
            return (
              <button
                key={a.label}
                type="button"
                onClick={() => chooseAspect(a.r)}
                className={cn("rounded-full px-3 py-1 text-xs font-medium", active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
              >
                {a.label}
              </button>
            )
          })}
        </div>
        <div className="grid place-items-center rounded-xl bg-slate-900/90 p-3">
          {nat ? (
            <div ref={boxRef} className="relative touch-none select-none" style={{ width: dw, height: dh, maxWidth: "100%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={el.src} alt="" draggable={false} className="h-full w-full" />
              <div
                onPointerDown={(e) => drag(e, "move")}
                className="absolute cursor-move border-2 border-white"
                style={{ left: c.x * dw, top: c.y * dh, width: c.w * dw, height: c.h * dh, boxShadow: "0 0 0 9999px rgba(15,23,42,0.6)" }}
              >
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <span key={i} className="border border-white/30" />
                  ))}
                </div>
                {(["tl", "tr", "bl", "br"] as const).map((k) => (
                  <span
                    key={k}
                    onPointerDown={(e) => drag(e, k)}
                    className={cn(
                      "absolute h-4 w-4 rounded-full border-2 border-violet-600 bg-white",
                      k === "tl" && "-top-2 -left-2 cursor-nwse-resize",
                      k === "tr" && "-top-2 -right-2 cursor-nesw-resize",
                      k === "bl" && "-bottom-2 -left-2 cursor-nesw-resize",
                      k === "br" && "-right-2 -bottom-2 cursor-nwse-resize",
                    )}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="h-40" />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{nat ? `${Math.round(c.w * nat.nw)} × ${Math.round(c.h * nat.nh)} px` : ""}</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setC(FULL_CROP)}>
              Bỏ cắt
            </Button>
            <Button icon={CropIcon} onClick={() => nat && onApply(c, nat.nw, nat.nh)} disabled={!nat}>
              Áp dụng
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ---------- Small controls ---------- */

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
        {label}
        <span className="text-slate-400 tabular-nums">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-violet-600" />
    </label>
  )
}

function AddBtn({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 py-2.5 text-xs text-slate-600 transition hover:bg-pink-50 hover:text-pink-700">
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            onClick={() => onChange(c)}
            className={cn("h-6 w-6 rounded-full ring-1 ring-slate-200", value.toLowerCase() === c && "ring-2 ring-violet-500")}
            style={{ background: c }}
          />
        ))}
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-8 cursor-pointer rounded" aria-label="Chọn màu khác" />
      </div>
    </div>
  )
}
