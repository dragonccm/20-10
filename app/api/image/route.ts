import { NextResponse } from "next/server"

export const runtime = "nodejs"

function getFlowchartConfig() {
  const url = process.env.IMAGE_API_URL?.replace(/\/+$/, "") || "http://localhost:3069"
  const key = process.env.IMAGE_API_KEY || "vfx_3dae713b9082fba9d80555efa34c600611c0fe38dbeffc96"
  return { url, key }
}

export async function GET() {
  const { url, key } = getFlowchartConfig()
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 2000)
    const res = await fetch(`${url}/api/info`, {
      headers: { "X-Api-Key": key },
      signal: ctrl.signal,
    }).catch(() => null)
    clearTimeout(timer)

    if (res && res.ok) {
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({
        ok: true,
        running: true,
        apiUrl: url,
        name: data.name || "Google Labs Flowchart API",
        models: ["NARWHAL (Nano Banana 2)", "R2I (Imagen 4)", "GEM_PIX_2"],
      })
    }
  } catch {}

  return NextResponse.json({
    ok: false,
    running: false,
    apiUrl: url,
    message: "Máy chủ tạo ảnh Google Labs chưa chạy. Vui lòng khởi động dự án api-ai-flowchart tại cổng 3069.",
  })
}

export async function POST(req: Request) {
  const { url, key } = getFlowchartConfig()
  const body = await req.json().catch(() => ({}))
  const { action = "create" } = body

  if (action === "status") {
    return GET()
  }

  if (action === "create") {
    const { prompt, aspectRatio = "1:1", modelKey = "NARWHAL" } = body
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ ok: false, error: "Vui lòng nhập mô tả ảnh (prompt)" }, { status: 400 })
    }

    // Map user aspect ratio to Flowchart enum
    const ratioMap: Record<string, string> = {
      "1:1": "IMAGE_ASPECT_RATIO_SQUARE",
      "16:9": "IMAGE_ASPECT_RATIO_LANDSCAPE",
      "4:3": "IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE",
      "9:16": "IMAGE_ASPECT_RATIO_PORTRAIT",
      "3:4": "IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR",
    }
    const finalRatio = ratioMap[aspectRatio] || "IMAGE_ASPECT_RATIO_SQUARE"

    try {
      const res = await fetch(`${url}/api/image-task/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": key,
        },
        body: JSON.stringify({
          prompt,
          aspectRatio: finalRatio,
          modelKey,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        return NextResponse.json(
          { ok: false, error: data.error || "Không thể khởi tạo tiến trình tạo ảnh trên máy chủ." },
          { status: res.status || 500 },
        )
      }

      return NextResponse.json({
        ok: true,
        mediaId: data.mediaId,
        status: data.status,
      })
    } catch (e: any) {
      return NextResponse.json(
        {
          ok: false,
          error: "Không thể kết nối đến máy chủ tạo ảnh (api-ai-flowchart). Hãy kiểm tra xem server đã bật chưa.",
        },
        { status: 503 },
      )
    }
  }

  if (action === "check") {
    const { mediaId } = body
    if (!mediaId) {
      return NextResponse.json({ ok: false, error: "Thiếu mediaId" }, { status: 400 })
    }

    try {
      const res = await fetch(`${url}/api/image-task/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": key,
        },
        body: JSON.stringify({ mediaId }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: data.error || "Lỗi kiểm tra tiến trình" }, { status: res.status })
      }

      return NextResponse.json(data)
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: "Mất kết nối máy chủ tạo ảnh" }, { status: 503 })
    }
  }

  if (action === "proxy") {
    const { imageUrl } = body
    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: "Thiếu imageUrl" }, { status: 400 })
    }

    try {
      const res = await fetch(`${url}/api/download-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": key,
        },
        body: JSON.stringify({ imageUrl }),
      })

      if (!res.ok) {
        // Fallback: try direct fetch if GCS public
        const direct = await fetch(imageUrl).catch(() => null)
        if (direct && direct.ok) {
          const buf = Buffer.from(await direct.arrayBuffer())
          const mime = direct.headers.get("content-type") || "image/png"
          return NextResponse.json({
            ok: true,
            dataUrl: `data:${mime};base64,${buf.toString("base64")}`,
          })
        }
        return NextResponse.json({ ok: false, error: "Không thể tải ảnh" }, { status: 500 })
      }

      const buf = Buffer.from(await res.arrayBuffer())
      const mime = res.headers.get("content-type") || "image/png"
      return NextResponse.json({
        ok: true,
        dataUrl: `data:${mime};base64,${buf.toString("base64")}`,
      })
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: "Lỗi proxy ảnh" }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: false, error: "Action không hợp lệ" }, { status: 400 })
}
