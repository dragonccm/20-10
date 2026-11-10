"use client"

import { uid } from "./storage"
import type { Design } from "./design"

export type CanvaDeckInfo = {
  id: string
  name: string
  subtitle: string
  description: string
  category: "Văn hóa & Du lịch" | "Giáo dục & Học thuật" | "Sổ tay & Kỷ niệm" | "Phong cách sống & Roadtrip"
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
    description: "Bộ slide 10 trang chủ đề cẩm nang du lịch và văn hóa Việt Nam. Phong cách giấy xi măng vintage, dán sticker băng keo, tem cổ điển, giới thiệu Hà Nội, Vịnh Hạ Long, Cố đô Huế, TP.HCM và ẩm thực truyền thống.",
    category: "Văn hóa & Du lịch",
    accent: "#84051b",
    paper: "#f2f1eb",
    slidesCount: 10,
    coverImage: "/templates/canva/images/kraft_1.webp",
    tags: ["Canva Tuyển chọn", "Du lịch", "Văn hóa", "Kraft Vintage"],
    jsonPath: "/templates/canva/deck-kraft-vn.json",
  },
  {
    id: "deck-edu-doodle",
    name: "Giáo dục & Phân tích Tác phẩm",
    subtitle: "Doodle Vẽ tay Thân thiện · Xanh dương & Trắng",
    description: "Bộ slide 10 trang bài giảng giáo dục và phân tích văn học. Phong cách doodle nét vẽ tay thân thiện, khung thẻ nổi, sơ đồ tư duy, mục tiêu học tập, trích đoạn Pinocchio và câu hỏi thảo luận tương tác.",
    category: "Giáo dục & Học thuật",
    accent: "#0284c7",
    paper: "#f0f9ff",
    slidesCount: 10,
    coverImage: "/templates/canva/images/edu_1.webp",
    tags: ["Canva Tuyển chọn", "Giáo dục", "Văn học", "Doodle Vẽ tay"],
    jsonPath: "/templates/canva/deck-edu-doodle.json",
  },
  {
    id: "deck-scrapbook",
    name: "Sổ lưu niệm & Kế hoạch 10 năm",
    subtitle: "Scrapbook Pastel Vui nhộn · Màu Be mơ & Xanh mint",
    description: "Bộ slide 10 trang sổ dán ảnh kỷ niệm và dự đoán tương lai. Phong cách Scrapbook pastel vui tươi, polaroid dán ảnh, sticky notes, bucket list, bảng theo dõi mục tiêu, thành tựu du lịch và góc stickers lời chúc.",
    category: "Sổ tay & Kỷ niệm",
    accent: "#df961a",
    paper: "#fdf6ec",
    slidesCount: 10,
    coverImage: "/templates/canva/images/scrap_1.webp",
    tags: ["Canva Tuyển chọn", "Scrapbook", "Kỷ niệm", "Pastel"],
    jsonPath: "/templates/canva/deck-scrapbook.json",
  },
  {
    id: "deck-ecosse",
    name: "Roadtrip Écosse & Khám phá",
    subtitle: "Tạp chí Tối giản Hiện đại · Xanh rừng thông & Be ngà",
    description: "Bộ slide 10 trang hành trình roadtrip châu Âu khám phá Scotland. Bố cục editorial tạp chí thời thượng, bản đồ lộ trình Edinburgh - Glasgow - Skye, nhật ký từng ngày, thống kê cung đường và checklist hành lý.",
    category: "Phong cách sống & Roadtrip",
    accent: "#1f4213",
    paper: "#f5ebe0",
    slidesCount: 10,
    coverImage: "/templates/canva/images/ecosse_1.webp",
    tags: ["Canva Tuyển chọn", "Roadtrip", "Tối giản", "Editorial"],
    jsonPath: "/templates/canva/deck-ecosse.json",
  },
]

/**
 * Loads a pre-built Canva presentation deck from public JSON,
 * rejuvenating all element IDs and slide IDs so it is fresh and editable.
 */
export async function loadCanvaDeck(deckId: string): Promise<Design[]> {
  const meta = CANVA_DECKS.find((d) => d.id === deckId)
  if (!meta) throw new Error(`Không tìm thấy mẫu deck: ${deckId}`)

  const res = await fetch(meta.jsonPath)
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
      },
      els: rejuvenatedEls,
      updatedAt: now - sIdx * 500,
    }
  })
}
