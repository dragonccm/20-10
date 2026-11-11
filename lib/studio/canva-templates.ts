"use client"

import { uid } from "./storage"
import type { Design } from "./design"

export type CanvaDeckInfo = {
  id: string
  name: string
  subtitle: string
  description: string
  category:
    | "Văn hóa & Du lịch"
    | "Giáo dục & Học thuật"
    | "Sổ tay & Kỷ niệm"
    | "Phong cách sống & Roadtrip"
    | "Kinh doanh & Tiếp thị"
    | "Nghệ thuật & Sáng tạo"
  accent: string
  paper: string
  slidesCount: number
  coverImage?: string
  tags: string[]
  jsonPath: string
}

export const CANVA_DECKS: CanvaDeckInfo[] = [
  {
    id: "deck-kraft-vn",
    name: "Cẩm nang Du lịch Việt Nam",
    subtitle: "Kraft Vintage · Đỏ sẫm & Be đất",
    description: "Bộ slide 10 trang cẩm nang du lịch và văn hóa Việt Nam. Phong cách giấy xi măng vintage, dán sticker băng keo, tem cổ điển, điểm đến Hà Nội, Vịnh Hạ Long, Cố đô Huế, TP.HCM và ẩm thực truyền thống.",
    category: "Văn hóa & Du lịch",
    accent: "#84051b",
    paper: "#f2f1eb",
    slidesCount: 10,
    coverImage: "/templates/canva/deck-kraft-vn-cover.webp",
    tags: ["Canva", "Du lịch", "Văn hóa", "Kraft Vintage"],
    jsonPath: "/templates/canva/deck-kraft-vn.json",
  },
  {
    id: "deck-edu-doodle",
    name: "Giáo dục & Phân tích Tác phẩm",
    subtitle: "Doodle Vẽ tay Thân thiện · Xanh dương & Trắng",
    description: "Bộ slide 13 trang bài giảng giáo dục và phân tích văn học. Phong cách nét vẽ doodle thân thiện, khung thẻ nổi, sơ đồ tư duy, mục tiêu học tập, trích đoạn Pinocchio và câu hỏi thảo luận tương tác.",
    category: "Giáo dục & Học thuật",
    accent: "#0284c7",
    paper: "#f0f9ff",
    slidesCount: 13,
    coverImage: "/templates/canva/deck-edu-doodle-cover.webp",
    tags: ["Canva", "Giáo dục", "Văn học", "Doodle Vẽ tay"],
    jsonPath: "/templates/canva/deck-edu-doodle.json",
  },
  {
    id: "deck-scrapbook",
    name: "Sổ lưu niệm & Kế hoạch 10 năm",
    subtitle: "Scrapbook Pastel Vui nhộn · Be mơ & Xanh mint",
    description: "Bộ slide 15 trang sổ dán ảnh kỷ niệm và dự đoán tương lai. Phong cách Scrapbook pastel vui tươi, polaroid dán ảnh, sticky notes, bucket list, bảng theo dõi mục tiêu, thành tựu du lịch và stickers.",
    category: "Sổ tay & Kỷ niệm",
    accent: "#df961a",
    paper: "#fdf6ec",
    slidesCount: 15,
    coverImage: "/templates/canva/deck-scrapbook-cover.webp",
    tags: ["Canva", "Scrapbook", "Kỷ niệm", "Pastel"],
    jsonPath: "/templates/canva/deck-scrapbook.json",
  },
  {
    id: "deck-ecosse",
    name: "Roadtrip Écosse & Khám phá",
    subtitle: "Tạp chí Tối giản Hiện đại · Xanh rừng thông & Be ngà",
    description: "Bộ slide 10 trang hành trình roadtrip châu Âu khám phá Scotland. Bố cục editorial tạp chí thời thượng, bản đồ lộ trình Edinburgh - Glasgow - Skye, nhật ký từng ngày, thống kê và checklist hành lý.",
    category: "Phong cách sống & Roadtrip",
    accent: "#1f4213",
    paper: "#f5ebe0",
    slidesCount: 10,
    coverImage: "/templates/canva/deck-ecosse-cover.webp",
    tags: ["Canva", "Roadtrip", "Tối giản", "Editorial"],
    jsonPath: "/templates/canva/deck-ecosse.json",
  },
  {
    id: "deck-history-report",
    name: "Báo cáo Lịch sử & Nghiên cứu",
    subtitle: "Học thuật Cổ điển · Be ngà & Nâu sẫm",
    description: "Bộ slide 16 trang thuyết trình lịch sử, sự kiện thế giới và cơ sở dữ liệu học thuật. Bố cục trang nhã, phân chia mốc thời gian, bản đồ tư liệu và trích dẫn văn kiện.",
    category: "Giáo dục & Học thuật",
    accent: "#78350f",
    paper: "#fbf8f3",
    slidesCount: 16,
    coverImage: "/templates/canva/images/history_1.webp",
    tags: ["SlidesCarnival", "Lịch sử", "Học thuật", "Báo cáo"],
    jsonPath: "/templates/canva/deck-history-report.json",
  },
  {
    id: "deck-marketing-analysis",
    name: "Phân tích Chiến dịch Tiếp thị",
    subtitle: "Hiện đại & Số liệu · Chàm & Xanh ngọc",
    description: "Bộ slide 14 trang báo cáo phân tích chiến dịch Marketing, phễu chuyển đổi, KPI số liệu, biểu đồ thị phần và đánh giá hiệu quả kênh truyền thông.",
    category: "Kinh doanh & Tiếp thị",
    accent: "#2563eb",
    paper: "#f8fafc",
    slidesCount: 14,
    coverImage: "/templates/canva/images/mkt_1.webp",
    tags: ["SlidesCarnival", "Marketing", "Chiến dịch", "Số liệu"],
    jsonPath: "/templates/canva/deck-marketing-analysis.json",
  },
  {
    id: "deck-art-nouveau",
    name: "Nghệ thuật Cổ điển (Art Nouveau)",
    subtitle: "Hoa văn Cổ điển · Vàng kim & Xanh rêu",
    description: "Bộ slide 25 trang phong cách nghệ thuật Art Nouveau kinh điển của SlidesCarnival. Đường nét uốn lượn hữu cơ, khung viền hoa văn tinh xảo, thích hợp cho văn học, hội họa và thiết kế.",
    category: "Nghệ thuật & Sáng tạo",
    accent: "#854d0e",
    paper: "#fefce8",
    slidesCount: 25,
    coverImage: "/templates/canva/images/nouveau_1.webp",
    tags: ["SlidesCarnival", "Art Nouveau", "Cổ điển", "Nghệ thuật"],
    jsonPath: "/templates/canva/deck-art-nouveau.json",
  },
  {
    id: "deck-modern-minimal",
    name: "Ý tưởng Động não (Modern Minimal)",
    subtitle: "Tối giản Hiện đại · Đen tuyền & Trắng khói",
    description: "Bộ slide 18 trang hỗ trợ phiên động não (Brainstorming), dự án khởi nghiệp và phát triển ý tưởng. Bố cục dạng lưới rõ ràng, typographic sắc nét, dứt khoát.",
    category: "Nghệ thuật & Sáng tạo",
    accent: "#18181b",
    paper: "#f4f4f5",
    slidesCount: 18,
    coverImage: "/templates/canva/images/minimal_1.webp",
    tags: ["SlidesCarnival", "Minimal", "Brainstorm", "Hiện đại"],
    jsonPath: "/templates/canva/deck-modern-minimal.json",
  },
]

/**
 * Loads a pre-built presentation deck from public JSON,
 * rejuvenating all element IDs and slide IDs so it is fresh and editable.
 */
export async function loadCanvaDeck(deckId: string): Promise<Design[]> {
  const meta = CANVA_DECKS.find((d) => d.id === deckId)
  if (!meta) throw new Error(`Không tìm thấy mẫu deck: ${deckId}`)

  const res = await fetch(`${meta.jsonPath}?v=2`)
  if (!res.ok) throw new Error(`Không thể tải dữ liệu mẫu slide (${res.status} ${res.statusText})`)

  const rawSlides = (await res.json()) as Design[]
  if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
    throw new Error("Tệp mẫu slide không hợp lệ hoặc rỗng.")
  }

  const now = Date.now()
  const deckInstanceId = uid()

  return rawSlides.map((slide, sIdx) => {
    const slideId = uid()
    const rejuvenatedEls = (slide.els || []).map((el) => ({
      ...el,
      id: uid(),
    }))

    return {
      ...slide,
      id: slideId,
      deck: {
        id: deckInstanceId,
        name: meta.name,
        revision: 2,
      },
      els: rejuvenatedEls,
      updatedAt: now - sIdx * 500,
    }
  })
}

/** Recognize bundled source decks by content, including renamed uploads. */
export async function loadBundledPresentation(file: Blob): Promise<Design[] | null> {
  if (!globalThis.crypto?.subtle) return null
  const response = await fetch("/templates/canva/sources.json?v=2")
  if (!response.ok) return null
  const sources = await response.json() as Record<string, string>
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  const hash = Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, "0")).join("")
  return sources[hash] ? loadCanvaDeck(sources[hash]) : null
}
