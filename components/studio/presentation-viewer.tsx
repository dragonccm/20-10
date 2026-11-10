"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  Maximize,
  Minimize,
  Volume2,
  Sparkles,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/studio/ui"
import { bgCss, FONTS, type Design, type El } from "@/lib/studio/design"
import { FULL_CROP, cssFilter, withDefaults } from "@/lib/studio/imagefx"
import { fireCanvasConfetti, playDrumroll, playCheer } from "@/lib/studio/presentation-effects"

type TransitionMode = "fade" | "slide" | "zoom"

export function EnhancedSlideShow({
  pages,
  start,
  onClose,
}: {
  pages: Design[]
  start: number
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const confettiCanvas = useRef<HTMLCanvasElement>(null)

  const [index, setIndex] = useState(start)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [transition, setTransition] = useState<TransitionMode>("slide")
  const [blackout, setBlackout] = useState(false)
  const [laser, setLaser] = useState(false)
  const [laserPos, setLaserPos] = useState({ x: -100, y: -100 })
  const [showShortcuts, setShowShortcuts] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Timer
  const [timerSec, setTimerSec] = useState(0)
  const [timerActive, setTimerActive] = useState(true)

  useEffect(() => {
    dialog.current?.showModal()
    const node = stage.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!timerActive) return
    const id = setInterval(() => setTimerSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [timerActive])

  // Confetti trigger
  const triggerConfetti = useCallback(() => {
    if (confettiCanvas.current) {
      fireCanvasConfetti(confettiCanvas.current)
      playCheer()
    }
  }, [])

  // Drumroll trigger
  const triggerDrumroll = useCallback(() => {
    playDrumroll()
  }, [])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }, [])

  const move = useCallback(
    (step: number) => {
      setIndex((i) => Math.max(0, Math.min(pages.length - 1, i + step)))
    },
    [pages.length]
  )

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const key = e.key.toLowerCase()

      if (key === "arrowleft" || key === "arrowup" || key === "pageup") {
        e.preventDefault()
        move(-1)
      } else if (key === "arrowright" || key === "arrowdown" || key === "pagedown" || key === " ") {
        e.preventDefault()
        move(1)
      } else if (key === "c") {
        e.preventDefault()
        triggerConfetti()
      } else if (key === "d") {
        e.preventDefault()
        triggerDrumroll()
      } else if (key === "b") {
        e.preventDefault()
        setBlackout((b) => !b)
      } else if (key === "l") {
        e.preventDefault()
        setLaser((l) => !l)
      } else if (key === "f") {
        e.preventDefault()
        toggleFullscreen()
      } else if (key === "h" || key === "?") {
        e.preventDefault()
        setShowShortcuts((s) => !s)
      } else if (key === "escape") {
        if (blackout) {
          e.preventDefault()
          setBlackout(false)
        } else if (laser) {
          e.preventDefault()
          setLaser(false)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [move, triggerConfetti, triggerDrumroll, toggleFullscreen, blackout, laser])

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const page = pages[index]

  return (
    <dialog
      ref={dialog}
      aria-label="Trình chiếu slide tương tác"
      onCancel={onClose}
      onPointerMove={(e) => {
        if (laser) setLaserPos({ x: e.clientX, y: e.clientY })
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-slate-950 p-0 text-white backdrop:bg-slate-950 select-none overflow-hidden"
    >
      {/* Laser Pointer Dot */}
      {laser && (
        <div
          className="pointer-events-none fixed z-50 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_16px_6px_rgba(239,68,68,0.9)] animate-pulse"
          style={{ left: laserPos.x, top: laserPos.y }}
        />
      )}

      {/* Confetti Overlay Canvas */}
      <canvas ref={confettiCanvas} className="pointer-events-none fixed inset-0 z-40" />

      {/* Blackout Curtain (Key B) */}
      {blackout && (
        <div
          onClick={() => setBlackout(false)}
          className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black text-slate-400 cursor-pointer"
        >
          <span className="text-sm font-medium">Màn hình đang tắt (Phím B)</span>
          <span className="mt-1 text-xs text-slate-600">Nhấp chuột hoặc bấm phím B để tiếp tục</span>
        </div>
      )}

      {/* Top Banner: Canva Shortcuts Hint */}
      {showShortcuts && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-full bg-slate-900/80 px-4 py-1.5 text-xs text-slate-300 ring-1 ring-white/10 backdrop-blur-md shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="flex items-center gap-1 font-semibold text-amber-400">
            <Sparkles className="h-3.5 w-3.5" /> Phím Canva:
          </span>
          <span><kbd className="rounded bg-slate-800 px-1 py-0.5 text-white font-mono">C</kbd> Pháo giấy</span>
          <span><kbd className="rounded bg-slate-800 px-1 py-0.5 text-white font-mono">D</kbd> Nổi trống</span>
          <span><kbd className="rounded bg-slate-800 px-1 py-0.5 text-white font-mono">L</kbd> Laser</span>
          <span><kbd className="rounded bg-slate-800 px-1 py-0.5 text-white font-mono">B</kbd> Tắt màn hình</span>
          <span><kbd className="rounded bg-slate-800 px-1 py-0.5 text-white font-mono">F</kbd> Toàn màn hình</span>
          <button
            type="button"
            onClick={() => setShowShortcuts(false)}
            className="ml-1 text-slate-400 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex h-full flex-col">
        {/* Stage Container */}
        <div ref={stage} className="relative grid min-h-0 flex-1 place-items-center overflow-hidden p-4">
          {page && size.w > 0 && size.h > 0 && (
            <AnimatedSlideView
              key={page.id}
              d={page}
              maxW={size.w}
              maxH={size.h}
              transition={transition}
            />
          )}
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="relative z-20 pb-4 flex justify-center">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900/90 px-4 py-2 ring-1 ring-white/15 backdrop-blur-lg shadow-2xl">
            {/* Prev/Next buttons */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={index === 0}
                onClick={() => move(-1)}
                className="h-8 w-8 p-0 text-white hover:bg-slate-800 border-slate-700"
                title="Trang trước (Phím Mũi tên Trái)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="px-2 text-xs font-semibold text-slate-200" aria-live="polite">
                {index + 1} / {pages.length}
              </span>

              <Button
                size="sm"
                variant="outline"
                disabled={index === pages.length - 1}
                onClick={() => move(1)}
                className="h-8 w-8 p-0 text-white hover:bg-slate-800 border-slate-700"
                title="Trang sau (Phím Mũi tên Phải / Space)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            {/* Timer */}
            <div className="flex items-center gap-1.5 px-1.5 text-xs text-slate-300 font-mono">
              <span>{formatTimer(timerSec)}</span>
              <button
                type="button"
                onClick={() => setTimerActive((a) => !a)}
                className="text-slate-400 hover:text-white"
                title={timerActive ? "Tạm dừng đếm giờ" : "Tiếp tục đếm giờ"}
              >
                {timerActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => setTimerSec(0)}
                className="text-slate-400 hover:text-white"
                title="Đặt lại giờ"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            {/* Transition mode picker */}
            <div className="flex items-center gap-1 text-xs">
              {(["fade", "slide", "zoom"] as TransitionMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTransition(m)}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                    transition === m ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m === "fade" ? "Mờ dần" : m === "slide" ? "Trượt" : "Phóng to"}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            {/* Interactive effect buttons */}
            <Button
              size="sm"
              variant="outline"
              onClick={triggerConfetti}
              className="h-8 px-2.5 text-xs text-amber-300 hover:bg-amber-950/40 border-amber-500/30 gap-1.5"
              title="Tung pháo giấy chúc mừng (Phím C)"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Pháo giấy (C)</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={triggerDrumroll}
              className="h-8 px-2.5 text-xs text-rose-300 hover:bg-rose-950/40 border-rose-500/30 gap-1.5"
              title="Nổi trống hồi hộp (Phím D)"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Nổi trống (D)</span>
            </Button>

            <Button
              size="sm"
              variant={laser ? "primary" : "outline"}
              onClick={() => setLaser((l) => !l)}
              className={`h-8 px-2.5 text-xs gap-1.5 ${
                laser ? "bg-red-600 text-white hover:bg-red-700" : "text-red-300 hover:bg-red-950/40 border-red-500/30"
              }`}
              title="Bật/Tắt con trỏ laser đỏ (Phím L)"
            >
              <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
              <span>Laser (L)</span>
            </Button>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <Button
              size="sm"
              variant="outline"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0 text-white hover:bg-slate-800 border-slate-700"
              title="Toàn màn hình (Phím F)"
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowShortcuts((s) => !s)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white border-slate-700"
              title="Trợ giúp phím tắt"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>

            <Button
              size="sm"
              variant="soft"
              onClick={onClose}
              className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              Thoát (Esc)
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

function AnimatedSlideView({
  d,
  maxW,
  maxH,
  transition,
}: {
  d: Omit<Design, "id" | "updatedAt">
  maxW: number
  maxH: number
  transition: TransitionMode
}) {
  const s = Math.min(maxW / d.w, maxH / d.h)

  const transitionClass =
    transition === "fade"
      ? "animate-in fade-in duration-500"
      : transition === "zoom"
      ? "animate-in zoom-in-95 fade-in duration-500"
      : "animate-in slide-in-from-right-8 fade-in duration-500"

  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-2xl ${transitionClass}`}
      style={{
        width: d.w * s,
        height: d.h * s,
        background: bgCss(d.bg),
      }}
    >
      {d.els.map((el, elIdx) => (
        <div
          key={el.id}
          className="absolute"
          style={{
            left: el.x * s,
            top: el.y * s,
            width: el.w * s,
            height: el.h * s,
            transform: el.rot ? `rotate(${el.rot}deg)` : undefined,
            // Staggered entrance animation for elements
            animation: "slideElIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards",
            animationDelay: `${Math.min(elIdx * 45, 600)}ms`,
          }}
        >
          <PresentationElView el={el} scale={s} />
        </div>
      ))}

      {/* Global CSS for staggered element animation */}
      <style jsx global>{`
        @keyframes slideElIn {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

function PresentationElView({ el, scale }: { el: El; scale: number }) {
  const base = { width: "100%", height: "100%", opacity: el.opacity }
  const boxShadow = el.shadow ? `0 ${10 * scale}px ${30 * scale}px rgba(0,0,0,0.35)` : undefined

  if (el.type === "rect") {
    return (
      <div
        style={{
          ...base,
          background: el.fill,
          borderRadius: (el.radius ?? 0) * scale,
          boxShadow,
        }}
      />
    )
  }

  if (el.type === "circle") {
    return (
      <div
        style={{
          ...base,
          background: el.fill,
          borderRadius: "50%",
          boxShadow,
        }}
      />
    )
  }

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
          filter:
            el.cutout && el.shadow
              ? `drop-shadow(0 ${10 * scale}px ${15 * scale}px rgba(0,0,0,0.35))`
              : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: el.flipX || el.flipY ? `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})` : undefined,
          }}
        >
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
