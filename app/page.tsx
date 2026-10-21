"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
  Heart, 
  Sparkles, 
  Flower2, 
  Music, 
  Volume2, 
  VolumeX, 
  MessageCircle, 
  X, 
  Gift, 
  Send,
  Eye,
  Camera,
  Star,
  PartyPopper
} from "lucide-react"

interface PhotoMemory {
  id: number
  src: string
  title: string
  flower: string
  message: string
  color: string
}

const photoMemories: PhotoMemory[] = [
  {
    id: 1,
    src: "/photos/photo_1.jpg",
    title: "Nụ Cười Tỏa Nắng",
    flower: "🌸 Hoa Anh Đào",
    message: "Nụ cười của Thúy Ngân luôn mang lại ánh nắng ấm áp và năng lượng diệu kỳ cho một ngày của anh.",
    color: "from-pink-500/20 to-rose-500/20"
  },
  {
    id: 2,
    src: "/photos/photo_2.jpg",
    title: "Dịu Dàng & Trong Trẻo",
    flower: "🌷 Hoa Tulip",
    message: "Dù trong bất kỳ khoảnh khắc nào, nét dịu dàng của em vẫn luôn khiến tim anh xao xuyến.",
    color: "from-purple-500/20 to-pink-500/20"
  },
  {
    id: 3,
    src: "/photos/photo_3.jpg",
    title: "Rạng Rỡ & Xinh Đẹp",
    flower: "🌹 Hoa Hồng",
    message: "Bông hoa hồng rực rỡ nhất trong lòng anh, hãy luôn tự tin và tỏa sáng như chính con người em nhé!",
    color: "from-rose-500/20 to-red-500/20"
  },
  {
    id: 4,
    src: "/photos/photo_4.jpg",
    title: "Khoảnh Khắc Đáng Yêu",
    flower: "🌻 Hoa Hướng Dương",
    message: "Cảm ơn em vì đã luôn là mặt trời bé con ấm áp, đem đến những niềm vui bất tận.",
    color: "from-amber-500/20 to-rose-500/20"
  },
  {
    id: 5,
    src: "/photos/photo_5.jpg",
    title: "Đóa Hoa Duy Nhất",
    flower: "💐 Bó Hoa Hạnh Phúc",
    message: "Cùng anh đón chờ thật nhiều điều mới mẻ và những hành trình tuyệt vời hơn nữa ở phía trước nha!",
    color: "from-fuchsia-500/20 to-pink-500/20"
  }
]

export default function Home() {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMemory | null>(null)
  const [showLetter, setShowLetter] = useState(false)
  const [isBlooming, setIsBlooming] = useState(false)
  const [isPlayingMusic, setIsPlayingMusic] = useState(false)
  const [heartsCount, setHeartsCount] = useState<Array<{ id: number; x: number; y: number; size: number }>>([])
  const [blossomCount, setBlossomCount] = useState(0)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Floating petals animation on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)

    // Petal class
    interface Petal {
      x: number
      y: number
      size: number
      speedY: number
      speedX: number
      rotation: number
      rotSpeed: number
      opacity: number
      color: string
    }

    const colors = [
      "rgba(255, 182, 193, ",
      "rgba(255, 192, 203, ",
      "rgba(255, 105, 180, ",
      "rgba(244, 143, 177, ",
      "rgba(255, 228, 225, "
    ]

    const petals: Petal[] = Array.from({ length: 35 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 12 + 8,
      speedY: Math.random() * 1.2 + 0.8,
      speedX: Math.sin(Math.random() * Math.PI * 2) * 0.8,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 1.5,
      opacity: Math.random() * 0.5 + 0.3,
      color: colors[Math.floor(Math.random() * colors.length)]
    }))

    const drawPetal = (p: Petal) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.beginPath()
      ctx.fillStyle = `${p.color}${p.opacity})`
      ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const loop = () => {
      ctx.clearRect(0, 0, width, height)
      for (const p of petals) {
        p.y += p.speedY
        p.x += Math.sin(p.y * 0.01) * 0.8 + p.speedX
        p.rotation += p.rotSpeed

        if (p.y > height + 20) {
          p.y = -20
          p.x = Math.random() * width
        }
        if (p.x > width + 20) p.x = -20
        if (p.x < -20) p.x = width + 20

        drawPetal(p)
      }
      animationFrameId = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Create floating hearts on screen click
  const triggerBurst = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newHearts = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 60,
      size: Math.random() * 16 + 14
    }))
    setHeartsCount((prev) => [...prev.slice(-20), ...newHearts])
    setBlossomCount((c) => c + 1)
  }

  const handleBloomBouquet = () => {
    setIsBlooming(true)
    setTimeout(() => setIsBlooming(false), 2500)
    setBlossomCount((c) => c + 10)
  }

  const handleSendMessage = () => {
    window.open("https://m.me/nguyen.ngoc.long.744894", "_blank")
  }

  const toggleMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-piano-112199.mp3")
      audioRef.current.loop = true
      audioRef.current.volume = 0.5
    }

    if (isPlayingMusic) {
      audioRef.current.pause()
      setIsPlayingMusic(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlayingMusic(true)
    }
  }

  return (
    <div 
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-x-hidden bg-gradient-to-b from-[#090514] via-[#160a29] to-[#250d35] text-rose-50 selection:bg-rose-500 selection:text-white"
      onClick={triggerBurst}
    >
      {/* Background Petals Canvas */}
      <canvas 
        ref={canvasRef} 
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      />

      {/* Floating Sparkles & Aurora Glow Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[450px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-r from-rose-500/20 via-fuchsia-600/15 to-purple-700/20 blur-[130px]" />
        <div className="absolute top-1/2 -left-48 h-[500px] w-[500px] rounded-full bg-pink-600/10 blur-[140px]" />
        <div className="absolute bottom-10 -right-40 h-[450px] w-[500px] rounded-full bg-purple-600/15 blur-[140px]" />
      </div>

      {/* Heart Particles from click */}
      {heartsCount.map((h) => (
        <div
          key={h.id}
          className="pointer-events-none fixed z-50 animate-fade-out"
          style={{
            left: `${h.x}px`,
            top: `${h.y}px`,
            animation: "floatUp 1.4s ease-out forwards"
          }}
        >
          <Heart 
            className="text-pink-400 fill-pink-500/80 drop-shadow-[0_0_10px_rgba(244,114,182,0.8)]" 
            style={{ width: h.size, height: h.size }} 
          />
        </div>
      ))}

      {/* Floating Music Button */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleMusic()
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-950/70 border border-rose-500/30 text-rose-200 hover:bg-rose-900/80 shadow-lg backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer"
          title={isPlayingMusic ? "Tắt nhạc" : "Bật nhạc lãng mạn"}
        >
          {isPlayingMusic ? (
            <Volume2 className="h-5 w-5 text-pink-400 animate-pulse" />
          ) : (
            <VolumeX className="h-5 w-5 text-rose-400/70" />
          )}
        </button>
      </div>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-24 flex flex-col items-center text-center">
        
        {/* Hero Section */}
        <div className="space-y-6 max-w-3xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-purple-500/20 border border-rose-400/30 backdrop-blur-md text-xs sm:text-sm font-medium text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.2)] animate-pulse">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            <span>Đóa hoa đẹp nhất dành tặng cô nương đặc biệt</span>
            <Sparkles className="h-4 w-4 text-yellow-300" />
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-rose-200 via-pink-300 to-rose-400 bg-clip-text text-transparent drop-shadow-[0_4px_25px_rgba(244,63,94,0.4)] font-serif">
              Thúy Ngân
            </span>
          </h1>

          <p className="text-lg sm:text-2xl font-light text-rose-200/90 leading-relaxed font-serif italic max-w-2xl mx-auto px-2">
            "20/10, chúc <span className="font-semibold text-pink-300 underline decoration-rose-400/50 underline-offset-4">Thúy Ngân dangiu</span> luôn thật hạnh phúc và nhiều năng lượng nhé, cùng anh đón chờ nhiều điều mới mẻ hơn ở phía trước nheee cô bé xinh đẹp của anh! ✨"
          </p>

          {/* Interactive Magical Flower Centerpiece */}
          <div className="pt-6 pb-4 flex flex-col items-center">
            <div 
              onClick={(e) => {
                e.stopPropagation()
                handleBloomBouquet()
              }}
              className="group relative cursor-pointer select-none transition-transform duration-500 hover:scale-105 active:scale-95"
              title="Nhấn vào bông hoa để bung tỏa sắc màu!"
            >
              {/* Outer Glowing Rings */}
              <div className={`absolute -inset-8 rounded-full bg-gradient-to-r from-rose-500/30 via-pink-500/20 to-purple-500/30 blur-2xl transition-opacity duration-700 ${isBlooming ? "opacity-100 scale-125" : "opacity-60 group-hover:opacity-90"}`} />
              
              {/* Blooming SVG Flower */}
              <div className="relative flex h-48 w-48 sm:h-56 sm:w-56 items-center justify-center rounded-full bg-gradient-to-b from-rose-950/80 to-purple-950/90 border border-rose-400/30 shadow-[0_0_35px_rgba(244,63,94,0.35)] backdrop-blur-xl">
                <svg
                  viewBox="0 0 200 200"
                  className={`h-40 w-40 sm:h-48 sm:w-48 transition-all duration-700 ${isBlooming ? "rotate-180 scale-110 drop-shadow-[0_0_30px_#f43f5e]" : "group-hover:rotate-45"}`}
                >
                  <defs>
                    <radialGradient id="petalGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fda4af" />
                      <stop offset="60%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#be123c" />
                    </radialGradient>
                    <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="80%" stopColor="#eab308" />
                      <stop offset="100%" stopColor="#ca8a04" />
                    </radialGradient>
                  </defs>

                  {/* 8 Flower Petals */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, idx) => (
                    <g key={angle} transform={`rotate(${angle} 100 100)`}>
                      <path
                        d="M100 100 C80 60, 75 25, 100 15 C125 25, 120 60, 100 100 Z"
                        fill="url(#petalGrad)"
                        opacity="0.9"
                        className="transition-transform duration-500 origin-center"
                        style={{
                          transform: isBlooming ? "scale(1.12)" : "scale(1)",
                          transitionDelay: `${idx * 40}ms`
                        }}
                      />
                    </g>
                  ))}

                  {/* Inner petals layer */}
                  {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                    <g key={angle} transform={`rotate(${angle} 100 100)`}>
                      <path
                        d="M100 100 C88 75, 85 45, 100 38 C115 45, 112 75, 100 100 Z"
                        fill="#fb7185"
                        opacity="0.8"
                      />
                    </g>
                  ))}

                  {/* Flower center */}
                  <circle cx="100" cy="100" r="22" fill="url(#centerGrad)" className="animate-pulse" />
                  <circle cx="100" cy="100" r="14" fill="#fef08a" opacity="0.9" />
                </svg>

                {/* Center text prompt */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-medium text-rose-950 font-bold bg-yellow-300/90 px-2 py-0.5 rounded-full shadow">
                    Chạm hoa ✨
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-rose-300/70 italic flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-spin" />
              Nhấp vào hoa hoặc màn hình để hoa nở & thả tim ({blossomCount} đóa đã nở)
            </p>
          </div>
        </div>

        {/* 5 Floral Memories Polaroid Gallery */}
        <div className="mt-16 space-y-8">
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-rose-100 flex items-center gap-2">
              <Camera className="h-6 w-6 text-pink-400" />
              <span>5 Đóa Hoa Kỷ Niệm Của Thúy Ngân</span>
            </h2>
            <p className="text-xs sm:text-sm text-rose-300/70 max-w-md">
              Mỗi bức ảnh đại diện cho một đóa hoa rạng rỡ và một thông điệp chân thành gửi đến em
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-4 pt-4">
            {photoMemories.map((photo, index) => {
              const rotationClasses = [
                "-rotate-2 hover:rotate-0",
                "rotate-2 hover:rotate-0",
                "-rotate-1 hover:rotate-0",
                "rotate-3 hover:rotate-0",
                "-rotate-2 hover:rotate-0"
              ]
              const rot = rotationClasses[index % rotationClasses.length]

              return (
                <div
                  key={photo.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedPhoto(photo)
                  }}
                  className={`group relative flex flex-col p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-rose-300/20 hover:border-pink-400/60 shadow-[0_8px_30px_rgb(0,0,0,0.35)] backdrop-blur-md transition-all duration-300 cursor-pointer hover:-translate-y-2 hover:shadow-[0_15px_35px_rgba(244,63,94,0.3)] ${rot}`}
                >
                  {/* Decorative flower pin on top */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center justify-center h-7 w-7 rounded-full bg-rose-500 border-2 border-white/80 shadow-md z-10 group-hover:scale-125 transition-transform">
                    <Heart className="h-3.5 w-3.5 text-white fill-white" />
                  </div>

                  {/* Photo Container */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-rose-950/40">
                    <img
                      src={photo.src}
                      alt={photo.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-rose-500/80 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        <Eye className="h-3.5 w-3.5" /> Xem ảnh
                      </span>
                    </div>
                  </div>

                  {/* Card Caption */}
                  <div className="mt-3 text-left space-y-1 px-1">
                    <span className="text-[11px] font-semibold text-rose-300 tracking-wider">
                      {photo.flower}
                    </span>
                    <h3 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors line-clamp-1">
                      {photo.title}
                    </h3>
                    <p className="text-xs text-rose-200/60 line-clamp-2 leading-relaxed">
                      {photo.message}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sweet Love Letter Banner */}
        <div className="mt-20 max-w-2xl mx-auto">
          <div 
            onClick={(e) => {
              e.stopPropagation()
              setShowLetter(true)
            }}
            className="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950/80 via-purple-950/80 to-pink-950/80 border border-rose-400/30 p-8 shadow-[0_0_40px_rgba(244,63,94,0.2)] backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-pink-400/60"
          >
            <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-rose-500/10 blur-xl group-hover:scale-150 transition-transform" />
            
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] group-hover:rotate-12 transition-transform">
                <Gift className="h-8 w-8 animate-bounce" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> Bức thư bí mật dành cho cô nương
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-white">
                  Em có một phong thư tình cảm chưa mở 💌
                </h3>
                <p className="text-xs sm:text-sm text-rose-200/70">
                  Nhấp vào đây để xem lời nhắn từ anh Ngọc Long nhé!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button: Messenger */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleSendMessage()
          }}
          className="group flex items-center gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r from-pink-600 via-rose-500 to-rose-600 text-white font-medium shadow-[0_10px_30px_rgba(244,63,94,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
        >
          <MessageCircle className="h-5 w-5 animate-pulse" />
          <span className="text-sm font-semibold tracking-wide">Nhắn tin cho anh 💌</span>
        </button>
      </div>

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className="relative max-w-md w-full rounded-3xl bg-gradient-to-b from-[#220d30] to-[#12051d] border border-rose-400/30 p-6 shadow-2xl text-center space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-rose-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black/40 border border-white/10 shadow-inner">
              <img
                src={selectedPhoto.src}
                alt={selectedPhoto.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="space-y-2 text-left pt-2">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                {selectedPhoto.flower}
              </span>
              <h3 className="text-xl font-bold font-serif text-white">
                {selectedPhoto.title}
              </h3>
              <p className="text-sm text-rose-200/80 leading-relaxed font-serif italic">
                "{selectedPhoto.message}"
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={handleSendMessage}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium text-sm shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>Nhắn cho anh ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret Love Letter Modal */}
      {showLetter && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setShowLetter(false)}
        >
          <div 
            className="relative max-w-lg w-full rounded-3xl bg-gradient-to-b from-[#2e103f] via-[#1a0826] to-[#110419] border-2 border-rose-400/40 p-6 sm:p-8 shadow-[0_0_60px_rgba(244,63,94,0.4)] text-center space-y-6 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLetter(false)}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-rose-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 border border-rose-400/40 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
              <Heart className="h-8 w-8 text-pink-400 fill-pink-500/60 animate-pulse" />
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl sm:text-3xl font-extrabold font-serif text-rose-100">
                Gửi Thúy Ngân Đáng Yêu ✨
              </h3>
              <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-rose-400 to-transparent mx-auto" />
              <p className="text-base sm:text-lg text-rose-100/90 leading-relaxed font-serif italic pt-2">
                "Toi biết em thấy sến nma toi thích làm mấy trò sến súa với cô nương đó, bấm nút để nhắn tin cho anh ngayyy, anh đang đợi đó! 🥰"
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSendMessage}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white font-semibold text-base shadow-[0_0_25px_rgba(244,63,94,0.5)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Nhắn tin cho anh ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-rose-500/10 py-6 text-center text-xs text-rose-300/40">
        <p>Made with all my heart for Thúy Ngân • 20/10/2026</p>
      </footer>
    </div>
  )
}
