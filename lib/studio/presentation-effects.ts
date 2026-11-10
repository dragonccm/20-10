"use client"

/**
 * Sound synthesizer using Web Audio API for interactive Canva-like presentations.
 * Zero external audio files, works offline and instantly!
 */
export function playDrumroll() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    // Create drumroll noise buffer
    const bufferSize = ctx.sampleRate * 2.2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    // Filter to sound like snare drum
    const filter = ctx.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = 850
    filter.Q.value = 2.5

    const gain = ctx.createGain()
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0.01, now)
    gain.gain.linearRampToValueAtTime(0.25, now + 1.8)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + 2.2)

    // Cymbal / final crash hit at end
    setTimeout(() => {
      try {
        const crashOsc = ctx.createOscillator()
        const crashGain = ctx.createGain()
        crashOsc.type = "triangle"
        crashOsc.frequency.setValueAtTime(140, ctx.currentTime)
        crashOsc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5)
        crashGain.gain.setValueAtTime(0.3, ctx.currentTime)
        crashGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
        crashOsc.connect(crashGain)
        crashGain.connect(ctx.destination)
        crashOsc.start()
        crashOsc.stop(ctx.currentTime + 0.6)
      } catch {
        /* ignore */
      }
    }, 1800)
  } catch {
    /* ignore audio error */
  }
}

export function playCheer() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // Musical fanfare notes
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq

      const start = now + idx * 0.12
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.18, start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.5)
    })
  } catch {
    /* ignore */
  }
}

/**
 * Pure HTML5 Canvas confetti explosion (zero external dependencies).
 */
export function fireCanvasConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const colors = ["#f43f5e", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#fbbf24"]
  const count = 120
  const particles: Array<{
    x: number
    y: number
    vx: number
    vy: number
    w: number
    h: number
    rot: number
    vRot: number
    color: string
    opacity: number
  }> = []

  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() * 200 - 100),
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 22,
      vy: Math.random() * -18 - 8,
      w: Math.random() * 12 + 6,
      h: Math.random() * 8 + 4,
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 16,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
    })
  }

  let animId: number
  const startTime = Date.now()

  function render() {
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const elapsed = Date.now() - startTime

    let alive = false
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.55 // gravity
      p.rot += p.vRot
      p.vx *= 0.985
      if (elapsed > 1800) {
        p.opacity = Math.max(0, p.opacity - 0.03)
      }

      if (p.opacity > 0 && p.y < canvas.height + 50) {
        alive = true
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.globalAlpha = p.opacity
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
    }

    if (alive && elapsed < 4000) {
      animId = requestAnimationFrame(render)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  animId = requestAnimationFrame(render)
  return () => cancelAnimationFrame(animId)
}
