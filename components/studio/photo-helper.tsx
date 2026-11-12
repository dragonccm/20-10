"use client"
import { useEffect, useRef, useState, type PointerEvent } from "react"
import { toast } from "sonner"
import { Button, Card, Input, Label, Select, Textarea } from "./ui"
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
  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <h2 className="font-serif text-2xl">Sửa một vùng nhỏ trong ảnh</h2>
        <p className="text-sm leading-7 text-slate-500">
          Bấm vùng màu gần nhau hoặc tô lên chỗ muốn sửa. Xem trước, hoàn tác
          rồi tải bản mới; file gốc không thay đổi. Ảnh được tối ưu cạnh dài tối
          đa 1600px cho công cụ này.
        </p>
        <input
          aria-label="Chọn ảnh để chỉnh vùng"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={!!busy}
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (!f) return
            try {
              const img = await fileToDataUrl(f, 1600, 0.96, true, true)
              setSrc(img.src)
              setPast([])
              setAdvice(null)
            } catch {
              toast.error("Chưa mở được ảnh này.")
            }
          }}
        />
        {src && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label>
                <Label>Chọn bằng</Label>
                <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="wand">Bấm vùng màu gần nhau</option>
                  <option value="brush">Tô vùng muốn sửa</option>
                  <option value="unbrush">Bớt vùng đã tô</option>
                </Select>
              </label>
              <label>
                <Label>
                  {mode === "wand" ? "Độ rộng màu được chọn" : "Cỡ nét tô"}
                </Label>
                <input
                  aria-label="Độ rộng chọn vùng"
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
              <label className="flex gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={add}
                  onChange={(e) => setAdd(e.target.checked)}
                />
                Thêm vào vùng hiện có
              </label>
              <Button variant="ghost" onClick={clear}>
                Bỏ vùng chọn
              </Button>
              <Button
                variant="outline"
                disabled={!past.length || !!busy}
                onClick={() => {
                  const prev = past.at(-1)!
                  setPast((p) => p.slice(0, -1))
                  setSrc(prev)
                  setAdvice(null)
                }}
              >
                Hoàn tác
              </Button>
            </div>
            <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl border bg-[repeating-conic-gradient(#eee_0%_25%,white_0%_50%)] bg-[length:18px_18px]">
              <canvas
                ref={base}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: 650,
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
            <p className="text-xs text-slate-500">
              {dimensions.w} × {dimensions.h}px ·{" "}
              {selected ? "Có vùng đã chọn" : "Chưa chọn vùng"} · Màu hồng là
              vùng sẽ được sửa.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!!busy || !selected}
                onClick={() => apply("clear")}
              >
                Xóa vùng thành trong suốt
              </Button>
              <input
                aria-label="Màu mới cho vùng chọn"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
              <Button
                disabled={!!busy || !selected}
                variant="outline"
                onClick={() => apply("color")}
              >
                Đổi màu vùng chọn
              </Button>
              <Button
                disabled={!!busy || !selected}
                variant="outline"
                onClick={() => apply("erase")}
              >
                Xóa vật thể bằng nền lân cận
              </Button>
            </div>
            <p className="text-xs leading-6 text-slate-500">
              Xóa vật thể ở đây là lấp vùng bằng màu nền lân cận, phù hợp vật
              thể nhỏ trên nền đơn giản. Nền nhiều chi tiết có thể để lại vệt;
              bạn xem trước và hoàn tác nếu chưa phù hợp.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!!busy}
                variant="outline"
                onClick={() => ai("select")}
              >
                Chọn chủ thể bằng mô hình trên máy
              </Button>
              <Button
                disabled={!!busy}
                variant="outline"
                onClick={() => ai("background")}
              >
                Tách nền trên máy
              </Button>
              <Button disabled={!!busy} variant="outline" onClick={toEditor}>
                Cắt ảnh / chèn chữ trong Thiết kế
              </Button>
              <Button
                disabled={!!busy}
                onClick={() =>
                  base.current?.toBlob((blob) => {
                    if (blob) downloadFile("anh-da-sua.png", blob, "image/png")
                  }, "image/png")
                }
              >
                Tải PNG đã sửa
              </Button>
            </div>
          </>
        )}
      </Card>
      {src && (
        <Card className="space-y-3 p-5">
          <h3 className="font-medium">Một gợi ý phong cách, nếu bạn muốn</h3>
          <Textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ví dụ: dịu hơn, tự nhiên, hợp với ảnh CV…"
          />
          <p className="text-xs leading-6 text-slate-500">
            Khi chọn nút này, bản xem trước cạnh tối đa 640px được gửi tới dịch
            vụ AI. Gợi ý chưa tự thay ảnh của bạn.
          </p>
          <Button disabled={!!busy} onClick={() => ai("style")}>
            Nhờ AI gợi ý phong cách
          </Button>
          {advice && (
            <div className="rounded-xl bg-violet-50 p-4">
              <p className="text-sm leading-7">{advice.style}</p>
              <p className="mt-2 text-xs">
                Sáng {advice.brightness}% · Tương phản {advice.contrast}% · Màu{" "}
                {advice.saturate}%
              </p>
              {advice.captions.map((c, i) => (
                <p key={i} className="mt-2 text-xs">
                  Gợi ý chữ: {c}
                </p>
              ))}
              <Button className="mt-3" variant="outline" onClick={applyStyle}>
                Thử bộ màu này
              </Button>
            </div>
          )}
        </Card>
      )}
      {busy && (
        <Card className="p-4">
          <p role="status" className="text-sm leading-7">
            {status || "Đang xem ảnh để gợi ý phong cách…"}
          </p>
          {busy === "style" && (
            <Button variant="outline" onClick={() => abort.current?.abort()}>
              Dừng
            </Button>
          )}
        </Card>
      )}
    </div>
  )
}
