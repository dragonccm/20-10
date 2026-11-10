"use client"

export type EmbedType = "google-slides" | "canva" | "office" | "generic"

export function resolvePresentationEmbed(url: string): { type: EmbedType; embedUrl: string; label: string } | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  // Google Slides
  // Pattern: https://docs.google.com/presentation/d/{id}/...
  const gslidesMatch = trimmed.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (gslidesMatch && gslidesMatch[1]) {
    const id = gslidesMatch[1]
    return {
      type: "google-slides",
      embedUrl: `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000`,
      label: "Google Slides Trực Tuyến",
    }
  }

  // Canva Embed
  // Pattern: https://www.canva.com/design/{id}/...
  const canvaMatch = trimmed.match(/canva\.com\/design\/([a-zA-Z0-9_-]+)/)
  if (canvaMatch) {
    let clean = trimmed.split("?")[0]
    if (!clean.endsWith("/view")) {
      clean = clean.replace(/\/watch|\/edit.*$/, "")
      if (!clean.endsWith("/view")) clean += "/view"
    }
    return {
      type: "canva",
      embedUrl: `${clean}?embed`,
      label: "Canva Live Presentation",
    }
  }

  // Office / OneDrive PPTX viewer
  if (/\.pptx?(\?.*)?$/i.test(trimmed)) {
    return {
      type: "office",
      embedUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(trimmed)}`,
      label: "Microsoft Office Web Presentation",
    }
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return {
      type: "generic",
      embedUrl: trimmed,
      label: "Trình chiếu Trực tuyến",
    }
  }

  return null
}
