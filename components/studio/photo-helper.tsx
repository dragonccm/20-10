"use client"
import { useEffect, useRef, useState, type PointerEvent } from "react"
import {
  ImagePlus,
  Upload,
  Download,
  Undo2,
  MousePointer2,
  Paintbrush,
  Eraser,
  Crop,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { HelpDetails, Button, Card, Textarea } from "./ui"
import { fileToDataUrl, loadImg } from "@/lib/studio/image"
import {
  colorRegion,
  changeRegion,
  inpaintRegion,
  photoAdviceSchema,
} from "@/lib/studio/image-regions"
import { callAi } from "@/lib/studio/ai"
import { downloadFile } from "@/lib/studio/storage"
import { addDesigns } from "@/lib/studio/handoff"
import { blank } from "@/lib/studio/design"
import { uid } from "@/lib/studio/storage"

export function PhotoHelper() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState("")
  const [src, setSrc] = useState(""),
    [mode, setMode] = useState("wand"),
    [tolerance, setTolerance] = useState(25),
    [radius, setRadius] = useState(25),
    [color, setColor] = useState("#ad7b9e"),
    [add, setAdd] = useState(false),
    [busy, setBusy] = useState(""),
    [status, setStatus] = useState(""),
    [past, setPast] = useState<string[]>([]),
    [prompt, setPrompt] = useState(""),
    [advice, setAdvice] = useState<ReturnType<
      typeof photoAdviceSchema.parse
    > | null>(null),
    [dimensions, setDimensions] = useState({ w: 0, h: 0 }),
    [selected, setSelected] = useState(0)
  const base = useRef<HTMLCanvasElement>(null),
    overlay = useRef<HTMLCanvasElement>(null),
    drawing = useRef(false),
    last = useRef<{ x: number; y: number } | null>(null),
    abort = useRef<AbortController | null>(null),
    maskVersion = useRef(0)
  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => {
    if (!src) return
    let active = true
    loadImg(src).then((img) => {
      if (!active || !base.current || !overlay.current) return
      const w = img.naturalWidth,
        h = img.naturalHeight
      base.current.width = overlay.current.width = w
      base.current.height = overlay.current.height = h
      base.current
        .getContext("2d", { willReadFrequently: true })!
        .drawImage(img, 0, 0)
      setDimensions({ w, h })
      setSelected(0)
      maskVersion.current++
    })
    return () => {
      active = false
    }
  }, [src])
  const mask = () => {
    const c = overlay.current!
    const data = c
      .getContext("2d", { willReadFrequently: true })!
      .getImageData(0, 0, c.width, c.height).data
    return Uint8Array.from(
      { length: c.width * c.height },
      (_, i) => data[i * 4 + 3],
    )
  }
  const count = () => {
    setSelected(mask().filter((v) => v > 0).length)
    maskVersion.current++
  }
  const clear = () => {
    overlay.current
      ?.getContext("2d")!
      .clearRect(0, 0, dimensions.w, dimensions.h)
    setSelected(0)
    maskVersion.current++
  }
  const showMask = (m: Uint8Array) => {
    const c = overlay.current!,
      ctx = c.getContext("2d")!,
      image = ctx.createImageData(c.width, c.height)
    for (let i = 0; i < m.length; i++) {
      image.data[i * 4] = 191
      image.data[i * 4 + 1] = 87
      image.data[i * 4 + 2] = 150
      image.data[i * 4 + 3] = m[i] ? Math.round(m[i] * 0.55) : 0
    }
    ctx.putImageData(image, 0, 0)
    count()
  }
  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(
        0,
        Math.min(
          dimensions.w - 1,
          ((e.clientX - rect.left) / rect.width) * dimensions.w,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          dimensions.h - 1,
          ((e.clientY - rect.top) / rect.height) * dimensions.h,
        ),
      ),
    }
  }
  const paint = (p: { x: number; y: number }) => {
    const ctx = overlay.current!.getContext("2d")!
    ctx.globalCompositeOperation =
      mode === "unbrush" ? "destination-out" : "source-over"
    ctx.strokeStyle = "rgba(191,87,150,.65)"
    ctx.fillStyle = "rgba(191,87,150,.65)"
    ctx.lineWidth = radius * 2
    ctx.lineCap = "round"
    if (last.current) {
      ctx.beginPath()
      ctx.moveTo(last.current.x, last.current.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = "source-over"
    last.current = p
  }
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!src || busy) return
    const p = point(e),
      c = base.current!
    if (mode === "wand") {
      const selected = colorRegion(
        c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data,
        c.width,
        c.height,
        p.x,
        p.y,
        tolerance,
      )
      if (add) {
        const old = mask()
        for (let i = 0; i < old.length; i++)
          selected[i] = Math.max(selected[i], old[i])
      }
      showMask(selected)
      return
    }
    if (!add && mode !== "unbrush") clear()
    drawing.current = true
    last.current = null
    e.currentTarget.setPointerCapture(e.pointerId)
    paint(p)
  }
  const commit = (value: string) => {
    setPast((prev) => [...prev, src].slice(-8))
    setSrc(value)
    setAdvice(null)
  }
  const apply = (kind: "clear" | "color" | "erase") => {
    if (!selected)
      return toast.info(
        "Bạn bấm chọn vùng hoặc tô lên vùng muốn sửa trước nhé.",
      )
    const c = base.current!,
      ctx = c.getContext("2d")!,
      image = ctx.getImageData(0, 0, c.width, c.height),
      selection = mask().map((v) => (v ? 255 : 0))
    try {
      const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) as [
        number,
        number,
        number,
      ]
      const pixels =
        kind === "erase"
          ? inpaintRegion(image.data, c.width, c.height, selection)
          : changeRegion(image.data, selection, kind, rgb)
      const output = document.createElement("canvas")
      output.width = c.width
      output.height = c.height
      output
        .getContext("2d")!
        .putImageData(new ImageData(pixels, c.width, c.height), 0, 0)
      commit(output.toDataURL("image/png"))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const ai = async (kind: "background" | "select" | "style") => {
    if (busy || !src) return
    setBusy(kind)
    try {
      if (kind === "style") {
        abort.current = new AbortController()
        const preview = document.createElement("canvas"),
          img = await loadImg(src),
          scale = Math.min(1, 640 / img.naturalWidth, 640 / img.naturalHeight)
        preview.width = Math.round(img.naturalWidth * scale)
        preview.height = Math.round(img.naturalHeight * scale)
        preview
          .getContext("2d")!
          .drawImage(img, 0, 0, preview.width, preview.height)
        const value = photoAdviceSchema.parse(
          await callAi(
            "photo-advice",
            {
              text: prompt || "Gợi ý phong cách tự nhiên, dễ dùng cho ảnh này.",
              image: preview.toDataURL("image/jpeg", 0.8),
            },
            abort.current.signal,
          ),
        )
        setAdvice(value)
      } else {
        setStatus("Lần đầu tải mô hình khoảng 45 MB; ảnh xử lý trên thiết bị.")
        const { removeBackgroundAI } = await import("@/lib/studio/bgremove")
        const result = await removeBackgroundAI(src, setStatus, false)
        if (kind === "background") commit(result.src)
        else {
          const img = await loadImg(result.src),
            canvas = document.createElement("canvas")
          canvas.width = dimensions.w
          canvas.height = dimensions.h
          canvas.getContext("2d")!.drawImage(img, 0, 0)
          const data = canvas
            .getContext("2d")!
            .getImageData(0, 0, canvas.width, canvas.height).data
          showMask(
            Uint8Array.from({ length: canvas.width * canvas.height }, (_, i) =>
              data[i * 4 + 3] > 128 ? 255 : 0,
            ),
          )
        }
      }
    } catch (e) {
      if (!abort.current?.signal.aborted) toast.error((e as Error).message)
    } finally {
      setBusy("")
      setStatus("")
    }
  }
  const applyStyle = () => {
    if (!advice) return
    const c = document.createElement("canvas")
    c.width = dimensions.w
    c.height = dimensions.h
    const ctx = c.getContext("2d")!
    ctx.filter = `brightness(${advice.brightness}%) contrast(${advice.contrast}%) saturate(${advice.saturate}%)`
    ctx.drawImage(base.current!, 0, 0)
    commit(c.toDataURL("image/png"))
  }
  const toEditor = async () => {
    const d = blank(dimensions.w, dimensions.h, "Ảnh của mình")
    d.bg = { from: "#ffffff", to: "#ffffff", angle: 0 }
    d.els = [
      {
        id: uid(),
        type: "image",
        src,
        x: 0,
        y: 0,
        w: dimensions.w,
        h: dimensions.h,
        nw: dimensions.w,
        nh: dimensions.h,
        opacity: 1,
      },
    ]
    if (!(await addDesigns([d]))) {
      toast.error("Chưa lưu được ảnh trên thiết bị.")
      return
    }
    window.location.assign("/studio/creative")
  }
  const pickFile = async (file: File) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type))
      return toast.info("Chọn ảnh PNG, JPG hoặc WebP nhé.")
    if (file.size > 40 * 1024 * 1024)
      return toast.info("Chọn ảnh dưới 40 MB để xử lý mượt hơn.")
    try {
      const img = await fileToDataUrl(file, 1600, 0.96, true, true)
      setSrc(img.src)
      setFileName(file.name)
      setPast([])
      setAdvice(null)
    } catch {
      toast.error("Chưa mở được ảnh này.")
    }
  }
  const undo = () => {
    const prev = past.at(-1)
    if (prev) {
      setPast((p) => p.slice(0, -1))
      setSrc(prev)
      setAdvice(null)
    }
  }
  const download = () =>
    base.current?.toBlob((blob) => {
      if (blob) downloadFile("anh-da-sua.png", blob, "image/png")
    }, "image/png")
  return (
    <section className="photo-workspace" aria-label="Chỉnh ảnh">
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Chọn ảnh để chỉnh vùng"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file) pickFile(file)
        }}
      />
      {!src ? (
        <Card
          className="photo-upload"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) pickFile(file)
          }}
        >
          <span className="photo-upload-icon">
            <ImagePlus size={29} />
          </span>
          <h2>Bắt đầu với một tấm ảnh</h2>
          <p>Kéo ảnh vào đây hoặc chọn từ thiết bị.</p>
          <Button icon={Upload} onClick={() => fileInput.current?.click()}>
            Chọn ảnh
          </Button>
          <small>PNG, JPG, WebP · tối đa 40 MB</small>
        </Card>
      ) : (
        <>
          <div className="photo-document-bar">
            <div>
              <span className="studio-eyebrow">CHỈNH ẢNH</span>
              <h2 title={fileName}>{fileName || "Ảnh của bạn"}</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!!busy}
                onClick={() => fileInput.current?.click()}
              >
                Đổi ảnh
              </Button>
              <Button
                size="sm"
                icon={Download}
                disabled={!!busy || !dimensions.w}
                onClick={download}
              >
                Tải PNG
              </Button>
            </div>
          </div>
          <div className="photo-editor-layout">
            <div className="photo-stage-card">
              <div className="photo-stage-toolbar">
                <span>
                  {dimensions.w} × {dimensions.h}px
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Undo2}
                    disabled={!past.length || !!busy}
                    onClick={undo}
                  >
                    Hoàn tác
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!selected || !!busy}
                    onClick={clear}
                  >
                    Bỏ chọn
                  </Button>
                </div>
              </div>
              <div className="photo-stage">
                <div className="photo-canvas-wrap">
                  <canvas
                    ref={base}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      maxHeight: "min(62dvh,640px)",
                      width: "auto",
                      height: "auto",
                    }}
                  />
                  <canvas
                    ref={overlay}
                    aria-label="Vùng chọn trên ảnh"
                    className="absolute inset-0 h-full w-full touch-none"
                    onPointerDown={down}
                    onPointerMove={(e) => {
                      if (drawing.current) paint(point(e))
                    }}
                    onPointerUp={() => {
                      drawing.current = false
                      last.current = null
                      count()
                    }}
                    onPointerCancel={() => {
                      drawing.current = false
                      last.current = null
                      count()
                    }}
                  />
                </div>
              </div>
              <div className="photo-stage-footer">
                <span
                  className={
                    selected
                      ? "photo-selection-status selected"
                      : "photo-selection-status"
                  }
                >
                  <i />
                  {selected
                    ? "Đã chọn một vùng"
                    : "Bấm hoặc tô lên vùng muốn sửa"}
                </span>
                <span>Màu hồng là vùng chọn</span>
              </div>
            </div>
            <aside className="photo-inspector" aria-label="Công cụ sửa ảnh">
              <fieldset disabled={!!busy} className="min-w-0 space-y-5">
                <section>
                  <h3>Chọn vùng</h3>
                  <div className="photo-mode-picker">
                    {[
                      ["wand", "Theo màu", MousePointer2],
                      ["brush", "Tô vùng", Paintbrush],
                      ["unbrush", "Bớt vùng", Eraser],
                    ].map(([id, label, Icon]) => {
                      const ToolIcon = Icon as typeof MousePointer2
                      return (
                        <button
                          type="button"
                          key={String(id)}
                          aria-pressed={mode === id}
                          onClick={() => setMode(String(id))}
                        >
                          <ToolIcon size={17} />
                          <span>{String(label)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <label className="photo-slider-label">
                    <span>{mode === "wand" ? "Độ nhạy màu" : "Cỡ cọ"}</span>
                    <output>
                      {mode === "wand" ? tolerance : radius}
                      {mode === "wand" ? "" : " px"}
                    </output>
                    <input
                      aria-label={mode === "wand" ? "Độ nhạy màu" : "Cỡ cọ"}
                      type="range"
                      min={mode === "wand" ? 0 : 3}
                      max={mode === "wand" ? 120 : 100}
                      value={mode === "wand" ? tolerance : radius}
                      onChange={(e) =>
                        mode === "wand"
                          ? setTolerance(Number(e.target.value))
                          : setRadius(Number(e.target.value))
                      }
                    />
                  </label>
                  <label className="photo-check">
                    <input
                      type="checkbox"
                      checked={add}
                      onChange={(e) => setAdd(e.target.checked)}
                    />
                    Thêm vào vùng hiện có
                  </label>
                </section>
                <section>
                  <h3>Sửa vùng đã chọn</h3>
                  {!selected && (
                    <p className="studio-caption mb-3">
                      Chọn một vùng trên ảnh để dùng các công cụ này.
                    </p>
                  )}
                  <div className="photo-recolor">
                    <input
                      aria-label="Màu mới cho vùng chọn"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                    <span>{color.toUpperCase()}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!selected}
                      onClick={() => apply("color")}
                    >
                      Đổi màu
                    </Button>
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Button
                      variant="outline"
                      disabled={!selected}
                      onClick={() => apply("clear")}
                    >
                      Xóa thành trong suốt
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!selected}
                      onClick={() => apply("erase")}
                    >
                      Xóa vật thể nhỏ
                    </Button>
                  </div>
                  <p className="studio-caption mt-2">
                    Xóa vật thể hợp với nền đơn giản; có thể để lại vệt.
                  </p>
                </section>
                <section>
                  <h3>Toàn ảnh</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => ai("select")}
                    >
                      Chọn chủ thể
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => ai("background")}
                    >
                      Tách nền
                    </Button>
                  </div>
                  <Button
                    className="w-full mt-2"
                    variant="ghost"
                    icon={Crop}
                    onClick={toEditor}
                  >
                    Cắt ảnh / thêm chữ
                  </Button>
                  <p className="studio-caption mt-2">
                    Chọn chủ thể và tách nền chạy trên thiết bị.
                  </p>
                </section>
              </fieldset>
              <details className="photo-style-panel">
                <summary>
                  <Sparkles size={16} />
                  Gợi ý phong cách
                </summary>
                <div className="space-y-3 pt-3">
                  <Textarea
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ví dụ: màu dịu, tự nhiên…"
                  />
                  <p className="studio-caption">
                    Gửi bản xem trước 640px cho AI khi bạn chọn nút dưới.
                  </p>
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => ai("style")}
                  >
                    Nhờ AI gợi ý
                  </Button>
                  {advice && (
                    <div className="photo-style-result">
                      <p>{advice.style}</p>
                      <small>
                        Sáng {advice.brightness}% · Tương phản {advice.contrast}
                        % · Màu {advice.saturate}%
                      </small>
                      {advice.captions.map((c, i) => (
                        <p key={i}>{c}</p>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={applyStyle}
                      >
                        Thử bộ màu này
                      </Button>
                    </div>
                  )}
                </div>
              </details>
              <HelpDetails summary="Cách chọn vùng & lưu ảnh">
                <p>
                  Chọn theo màu hoặc tô lên ảnh. Dùng Bớt vùng để sửa vùng chọn.
                  Ảnh được tối ưu cạnh dài tối đa 1600px; file gốc không thay
                  đổi.
                </p>
              </HelpDetails>
              {busy && (
                <div className="photo-working" role="status">
                  <p>{status || "Đang xem ảnh để gợi ý…"}</p>
                  {busy === "style" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abort.current?.abort()}
                    >
                      Dừng
                    </Button>
                  )}
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  )
}
