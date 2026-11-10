"use client"

export type ImageServerStatus = {
  ok: boolean
  running: boolean
  apiUrl: string
  name?: string
  message?: string
}

export type AspectRatio = "1:1" | "16:9" | "4:3" | "9:16" | "3:4"

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "Vuông 1:1" },
  { value: "16:9", label: "Ngang 16:9 (Slide)" },
  { value: "4:3", label: "Ngang 4:3" },
  { value: "9:16", label: "Dọc 9:16 (Story/Poster)" },
  { value: "3:4", label: "Dọc 3:4" },
]

export const PROMPT_PRESETS = [
  {
    name: "Màu nước pastel",
    style: "soft watercolor illustration, gentle pastel colors, aesthetic, soft shadows, warm dreamy lighting, high resolution, minimalist",
    hint: "Minh họa hoa cỏ, phong cảnh nhẹ nhàng",
  },
  {
    name: "Sticker hoạt hình dễ thương",
    style: "cute kawaii sticker style, clean white outline, bold cheerful pastel colors, flat vector icon, studio lighting",
    hint: "Nhân vật, đồ dùng học tập cute",
  },
  {
    name: "Đồ họa 3D Claymorphism",
    style: "cute 3D clay render, matte smooth texture, rounded soft shapes, vibrant pastel colors, modern icon design, isolated on clean background",
    hint: "Icon 3D nổi bật, hiện đại",
  },
  {
    name: "Học thuật & Trừu tượng",
    style: "elegant modern abstract presentation graphic, geometric gradient shapes, clean corporate aesthetic, calming tones",
    hint: "Hình minh họa cho slide báo cáo",
  },
  {
    name: "Phong cảnh thiên nhiên dịu mát",
    style: "peaceful aesthetic nature landscape, soft sunlight, studio ghibli anime vibe, detailed background, cozy atmosphere",
    hint: "Ảnh nền góc học tập, thiên nhiên",
  },
]

export async function checkImageServerStatus(): Promise<ImageServerStatus> {
  try {
    const res = await fetch("/api/image")
    const data = await res.json().catch(() => ({}))
    return {
      ok: !!data.ok,
      running: !!data.running,
      apiUrl: data.apiUrl || "http://localhost:3069",
      name: data.name,
      message: data.message,
    }
  } catch {
    return {
      ok: false,
      running: false,
      apiUrl: "http://localhost:3069",
      message: "Không thể kết nối đến máy chủ tạo ảnh",
    }
  }
}

export type GenerateProgress = {
  status: "pending" | "success" | "failed"
  progress: number
  imageUrls?: string[]
  error?: string
}

export async function generateImageTask(
  prompt: string,
  aspectRatio: AspectRatio = "1:1",
  onProgress?: (p: GenerateProgress) => void,
): Promise<string> {
  // 1. Create task
  const createRes = await fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", prompt, aspectRatio }),
  })

  const createData = await createRes.json().catch(() => ({}))
  if (!createRes.ok || !createData.ok) {
    throw new Error(createData.error || "Không thể khởi tạo tạo ảnh.")
  }

  const mediaId = createData.mediaId
  onProgress?.({ status: "pending", progress: 10 })

  // 2. Poll until success (max 90s)
  const startTime = Date.now()
  while (Date.now() - startTime < 90000) {
    await new Promise((r) => setTimeout(r, 2500))

    const checkRes = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", mediaId }),
    })

    const checkData = await checkRes.json().catch(() => ({}))
    if (!checkRes.ok) {
      throw new Error(checkData.error || "Lỗi khi kiểm tra tiến độ tạo ảnh.")
    }

    if (checkData.status === "failed") {
      throw new Error(checkData.error || "Tạo ảnh thất bại.")
    }

    if (checkData.status === "success" && checkData.imageUrls && checkData.imageUrls.length > 0) {
      onProgress?.({ status: "success", progress: 100, imageUrls: checkData.imageUrls })
      return checkData.imageUrls[0]
    }

    onProgress?.({
      status: "pending",
      progress: Math.min(95, checkData.progress || 30),
    })
  }

  throw new Error("Quá thời gian chờ tạo ảnh. Vui lòng thử lại sau.")
}

export async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  const res = await fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "proxy", imageUrl }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.ok || !data.dataUrl) {
    throw new Error(data.error || "Không thể tải ảnh về bộ nhớ")
  }
  return data.dataUrl
}
