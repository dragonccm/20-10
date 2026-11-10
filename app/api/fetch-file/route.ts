import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const { url } = (await req.json()) as { url?: string }
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Thiếu đường dẫn URL" }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: "URL không hợp lệ" }, { status: 400 })
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Chỉ hỗ trợ giao thức HTTP/HTTPS" }, { status: 400 })
    }

    const res = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Không thể tải tệp từ nguồn này (${res.status} ${res.statusText})` },
        { status: res.status }
      )
    }

    const contentType = res.headers.get("content-type") || ""
    const disposition = res.headers.get("content-disposition") || ""
    let filename = "downloaded-presentation.pptx"

    const filenameMatch = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i)
    if (filenameMatch && filenameMatch[1]) {
      filename = decodeURIComponent(filenameMatch[1])
    } else {
      const pathname = parsedUrl.pathname
      const lastSegment = pathname.split("/").pop()
      if (lastSegment && /\.(pptx|pdf)$/i.test(lastSegment)) {
        filename = decodeURIComponent(lastSegment)
      }
    }

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType || "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Lỗi khi tải tệp từ URL" },
      { status: 500 }
    )
  }
}
