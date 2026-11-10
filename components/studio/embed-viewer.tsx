"use client"

import { useState } from "react"
import { ExternalLink, Maximize2, Sparkles, X, Play } from "lucide-react"
import { Button, Input } from "@/components/studio/ui"
import { resolvePresentationEmbed } from "@/lib/studio/embed"

export function LiveEmbedModal({
  isOpen,
  onClose,
  initialUrl,
}: {
  isOpen: boolean
  onClose: () => void
  initialUrl?: string
}) {
  const [urlInput, setUrlInput] = useState(initialUrl || "")
  const [activeEmbed, setActiveEmbed] = useState(initialUrl ? resolvePresentationEmbed(initialUrl) : null)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleLoad = () => {
    setError("")
    const resolved = resolvePresentationEmbed(urlInput)
    if (!resolved) {
      setError("Đường dẫn không hợp lệ. Vui lòng dán link Google Slides hoặc Canva.")
      return
    }
    setActiveEmbed(resolved)
  }

  const SAMPLES = [
    {
      name: "Google Slides Mẫu Giáo dục",
      url: "https://docs.google.com/presentation/d/1X3Wd-C6T6y60q1J9R9v_j7N2f3E6g7h8/preview",
      sampleEmbed: "https://docs.google.com/presentation/d/e/2PACX-1vT17dE0m3K6O8_7e5l_vG2n1v/embed?start=false&loop=false&delayms=3000",
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-900/90 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-sm">
              <Play className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Trình chiếu Trực tiếp Nguyên bản
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                  Giữ 100% Hoạt họa & Hiệu ứng gốc
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Nhúng trực tiếp từ Google Slides hoặc Canva để trình chiếu mượt mà, đầy đủ chuyển động 3D, video và âm thanh.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="border-b border-slate-800 bg-slate-950/70 p-3.5 flex flex-col sm:flex-row gap-2 items-center">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Dán link Google Slides (docs.google.com/presentation/...) hoặc Canva (canva.com/design/...)"
            className="flex-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 text-xs h-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLoad()
            }}
          />
          <Button
            size="sm"
            variant="primary"
            onClick={handleLoad}
            className="bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white shrink-0 text-xs h-9"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Nạp bài trình chiếu
          </Button>
        </div>

        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Presentation Iframe Stage */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
          {activeEmbed ? (
            <iframe
              src={activeEmbed.embedUrl}
              allowFullScreen
              allow="autoplay; fullscreen"
              className="h-full w-full border-0"
              title={activeEmbed.label}
            />
          ) : (
            <div className="max-w-md text-center p-6 space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 text-amber-400 ring-1 ring-white/10">
                <Maximize2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold text-white">Chưa chọn bài trình chiếu nhúng</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Để giữ trọn vẹn 100% hiệu ứng chuyển cảnh (Fade, Push, Morph), âm thanh, video và hoạt họa từng đối tượng, bạn hãy dán liên kết Google Slides hoặc Canva vào ô phía trên.
              </p>
              <div className="pt-2 text-xs text-slate-500">
                <span>Mẹo: Với Google Slides, vào <b>Tệp ➔ Chia sẻ ➔ Xuất bản lên web ➔ Nhúng</b> hoặc lấy link chia sẻ công khai.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
