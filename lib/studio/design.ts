"use client"

import { uid } from "./storage"
import type { Crop, Filters } from "./imagefx"

export type Bg = { from: string; to: string; angle: number }
export type El = {
  id: string
  type: "text" | "rect" | "circle" | "image"
  x: number
  y: number
  w: number
  h: number
  opacity: number
  rot?: number
  shadow?: boolean
  // text
  text?: string
  fontSize?: number
  color?: string
  weight?: number
  italic?: boolean
  lineHeight?: number
  align?: "left" | "center" | "right"
  font?: "sans" | "serif"
  fontFamily?: string
  letterSpacing?: number
  verticalAlign?: "top" | "middle" | "bottom"
  // shapes
  fill?: string
  radius?: number
  // image
  src?: string
  nw?: number
  nh?: number
  crop?: Crop
  filters?: Partial<Filters>
  flipX?: boolean
  flipY?: boolean
  /** Transparent cut-out (sticker); origSrc keeps the photo before background removal. */
  cutout?: boolean
  origSrc?: string
}
export type Design = { id: string; name: string; w: number; h: number; bg: Bg; els: El[]; updatedAt: number; deck?: { id: string; name: string; revision?: number } }
export type DesignDraft = Omit<Design, "id" | "updatedAt">

export const FONTS = {
  sans: '"Segoe UI", "Noto Sans", "Noto Sans KR", Arial, sans-serif',
  serif: 'Georgia, "Noto Serif", "Noto Serif KR", "Times New Roman", serif',
}
export const SIZES = [
  { label: "Bài đăng vuông 1080×1080", w: 1080, h: 1080 },
  { label: "Bài đăng dọc 1080×1350", w: 1080, h: 1350 },
  { label: "Story 1080×1920", w: 1080, h: 1920 },
  { label: "Slide 16:9 1920×1080", w: 1920, h: 1080 },
  { label: "Thumbnail 1280×720", w: 1280, h: 720 },
  { label: "Poster A4 1240×1754", w: 1240, h: 1754 },
]
export const BGS: Bg[] = [
  { from: "#ffffff", to: "#ffffff", angle: 135 },
  { from: "#fdf2f8", to: "#ede9fe", angle: 135 },
  { from: "#fff7ed", to: "#fce7f3", angle: 135 },
  { from: "#ecfeff", to: "#ede9fe", angle: 160 },
  { from: "#f0fdf4", to: "#e0f2fe", angle: 135 },
  { from: "#f472b6", to: "#8b5cf6", angle: 135 },
  { from: "#38bdf8", to: "#818cf8", angle: 135 },
  { from: "#1e1b4b", to: "#4c1d95", angle: 160 },
]

export const bgCss = (b: Bg) => (b.from === b.to ? b.from : `linear-gradient(${b.angle}deg, ${b.from}, ${b.to})`)

export const text = (p: Partial<El>): El => ({ id: uid(), type: "text", x: 80, y: 80, w: 600, h: 120, opacity: 1, text: "Nhập chữ", fontSize: 64, color: "#1e293b", weight: 700, align: "left", font: "sans", ...p })
export const shape = (type: "rect" | "circle", p: Partial<El>): El => ({ id: uid(), type, x: 100, y: 100, w: 300, h: 300, opacity: 1, fill: "#ddd6fe", radius: 24, ...p })
const R = (p: Partial<El>) => shape("rect", p)
const C = (p: Partial<El>) => shape("circle", p)
const T = text

export function blank(w: number, h: number, name = "Thiết kế mới"): Design {
  return { id: uid(), name, w, h, bg: BGS[1], els: [], updatedAt: Date.now() }
}

export type TemplateCat = "Mạng xã hội" | "Học tập" | "Thuyết trình" | "Sự kiện"
export const TEMPLATE_CATS: TemplateCat[] = ["Mạng xã hội", "Học tập", "Thuyết trình", "Sự kiện"]

export const SLIDE_SETS = [
  { name: "Cẩm nang Du lịch Việt Nam", style: "Kraft Vintage · Đỏ sẫm & Be", accent: "#84051b", paper: "#f2f1eb", layout: "editorial", pages: ["CẨM NANG DU LỊCH VIỆT NAM 2026", "Giới thiệu & Bản sắc Văn hóa", "Hà Nội · Thủ đô ngàn năm văn hiến", "Vịnh Hạ Long · Kỳ quan thiên nhiên", "Cố đô Huế & TP. Hồ Chí Minh", "Khám phá Tinh hoa Ẩm thực", "Kinh nghiệm & Hướng dẫn di chuyển", "Lời cảm ơn & Thông tin liên hệ"] },
  { name: "Giáo dục & Phân tích Tác phẩm", style: "Doodle Vẽ tay · Xanh & Trắng", accent: "#0284c7", paper: "#f0f9ff", layout: "split", pages: ["Chủ đề & Ý tưởng chủ đạo trong tác phẩm", "Mục tiêu bài học & Kỹ năng suy luận", "Chủ đề là gì? Nhận diện thông điệp ngầm", "Các chủ đề quen thuộc trong tác phẩm", "Phân tích trích đoạn văn học mẫu", "Cách xây dựng luận điểm & Dẫn chứng", "Thảo luận nhóm & Câu hỏi phản biện", "Tổng kết bài học & Nguồn tham khảo"] },
  { name: "Sổ lưu niệm & Kế hoạch 10 năm", style: "Scrapbook Pastel · Be & Xanh Mint", accent: "#df961a", paper: "#fdf6ec", layout: "orbit", pages: ["Dự đoán cuộc sống trong 10 năm tới", "Quy tắc tiệc & Lời chúc khởi hành", "My Bucket List · Những điều phải thử", "Bảng theo dõi mục tiêu cá nhân", "Thành tựu du lịch & Khám phá thế giới", "Sở thích đam mê & Kỹ năng mới", "Sự nghiệp trong mơ & Định hướng", "Góc ghi chú & Dán sticker lời nhắn"] },
  { name: "Roadtrip Écosse & Khám phá", style: "Tạp chí Hiện đại · Xanh rừng & Be", accent: "#1f4213", paper: "#f5ebe0", layout: "editorial", pages: ["Roadtrip en Écosse · 3 au 8 Mai", "L'itinéraire · Bản đồ lộ trình", "Jour 1: Đến Edinburgh & Phố cổ hoàng gia", "Jour 2: Lái xe qua thung lũng cao nguyên", "Jour 3: Lâu đài & Hồ Loch Ness", "Jour 4: Vẻ đẹp hoang sơ Đảo Skye", "Jour 5 & 6: Văn hóa nghệ thuật Glasgow", "Thống kê lộ trình & Checklist hành lý"] },
  { name: "Báo cáo Lịch sử & Nghiên cứu", style: "Học thuật Cổ điển · Be & Nâu", accent: "#78350f", paper: "#fbf8f3", layout: "editorial", pages: ["Báo cáo Lịch sử & Nghiên cứu", "Bối cảnh thời đại & Mốc thời gian", "Sự kiện cốt lõi & Nhân vật chính", "Tư liệu & Văn kiện lịch sử", "Ý nghĩa thời đại & Đúc rút bài học", "Nguồn tham khảo & Thư mục"] },
  { name: "Phân tích Chiến dịch Marketing", style: "Hiện đại & Số liệu · Chàm & Xanh", accent: "#2563eb", paper: "#f8fafc", layout: "split", pages: ["Báo cáo Phân tích Chiến dịch Tiếp thị", "Tổng quan mục tiêu & Thị trường mục tiêu", "Hiệu quả kênh truyền thông & Phễu chuyển đổi", "Chỉ số ROI, CAC & Doanh thu", "Điểm nghẽn & Đề xuất tối ưu"] },
  { name: "Nghệ thuật Art Nouveau", style: "Hoa văn Cổ điển · Vàng kim", accent: "#854d0e", paper: "#fefce8", layout: "editorial", pages: ["Phong cách Nghệ thuật Art Nouveau", "Triết lý thẩm mỹ & Nguồn cảm hứng", "Tác phẩm tiêu biểu & Họa tiết uốn lượn", "Ảnh hưởng đến kiến trúc & Đồ họa", "Đúc kết & Triển vọng ứng dụng"] },
  { name: "Ý tưởng Động não (Brainstorm)", style: "Tối giản · Đen & Trắng khói", accent: "#18181b", paper: "#f4f4f5", layout: "split", pages: ["Phiên Động não & Phát triển Ý tưởng", "Vấn đề cốt lõi & Nỗi đau khách hàng", "Ý tưởng giải pháp & Mô hình đề xuất", "Phân tích ma trận ưu tiên", "Kế hoạch hành động 30 ngày"] },
  { name: "Thuyết trình trên lớp", style: "Tạp chí · Tím", accent: "#5b21b6", paper: "#f5f3ff", layout: "editorial", pages: ["Tên bài thuyết trình", "Nội dung chính", "Ví dụ minh họa", "Kết luận", "Tài liệu tham khảo"] },
  { name: "Bảo vệ khóa luận tốt nghiệp", style: "Học thuật · Xanh Navy", accent: "#1e3a8a", paper: "#f8fafc", layout: "editorial", pages: ["Bảo vệ khóa luận tốt nghiệp", "Tính cấp thiết & Mục tiêu", "Tổng quan cơ sở lý thuyết", "Phương pháp & Mẫu nghiên cứu", "Kết quả phân tích chính", "Hàm ý giải pháp & Kết luận", "Tài liệu tham khảo"] },
  { name: "English Academic Seminar", style: "Oxford Style · Be & Xanh", accent: "#1d4ed8", paper: "#fefce8", layout: "split", pages: ["Academic Seminar & Research Paper", "Literature Review & Hypotheses", "Methodology & Empirical Data", "Key Findings & Discussion", "Implications for Future Studies", "References & Acknowledgements"] },
  { name: "Báo cáo nghiên cứu", style: "Tối giản · Xanh ngọc", accent: "#115e59", paper: "#f0fdfa", layout: "split", pages: ["Tên đề tài", "Câu hỏi nghiên cứu", "Phương pháp", "Kết quả", "Thảo luận", "Tài liệu tham khảo"] },
  { name: "Phân tích so sánh & Đối chiếu", style: "Hiện đại · Xanh xô thơm", accent: "#065f46", paper: "#f0fdf4", layout: "split", pages: ["Nghiên cứu so sánh", "Bối cảnh & Đặt vấn đề", "So sánh phương án A và B", "Phân tích ưu điểm & hạn chế", "Bài học kinh nghiệm & Đề xuất"] },
  { name: "Báo cáo số liệu & Thống kê", style: "Chuyên nghiệp · Chàm & Tím", accent: "#4338ca", paper: "#f5f3ff", layout: "orbit", pages: ["Báo cáo số liệu khảo sát", "Quy mô mẫu & Nhân khẩu học", "Các chỉ số thống kê cốt lõi", "Phân tích xu hướng biến số", "Khuyến nghị thực tiễn"] },
  { name: "Văn hóa và ngoại ngữ", style: "Hình học · Hồng mận", accent: "#9d174d", paper: "#fdf2f8", layout: "orbit", pages: ["한국 문화 · Văn hóa Hàn Quốc", "Bối cảnh", "Ví dụ và hình ảnh", "Từ vựng · 어휘", "Kết luận", "Tài liệu tham khảo"] },
  { name: "Dự án nhóm", style: "Tương phản · Xanh đêm", accent: "#1e3a8a", paper: "#eff6ff", layout: "orbit", pages: ["Dự án nhóm", "Mục tiêu", "Thành viên và vai trò", "Tiến độ", "Kết quả", "Bước tiếp theo"] },
  { name: "Kể chuyện bằng hình ảnh", style: "Tạp chí · Cam đất", accent: "#9a3412", paper: "#fff7ed", layout: "editorial", pages: ["Một câu chuyện bằng hình ảnh", "Bối cảnh", "Khoảnh khắc chính", "Điều đọng lại"] },
  { name: "Bài học từ vựng", style: "Hai cột · Xanh rêu", accent: "#3f6212", paper: "#f7fee7", layout: "split", pages: ["Từ vựng theo chủ đề", "Từ mới · 어휘", "Ví dụ trong ngữ cảnh", "Thử nhớ lại", "Đáp án"] },
]

type SlideSet = (typeof SLIDE_SETS)[number]

export function slideSetPage(set: SlideSet, index: number): DesignDraft {
  const title = set.pages[index]
  const cover = index === 0
  const dark = cover && set.layout === "orbit"
  const ink = dark ? "#ffffff" : "#172033"
  const label = dark ? "#ffffff" : set.accent
  const bg = { from: dark ? set.accent : set.paper, to: dark ? "#172033" : "#ffffff", angle: 135 }
  const els: El[] = [
    T({ x: 110, y: 85, w: 1450, h: 66, text: set.name.toUpperCase(), fontSize: 40, color: label }),
    T({ x: 1610, y: 85, w: 200, h: 66, text: String(index + 1).padStart(2, "0"), fontSize: 40, color: label, align: "right" }),
  ]

  if (cover) {
    const split = set.layout === "split"
    if (split) els.unshift(R({ x: 1380, y: 0, w: 540, h: 1080, fill: set.accent, radius: 0 }))
    if (dark) els.unshift(C({ x: 1290, y: 245, w: 520, h: 520, fill: "#ffffff", opacity: 0.16 }))
    if (set.layout === "editorial") els.push(R({ x: 110, y: 238, w: 1700, h: 9, fill: set.accent, radius: 0 }))
    if (split) els[2] = { ...els[2], color: "#ffffff" }
    els.push(
      T({ x: 110, y: 315, w: split || dark ? 1160 : 1670, h: 330, text: title, fontSize: 110, font: set.layout === "editorial" ? "serif" : "sans", color: ink }),
      T({ x: 110, y: 830, w: 1150, h: 90, text: "Môn học · Họ tên · Ngày trình bày", fontSize: 49, color: label, weight: 500 }),
    )
  } else {
    const columns = index % 2 === 0 && index < set.pages.length - 1
    els.push(
      T({ x: 110, y: 205, w: 1690, h: 150, text: title, fontSize: 92, color: ink }),
      R({ x: 110, y: 420, w: columns ? 820 : 1700, h: 495, fill: "#ffffff", radius: 36 }),
      T({ x: 165, y: 485, w: columns ? 710 : 1560, h: 365, text: title === "Tài liệu tham khảo" ? "Tác giả · Năm · Tên tài liệu · Liên kết" : "Thêm ý chính và dẫn chứng của bạn.", fontSize: 53, color: ink, weight: 400 }),
    )
    if (columns) els.push(
      R({ x: 990, y: 420, w: 820, h: 495, fill: set.accent, radius: 36 }),
      T({ x: 1050, y: 485, w: 700, h: 365, text: "Ví dụ hoặc ghi chú", fontSize: 53, color: "#ffffff" }),
    )
  }
  return { name: title, w: 1920, h: 1080, bg, els }
}

export function createSlideSet(set: SlideSet): Design[] {
  const deck = { id: uid(), name: set.name }
  return set.pages.map((title, index) => ({ ...blank(1920, 1080, title), ...slideSetPage(set, index), deck }))
}

/* ---------- Templates ---------- */

export const TEMPLATES: { name: string; cat: TemplateCat; make: () => DesignDraft }[] = [
  {
    name: "Thông báo sự kiện",
    cat: "Sự kiện",
    make: () => ({
      name: "Thông báo sự kiện",
      w: 1080,
      h: 1920,
      bg: { from: "#f472b6", to: "#8b5cf6", angle: 160 },
      els: [
        C({ x: 640, y: -120, w: 600, h: 600, fill: "#ffffff", opacity: 0.15 }),
        T({ x: 90, y: 260, w: 900, h: 80, text: "CLB TIẾNG HÀN", fontSize: 44, color: "#fdf2f8", weight: 600 }),
        T({ x: 90, y: 360, w: 900, h: 420, text: "Đêm hội\nvăn hóa\nHàn Quốc", fontSize: 120, color: "#ffffff", weight: 800, shadow: true }),
        R({ x: 90, y: 1180, w: 900, h: 460, fill: "#ffffff", opacity: 0.92, radius: 48 }),
        T({ x: 150, y: 1240, w: 780, h: 340, text: "Thời gian: 19:00, Thứ Sáu\nĐịa điểm: Hội trường A\n\nĐăng ký tại quầy CLB", fontSize: 46, color: "#4c1d95", weight: 600 }),
      ],
    }),
  },
  {
    name: "Poster tuyển thành viên",
    cat: "Sự kiện",
    make: () => ({
      name: "Tuyển thành viên CLB",
      w: 1240,
      h: 1754,
      bg: { from: "#0f172a", to: "#312e81", angle: 160 },
      els: [
        C({ x: 700, y: -150, w: 800, h: 800, fill: "#6366f1", opacity: 0.35 }),
        C({ x: -200, y: 1200, w: 700, h: 700, fill: "#ec4899", opacity: 0.3 }),
        T({ x: 100, y: 180, w: 1040, h: 70, text: "CLB NGÔN NGỮ HÀN", fontSize: 48, color: "#a5b4fc", weight: 700 }),
        T({ x: 100, y: 280, w: 1040, h: 560, text: "Tuyển\nthành viên\nmới", fontSize: 170, color: "#ffffff", weight: 800, lineHeight: 1.05, shadow: true }),
        R({ x: 100, y: 880, w: 160, h: 10, fill: "#f472b6", radius: 5 }),
        T({ x: 100, y: 930, w: 1040, h: 170, text: "Bạn yêu thích K-drama, K-pop\nhay muốn đạt TOPIK cao?", fontSize: 54, color: "#e0e7ff", weight: 500, lineHeight: 1.35 }),
        R({ x: 100, y: 1150, w: 1040, h: 110, fill: "#ffffff", opacity: 0.1, radius: 28 }),
        T({ x: 150, y: 1180, w: 940, h: 60, text: "Học nhóm mỗi tuần với anh chị TOPIK 6", fontSize: 40, color: "#ffffff", weight: 600 }),
        R({ x: 100, y: 1280, w: 1040, h: 110, fill: "#ffffff", opacity: 0.1, radius: 28 }),
        T({ x: 150, y: 1310, w: 940, h: 60, text: "Giao lưu với sinh viên Hàn Quốc", fontSize: 40, color: "#ffffff", weight: 600 }),
        R({ x: 100, y: 1410, w: 1040, h: 110, fill: "#ffffff", opacity: 0.1, radius: 28 }),
        T({ x: 150, y: 1440, w: 940, h: 60, text: "Sự kiện văn hóa mỗi tháng", fontSize: 40, color: "#ffffff", weight: 600 }),
        R({ x: 100, y: 1580, w: 520, h: 100, fill: "#f472b6", radius: 50 }),
        T({ x: 100, y: 1604, w: 520, h: 60, text: "Đăng ký trước 30/11", fontSize: 42, color: "#ffffff", weight: 800, align: "center" }),
        T({ x: 660, y: 1606, w: 480, h: 60, text: "fb.com/clbtienghan", fontSize: 38, color: "#c7d2fe", weight: 500 }),
      ],
    }),
  },
  {
    name: "Giấy chứng nhận",
    cat: "Sự kiện",
    make: () => ({
      name: "Giấy chứng nhận",
      w: 1754,
      h: 1240,
      bg: { from: "#fffbeb", to: "#fffbeb", angle: 135 },
      els: [
        R({ x: 40, y: 40, w: 1674, h: 1160, fill: "#92400e", radius: 24 }),
        R({ x: 58, y: 58, w: 1638, h: 1124, fill: "#fffbeb", radius: 16 }),
        R({ x: 90, y: 90, w: 1574, h: 1060, fill: "#d97706", radius: 12 }),
        R({ x: 96, y: 96, w: 1562, h: 1048, fill: "#fffbeb", radius: 10 }),
        T({ x: 177, y: 210, w: 1400, h: 140, text: "GIẤY CHỨNG NHẬN", fontSize: 110, color: "#78350f", weight: 700, align: "center", font: "serif" }),
        T({ x: 177, y: 390, w: 1400, h: 60, text: "Trân trọng trao tặng", fontSize: 44, color: "#92400e", weight: 400, italic: true, align: "center", font: "serif" }),
        T({ x: 177, y: 470, w: 1400, h: 170, text: "Nguyễn Thúy Ngân", fontSize: 130, color: "#b45309", weight: 700, italic: true, align: "center", font: "serif" }),
        R({ x: 527, y: 660, w: 700, h: 4, fill: "#d97706", radius: 2 }),
        T({ x: 177, y: 700, w: 1400, h: 140, text: "Đã hoàn thành xuất sắc khóa học Tiếng Hàn trung cấp\ntại Câu lạc bộ Ngôn ngữ Hàn Quốc", fontSize: 42, color: "#57534e", weight: 400, align: "center", lineHeight: 1.5 }),
        C({ x: 1340, y: 860, w: 220, h: 220, fill: "#d97706" }),
        C({ x: 1360, y: 880, w: 180, h: 180, fill: "#f59e0b" }),
        T({ x: 1340, y: 920, w: 220, h: 110, text: "XUẤT\nSẮC", fontSize: 40, color: "#ffffff", weight: 800, align: "center", lineHeight: 1.2 }),
        T({ x: 200, y: 940, w: 600, h: 50, text: "Ngày 20 tháng 11 năm 2026", fontSize: 34, color: "#78350f", weight: 500, italic: true, font: "serif" }),
        R({ x: 200, y: 1050, w: 420, h: 3, fill: "#a8a29e", radius: 1 }),
        T({ x: 200, y: 1065, w: 420, h: 50, text: "Chủ nhiệm CLB", fontSize: 32, color: "#57534e", weight: 500, align: "center" }),
      ],
    }),
  },
  {
    name: "Thiệp chúc mừng",
    cat: "Mạng xã hội",
    make: () => ({
      name: "Thiệp 20/11",
      w: 1080,
      h: 1080,
      bg: { from: "#fff1f2", to: "#fae8ff", angle: 135 },
      els: [
        C({ x: -120, y: -120, w: 420, h: 420, fill: "#fecdd3", opacity: 0.8 }),
        C({ x: 820, y: 60, w: 200, h: 200, fill: "#f0abfc", opacity: 0.5 }),
        C({ x: 760, y: 760, w: 440, h: 440, fill: "#fbcfe8", opacity: 0.7 }),
        C({ x: 120, y: 860, w: 120, h: 120, fill: "#c4b5fd", opacity: 0.6 }),
        T({ x: 90, y: 290, w: 900, h: 120, text: "Chúc mừng", fontSize: 96, color: "#be185d", weight: 600, italic: true, align: "center", font: "serif" }),
        T({ x: 90, y: 420, w: 900, h: 280, text: "Ngày Nhà giáo\nViệt Nam", fontSize: 112, color: "#831843", weight: 800, align: "center", lineHeight: 1.1 }),
        R({ x: 440, y: 725, w: 200, h: 6, fill: "#f472b6", radius: 3 }),
        T({ x: 90, y: 760, w: 900, h: 60, text: "20 · 11 · 2026", fontSize: 40, color: "#9d174d", weight: 600, align: "center" }),
        T({ x: 140, y: 840, w: 800, h: 100, text: "Kính chúc thầy cô luôn mạnh khỏe và hạnh phúc", fontSize: 34, color: "#a21caf", weight: 500, align: "center" }),
      ],
    }),
  },
  {
    name: "Câu nói truyền cảm hứng",
    cat: "Mạng xã hội",
    make: () => ({
      name: "Trích dẫn",
      w: 1080,
      h: 1080,
      bg: { from: "#1e1b4b", to: "#4c1d95", angle: 160 },
      els: [
        C({ x: -200, y: -200, w: 600, h: 600, fill: "#a78bfa", opacity: 0.25 }),
        C({ x: 760, y: 760, w: 500, h: 500, fill: "#f472b6", opacity: 0.2 }),
        T({ x: 110, y: 90, w: 300, h: 300, text: "“", fontSize: 300, color: "#f9a8d4", weight: 700, font: "serif", opacity: 0.9 }),
        T({ x: 120, y: 380, w: 840, h: 400, text: "Học một ngôn ngữ mới là có thêm một tâm hồn mới.", fontSize: 72, color: "#ffffff", weight: 600, font: "serif", lineHeight: 1.3 }),
        R({ x: 120, y: 820, w: 80, h: 6, fill: "#f9a8d4", radius: 3 }),
        T({ x: 120, y: 850, w: 800, h: 60, text: "Tục ngữ Séc", fontSize: 38, color: "#e9d5ff", weight: 500, italic: true }),
      ],
    }),
  },
  {
    name: "5 mẹo học tập",
    cat: "Mạng xã hội",
    make: () => {
      const tips = ["Học theo chủ đề, không học rời rạc", "Đặt câu với từ mới ngay lập tức", "Ôn lại theo lịch ngắt quãng", "Dán giấy nhớ quanh nhà", "Dạy lại cho bạn bè"]
      return {
        name: "5 mẹo nhớ từ vựng",
        w: 1080,
        h: 1080,
        bg: { from: "#ecfeff", to: "#ede9fe", angle: 135 },
        els: [
          C({ x: 780, y: -120, w: 420, h: 420, fill: "#a5f3fc", opacity: 0.6 }),
          T({ x: 80, y: 80, w: 920, h: 250, text: "5 mẹo nhớ\ntừ vựng lâu", fontSize: 96, color: "#164e63", weight: 800, lineHeight: 1.1 }),
          ...tips.flatMap((t, i) => [
            C({ x: 80, y: 380 + i * 125, w: 80, h: 80, fill: "#06b6d4" }),
            T({ x: 80, y: 395 + i * 125, w: 80, h: 50, text: String(i + 1), fontSize: 40, color: "#ffffff", weight: 800, align: "center" }),
            T({ x: 190, y: 392 + i * 125, w: 810, h: 60, text: t, fontSize: 40, color: "#0f172a", weight: 600 }),
          ]),
        ],
      }
    },
  },
  {
    name: "Thumbnail YouTube",
    cat: "Mạng xã hội",
    make: () => ({
      name: "Thumbnail",
      w: 1280,
      h: 720,
      bg: { from: "#fde047", to: "#fb923c", angle: 135 },
      els: [
        R({ x: 0, y: 500, w: 1280, h: 220, fill: "#111827", radius: 0 }),
        C({ x: 860, y: 50, w: 380, h: 380, fill: "#ffffff", opacity: 0.92 }),
        T({ x: 860, y: 90, w: 380, h: 300, text: "한", fontSize: 240, color: "#dc2626", weight: 800, align: "center" }),
        T({ x: 70, y: 60, w: 780, h: 290, text: "HỌC TIẾNG HÀN\n30 NGÀY", fontSize: 112, color: "#111827", weight: 800, lineHeight: 1.05 }),
        R({ x: 70, y: 380, w: 440, h: 84, fill: "#dc2626", radius: 42, rot: 357 }),
        T({ x: 70, y: 395, w: 440, h: 60, text: "TỪ CON SỐ 0", fontSize: 44, color: "#ffffff", weight: 800, align: "center", rot: 357 }),
        T({ x: 70, y: 575, w: 1140, h: 80, text: "Lộ trình · Tài liệu · Mẹo nhớ từ", fontSize: 52, color: "#fde047", weight: 700 }),
      ],
    }),
  },
  {
    name: "Mẫu câu mỗi ngày",
    cat: "Học tập",
    make: () => ({
      name: "Mẫu câu hôm nay",
      w: 1080,
      h: 1920,
      bg: { from: "#fef3c7", to: "#fce7f3", angle: 170 },
      els: [
        C({ x: 600, y: -200, w: 700, h: 700, fill: "#fde68a", opacity: 0.6 }),
        R({ x: 90, y: 260, w: 440, h: 90, fill: "#f59e0b", radius: 45 }),
        T({ x: 90, y: 282, w: 440, h: 50, text: "MẪU CÂU HÔM NAY", fontSize: 36, color: "#ffffff", weight: 800, align: "center" }),
        T({ x: 90, y: 440, w: 900, h: 340, text: "오늘 날씨가\n정말 좋네요!", fontSize: 120, color: "#7c2d12", weight: 800, lineHeight: 1.2 }),
        T({ x: 90, y: 820, w: 900, h: 60, text: "[o-neul nal-ssi-ga jeong-mal jo-ne-yo]", fontSize: 38, color: "#9a3412", weight: 400, italic: true }),
        R({ x: 90, y: 960, w: 900, h: 440, fill: "#ffffff", opacity: 0.9, radius: 48 }),
        T({ x: 150, y: 1010, w: 780, h: 50, text: "NGHĨA", fontSize: 32, color: "#f59e0b", weight: 800 }),
        T({ x: 150, y: 1070, w: 780, h: 140, text: "Hôm nay thời tiết đẹp thật đấy!", fontSize: 54, color: "#1e293b", weight: 700, lineHeight: 1.25 }),
        T({ x: 150, y: 1240, w: 780, h: 120, text: "-네요: cảm thán khi nhận ra điều gì đó", fontSize: 36, color: "#64748b", weight: 500, lineHeight: 1.4 }),
        T({ x: 90, y: 1560, w: 900, h: 60, text: "Lưu lại và luyện nói 3 lần nhé", fontSize: 38, color: "#9a3412", weight: 600, align: "center" }),
      ],
    }),
  },
  {
    name: "Thẻ từ vựng",
    cat: "Học tập",
    make: () => ({
      name: "Thẻ từ vựng",
      w: 1080,
      h: 1080,
      bg: { from: "#fff7ed", to: "#fce7f3", angle: 135 },
      els: [
        C({ x: 720, y: -140, w: 480, h: 480, fill: "#fbcfe8", opacity: 0.7 }),
        T({ x: 90, y: 300, w: 900, h: 220, text: "도서관", fontSize: 180, color: "#831843", weight: 800, align: "center" }),
        T({ x: 90, y: 540, w: 900, h: 90, text: "Thư viện", fontSize: 64, color: "#be185d", weight: 600, align: "center" }),
        R({ x: 140, y: 700, w: 800, h: 160, fill: "#ffffff", opacity: 0.85, radius: 36 }),
        T({ x: 170, y: 735, w: 740, h: 100, text: "도서관에서 공부해요.\nTôi học ở thư viện.", fontSize: 38, color: "#9d174d", weight: 500, align: "center" }),
      ],
    }),
  },
  {
    name: "So sánh ngữ pháp",
    cat: "Học tập",
    make: () => ({
      name: "So sánh đuôi câu",
      w: 1080,
      h: 1350,
      bg: { from: "#eff6ff", to: "#fdf2f8", angle: 180 },
      els: [
        T({ x: 80, y: 80, w: 920, h: 110, text: "-아요 vs -습니다", fontSize: 84, color: "#1e293b", weight: 800, align: "center" }),
        T({ x: 80, y: 195, w: 920, h: 50, text: "Hai đuôi câu lịch sự trong tiếng Hàn", fontSize: 34, color: "#64748b", weight: 500, align: "center" }),
        R({ x: 80, y: 290, w: 445, h: 900, fill: "#dbeafe", radius: 40 }),
        R({ x: 555, y: 290, w: 445, h: 900, fill: "#fce7f3", radius: 40 }),
        T({ x: 80, y: 335, w: 445, h: 70, text: "-아요/어요", fontSize: 52, color: "#1d4ed8", weight: 800, align: "center" }),
        T({ x: 555, y: 335, w: 445, h: 70, text: "-습니다", fontSize: 52, color: "#be185d", weight: 800, align: "center" }),
        T({ x: 120, y: 440, w: 365, h: 700, text: "Thân mật, lịch sự\n\nDùng hằng ngày với người lớn tuổi, đồng nghiệp\n\nVí dụ:\n공부해요\n먹어요", fontSize: 36, color: "#1e3a8a", weight: 500, lineHeight: 1.45 }),
        T({ x: 595, y: 440, w: 365, h: 700, text: "Trang trọng\n\nPhát biểu, tin tức, phỏng vấn, thuyết trình\n\nVí dụ:\n공부합니다\n먹습니다", fontSize: 36, color: "#831843", weight: 500, lineHeight: 1.45 }),
        T({ x: 80, y: 1235, w: 920, h: 50, text: "Bloom · Học tiếng Hàn", fontSize: 30, color: "#94a3b8", weight: 500, align: "center" }),
      ],
    }),
  },
  {
    name: "Lịch học tuần",
    cat: "Học tập",
    make: () => {
      const days = [
        ["Thứ 2", "Đọc hiểu tiếng Hàn · 7:30\nPhòng B204"],
        ["Thứ 3", "Ngữ pháp trung cấp · 9:30\nPhòng A101"],
        ["Thứ 4", "Luyện nghe TOPIK · 13:00\nThư viện tầng 3"],
        ["Thứ 5", "Văn hóa Hàn Quốc · 7:30\nHội trường C"],
        ["Thứ 6", "Viết luận · 15:00\nPhòng B210"],
        ["Thứ 7", "Học nhóm CLB · 9:00\nQuán cà phê gần trường"],
      ]
      return {
        name: "Lịch học tuần",
        w: 1080,
        h: 1350,
        bg: { from: "#f0fdf4", to: "#e0f2fe", angle: 160 },
        els: [
          T({ x: 80, y: 70, w: 920, h: 100, text: "Lịch học tuần này", fontSize: 72, color: "#064e3b", weight: 800 }),
          T({ x: 80, y: 170, w: 920, h: 50, text: "Tuần 12 · Học kỳ 1", fontSize: 34, color: "#0f766e", weight: 500 }),
          ...days.flatMap(([d, c], i) => [
            R({ x: 80, y: 260 + i * 170, w: 920, h: 150, fill: "#ffffff", opacity: 0.95, radius: 32 }),
            R({ x: 110, y: 295 + i * 170, w: 160, h: 80, fill: i % 2 ? "#0ea5e9" : "#10b981", radius: 40 }),
            T({ x: 110, y: 314 + i * 170, w: 160, h: 50, text: d, fontSize: 34, color: "#ffffff", weight: 700, align: "center" }),
            T({ x: 300, y: 285 + i * 170, w: 670, h: 100, text: c, fontSize: 34, color: "#134e4a", weight: 600, lineHeight: 1.4 }),
          ]),
        ],
      }
    },
  },
  {
    name: "Bìa tiểu luận",
    cat: "Học tập",
    make: () => ({
      name: "Bìa tiểu luận",
      w: 1240,
      h: 1754,
      bg: { from: "#ffffff", to: "#ffffff", angle: 135 },
      els: [
        R({ x: 0, y: 0, w: 1240, h: 18, fill: "#1e3a8a", radius: 0 }),
        T({ x: 100, y: 140, w: 1040, h: 130, text: "TRƯỜNG ĐẠI HỌC KHOA HỌC XÃ HỘI VÀ NHÂN VĂN\nKHOA HÀN QUỐC HỌC", fontSize: 38, color: "#1e3a8a", weight: 700, align: "center", lineHeight: 1.6 }),
        R({ x: 520, y: 300, w: 200, h: 4, fill: "#1e3a8a", radius: 2 }),
        T({ x: 100, y: 560, w: 1040, h: 80, text: "TIỂU LUẬN CUỐI KỲ", fontSize: 50, color: "#64748b", weight: 700, align: "center" }),
        T({ x: 100, y: 660, w: 1040, h: 340, text: "Ảnh hưởng của làn sóng Hallyu\nđến việc học tiếng Hàn\ncủa sinh viên Việt Nam", fontSize: 70, color: "#0f172a", weight: 700, align: "center", font: "serif", lineHeight: 1.3 }),
        T({ x: 320, y: 1180, w: 640, h: 300, text: "Sinh viên: Nguyễn Thúy Ngân\nMSSV: 2201xxxx\nLớp: HQH-K22\nGiảng viên: ThS. Nguyễn Văn A", fontSize: 38, color: "#334155", weight: 500, lineHeight: 1.7 }),
        T({ x: 100, y: 1600, w: 1040, h: 60, text: "TP. Hồ Chí Minh, 2026", fontSize: 36, color: "#64748b", weight: 500, align: "center" }),
        R({ x: 0, y: 1736, w: 1240, h: 18, fill: "#1e3a8a", radius: 0 }),
      ],
    }),
  },
  {
    name: "Slide tiêu đề",
    cat: "Thuyết trình",
    make: () => ({
      name: "Slide tiêu đề",
      w: 1920,
      h: 1080,
      bg: { from: "#f5f3ff", to: "#e0f2fe", angle: 135 },
      els: [
        R({ x: 140, y: 380, w: 16, h: 300, fill: "#7c3aed", radius: 8 }),
        T({ x: 200, y: 360, w: 1400, h: 220, text: "Tên bài thuyết trình", fontSize: 110, color: "#1e1b4b", weight: 700, font: "serif" }),
        T({ x: 200, y: 580, w: 1400, h: 100, text: "Môn học · Nhóm 3 · Tháng 11/2026", fontSize: 44, color: "#6d28d9", weight: 500 }),
        C({ x: 1500, y: 640, w: 520, h: 520, fill: "#c4b5fd", opacity: 0.35 }),
      ],
    }),
  },
  {
    name: "Slide ba ý chính",
    cat: "Thuyết trình",
    make: () => {
      const cards = [
        ["#7c3aed", "Tư duy linh hoạt", "Chuyển đổi giữa hai ngôn ngữ giúp não bộ quen với việc đổi góc nhìn."],
        ["#db2777", "Cơ hội nghề nghiệp", "Doanh nghiệp Hàn Quốc tại Việt Nam luôn cần nhân sự song ngữ."],
        ["#0284c7", "Hiểu văn hóa", "Ngôn ngữ mở cửa vào phim ảnh, văn học và cách nghĩ của người bản xứ."],
      ]
      return {
        name: "Slide ba ý chính",
        w: 1920,
        h: 1080,
        bg: { from: "#ffffff", to: "#f5f3ff", angle: 160 },
        els: [
          T({ x: 140, y: 100, w: 1640, h: 120, text: "Ba lợi ích của việc học song ngữ", fontSize: 80, color: "#1e1b4b", weight: 800 }),
          R({ x: 140, y: 235, w: 120, h: 8, fill: "#7c3aed", radius: 4 }),
          ...cards.flatMap(([c, t, b], i) => {
            const x = 140 + i * 560
            return [
              R({ x, y: 330, w: 520, h: 600, fill: "#ffffff", radius: 40, shadow: true }),
              C({ x: x + 50, y: 380, w: 110, h: 110, fill: c }),
              T({ x: x + 50, y: 400, w: 110, h: 75, text: String(i + 1), fontSize: 60, color: "#ffffff", weight: 800, align: "center" }),
              T({ x: x + 50, y: 530, w: 420, h: 70, text: t, fontSize: 46, color: "#1e293b", weight: 700 }),
              T({ x: x + 50, y: 615, w: 420, h: 260, text: b, fontSize: 32, color: "#475569", weight: 400, lineHeight: 1.5 }),
            ]
          }),
        ],
      }
    },
  },
  {
    name: "Slide so sánh 2 luận điểm",
    cat: "Thuyết trình",
    make: () => ({
      name: "Slide so sánh đối chiếu",
      w: 1920,
      h: 1080,
      bg: { from: "#f8fafc", to: "#f1f5f9", angle: 135 },
      els: [
        T({ x: 140, y: 90, w: 1640, h: 100, text: "So sánh & Đối chiếu luận điểm", fontSize: 76, color: "#0f172a", weight: 800 }),
        R({ x: 140, y: 200, w: 100, h: 6, fill: "#0ea5e9", radius: 3 }),
        // Column A
        R({ x: 140, y: 260, w: 790, h: 720, fill: "#ffffff", radius: 36, shadow: true }),
        R({ x: 140, y: 260, w: 790, h: 110, fill: "#0284c7", radius: 36 }),
        R({ x: 140, y: 330, w: 790, h: 40, fill: "#0284c7", radius: 0 }),
        T({ x: 190, y: 285, w: 690, h: 60, text: "Phương án A · Truyền thống", fontSize: 44, color: "#ffffff", weight: 700 }),
        T({
          x: 190,
          y: 410,
          w: 690,
          h: 520,
          text: "• Dễ tiếp cận và quen thuộc với người học\n• Quy trình rõ ràng, ít phụ thuộc vào công nghệ\n• Chi phí đầu tư ban đầu thấp\n\nTuy nhiên:\n• Tốn nhiều thời gian tổng hợp thủ công\n• Khó cá nhân hóa lộ trình học cho từng bạn",
          fontSize: 34,
          color: "#334155",
          weight: 400,
          lineHeight: 1.6,
        }),
        // Column B
        R({ x: 990, y: 260, w: 790, h: 720, fill: "#ffffff", radius: 36, shadow: true }),
        R({ x: 990, y: 260, w: 790, h: 110, fill: "#8b5cf6", radius: 36 }),
        R({ x: 990, y: 330, w: 790, h: 40, fill: "#8b5cf6", radius: 0 }),
        T({ x: 1040, y: 285, w: 690, h: 60, text: "Phương án B · Ứng dụng AI", fontSize: 44, color: "#ffffff", weight: 700 }),
        T({
          x: 1040,
          y: 410,
          w: 690,
          h: 520,
          text: "• Tự động bóc tách lỗi và gợi ý giải thích tức thì\n• Thích ứng theo tốc độ ghi nhớ của người học (SM-2)\n• Tăng 40% hiệu suất ôn tập từ vựng\n\nLưu ý:\n• Cần người học tự rèn luyện tính kỷ luật\n• Không lạm dụng làm thay tư duy phản biện",
          fontSize: 34,
          color: "#334155",
          weight: 400,
          lineHeight: 1.6,
        }),
      ],
    }),
  },
  {
    name: "Slide trích dẫn học thuật",
    cat: "Thuyết trình",
    make: () => ({
      name: "Slide trích dẫn học thuật",
      w: 1920,
      h: 1080,
      bg: { from: "#0f172a", to: "#1e1b4b", angle: 150 },
      els: [
        C({ x: 1400, y: 100, w: 600, h: 600, fill: "#6366f1", opacity: 0.15 }),
        T({ x: 180, y: 160, w: 240, h: 240, text: "“", fontSize: 280, color: "#a5b4fc", weight: 800, font: "serif" }),
        T({
          x: 180,
          y: 380,
          w: 1560,
          h: 380,
          text: "Ngôn ngữ không chỉ là công cụ để truyền đạt suy nghĩ, mà chính ngôn ngữ định hình cách chúng ta cảm nhận và tư duy về thế giới.",
          fontSize: 66,
          color: "#ffffff",
          weight: 600,
          font: "serif",
          lineHeight: 1.45,
        }),
        R({ x: 180, y: 780, w: 120, h: 6, fill: "#a5b4fc", radius: 3 }),
        T({ x: 180, y: 810, w: 1560, h: 60, text: "Giả thuyết Sapir-Whorf · Ngôn ngữ học tri nhận", fontSize: 38, color: "#c7d2fe", weight: 500 }),
        T({ x: 180, y: 870, w: 1560, h: 50, text: "Trích từ: Language, Thought, and Reality (MIT Press)", fontSize: 32, color: "#94a3b8", italic: true }),
      ],
    }),
  },
  {
    name: "Slide 3 số liệu thống kê",
    cat: "Thuyết trình",
    make: () => ({
      name: "Slide số liệu thống kê",
      w: 1920,
      h: 1080,
      bg: { from: "#ffffff", to: "#f8fafc", angle: 135 },
      els: [
        T({ x: 140, y: 100, w: 1640, h: 100, text: "Các phát hiện nghiên cứu nổi bật", fontSize: 76, color: "#0f172a", weight: 800 }),
        R({ x: 140, y: 210, w: 100, h: 6, fill: "#6366f1", radius: 3 }),
        // Metric 1
        R({ x: 140, y: 320, w: 520, h: 600, fill: "#eef2ff", radius: 36 }),
        T({ x: 180, y: 400, w: 440, h: 160, text: "87%", fontSize: 130, color: "#4338ca", weight: 800, align: "center" }),
        T({ x: 180, y: 580, w: 440, h: 80, text: "Tỷ lệ nhớ từ vựng", fontSize: 44, color: "#1e1b4b", weight: 700, align: "center" }),
        T({ x: 180, y: 670, w: 440, h: 180, text: "Người học duy trì ôn tập đều đặn qua thuật toán lặp lại ngắt quãng (SM-2) sau 30 ngày.", fontSize: 30, color: "#475569", weight: 400, align: "center", lineHeight: 1.5 }),
        // Metric 2
        R({ x: 700, y: 320, w: 520, h: 600, fill: "#f0fdf4", radius: 36 }),
        T({ x: 740, y: 400, w: 440, h: 160, text: "2.4x", fontSize: 130, color: "#15803d", weight: 800, align: "center" }),
        T({ x: 740, y: 580, w: 440, h: 80, text: "Tốc độ viết luận", fontSize: 44, color: "#14532d", weight: 700, align: "center" }),
        T({ x: 740, y: 670, w: 440, h: 180, text: "Tiết kiệm thời gian rà soát ngữ pháp và tra cứu tài liệu tham khảo chuẩn APA.", fontSize: 30, color: "#475569", weight: 400, align: "center", lineHeight: 1.5 }),
        // Metric 3
        R({ x: 1260, y: 320, w: 520, h: 600, fill: "#fdf2f8", radius: 36 }),
        T({ x: 1300, y: 400, w: 440, h: 160, text: "570", fontSize: 130, color: "#be185d", weight: 800, align: "center" }),
        T({ x: 1300, y: 580, w: 440, h: 80, text: "Từ học thuật cốt lõi", fontSize: 44, color: "#831843", weight: 700, align: "center" }),
        T({ x: 1300, y: 670, w: 440, h: 180, text: "Theo danh mục Cambridge Academic Word List (AWL) xuất hiện trong mọi bài báo khoa học.", fontSize: 30, color: "#475569", weight: 400, align: "center", lineHeight: 1.5 }),
      ],
    }),
  },
  {
    name: "Slide quy trình 4 bước",
    cat: "Thuyết trình",
    make: () => {
      const steps = [
        ["01", "Khảo sát", "Thu thập dữ liệu và phân tích nhu cầu", "#3b82f6"],
        ["02", "Thiết kế", "Xây dựng khung lý thuyết và bài giảng", "#8b5cf6"],
        ["03", "Thử nghiệm", "Ứng dụng vào thực tế giảng dạy", "#ec4899"],
        ["04", "Đánh giá", "Đo lường mức độ cải thiện của sinh viên", "#10b981"],
      ]
      return {
        name: "Slide quy trình 4 bước",
        w: 1920,
        h: 1080,
        bg: { from: "#ffffff", to: "#f8fafc", angle: 135 },
        els: [
          T({ x: 140, y: 100, w: 1640, h: 100, text: "Quy trình triển khai nghiên cứu", fontSize: 76, color: "#0f172a", weight: 800 }),
          R({ x: 140, y: 210, w: 100, h: 6, fill: "#3b82f6", radius: 3 }),
          R({ x: 180, y: 520, w: 1560, h: 8, fill: "#e2e8f0", radius: 4 }),
          ...steps.flatMap(([num, title, desc, color], i) => {
            const x = 140 + i * 420
            return [
              R({ x, y: 340, w: 380, h: 560, fill: "#ffffff", radius: 32, shadow: true }),
              C({ x: x + 130, y: 380, w: 120, h: 120, fill: color }),
              T({ x: x + 130, y: 405, w: 120, h: 80, text: num, fontSize: 50, color: "#ffffff", weight: 800, align: "center" }),
              T({ x: x + 30, y: 540, w: 320, h: 70, text: title, fontSize: 44, color: "#1e293b", weight: 700, align: "center" }),
              T({ x: x + 30, y: 620, w: 320, h: 200, text: desc, fontSize: 30, color: "#64748b", weight: 400, align: "center", lineHeight: 1.5 }),
            ]
          }),
        ],
      }
    },
  },
  {
    name: "Slide kết luận & Q&A",
    cat: "Thuyết trình",
    make: () => ({
      name: "Slide kết luận",
      w: 1920,
      h: 1080,
      bg: { from: "#1e1b4b", to: "#312e81", angle: 160 },
      els: [
        C({ x: 200, y: -200, w: 800, h: 800, fill: "#a78bfa", opacity: 0.15 }),
        C({ x: 1400, y: 600, w: 600, h: 600, fill: "#f472b6", opacity: 0.15 }),
        T({ x: 200, y: 320, w: 1520, h: 160, text: "Cảm ơn thầy cô & các bạn đã lắng nghe!", fontSize: 90, color: "#ffffff", weight: 800, align: "center", font: "serif" }),
        T({ x: 200, y: 500, w: 1520, h: 80, text: "Questions & Answers (Q&A)", fontSize: 50, color: "#c7d2fe", weight: 500, align: "center" }),
        R({ x: 860, y: 600, w: 200, h: 6, fill: "#f472b6", radius: 3 }),
        T({ x: 200, y: 650, w: 1520, h: 120, text: "Nguyễn Thúy Ngân · Khoa Hàn Quốc học\nEmail: nguyenthuyngan@email.edu.vn", fontSize: 36, color: "#e0e7ff", weight: 400, align: "center", lineHeight: 1.8 }),
      ],
    }),
  },
  {
    name: "Thẻ từ vựng học thuật AWL",
    cat: "Học tập",
    make: () => ({
      name: "Flashcard Cambridge AWL",
      w: 1080,
      h: 1080,
      bg: { from: "#f0fdf4", to: "#ede9fe", angle: 135 },
      els: [
        R({ x: 80, y: 80, w: 920, h: 920, fill: "#ffffff", radius: 48, shadow: true }),
        R({ x: 120, y: 120, w: 220, h: 60, fill: "#dbeafe", radius: 30 }),
        T({ x: 120, y: 132, w: 220, h: 40, text: "CAMBRIDGE AWL", fontSize: 26, color: "#1e40af", weight: 700, align: "center" }),
        T({ x: 120, y: 240, w: 840, h: 130, text: "analyze", fontSize: 105, color: "#1e1b4b", weight: 800, font: "serif" }),
        T({ x: 120, y: 370, w: 840, h: 50, text: "/ˈæn.əl.aɪz/ · verb", fontSize: 38, color: "#6b7280", italic: true }),
        R({ x: 120, y: 440, w: 840, h: 4, fill: "#e5e7eb", radius: 2 }),
        T({ x: 120, y: 480, w: 840, h: 100, text: "Định nghĩa:", fontSize: 32, color: "#9ca3af", weight: 700 }),
        T({ x: 120, y: 520, w: 840, h: 120, text: "Phân tích, mổ xẻ dữ liệu hoặc bản chất của vấn đề để hiểu sâu sắc hơn.", fontSize: 44, color: "#1f2937", weight: 600, lineHeight: 1.4 }),
        R({ x: 120, y: 680, w: 840, h: 180, fill: "#f9fafb", radius: 24 }),
        T({ x: 150, y: 705, w: 780, h: 130, text: "Ví dụ: Researchers analyzed the survey data to identify key linguistic patterns.", fontSize: 34, color: "#374151", italic: true, lineHeight: 1.5 }),
        T({ x: 120, y: 890, w: 840, h: 50, text: "Collocations: analyze data · critically analyze", fontSize: 30, color: "#6366f1", weight: 600 }),
      ],
    }),
  },
]

/* ---------- Text layout (shared by the canvas renderer and AI fitting) ---------- */

export function wrap(ctx: CanvasRenderingContext2D, s: string, maxW: number) {
  const lines: string[] = []
  for (const para of s.split("\n")) {
    if (!para) {
      lines.push("")
      continue
    }
    let line = ""
    for (const word of para.split(/(\s+)/)) {
      const test = line + word
      if (ctx.measureText(test).width > maxW && line.trim()) {
        lines.push(line.trimEnd())
        line = word.trimStart()
      } else line = test
    }
    lines.push(line)
  }
  return lines
}

export const fontFamily = (e: El) => e.fontFamily ? `${JSON.stringify(e.fontFamily)}, ${FONTS[e.font ?? "sans"]}` : FONTS[e.font ?? "sans"]

export const fontCss = (e: El, size = e.fontSize ?? 48) => `${e.italic ? "italic " : ""}${e.weight ?? 400} ${size}px ${fontFamily(e)}`

/**
 * The model often under-estimates how many lines a heading takes. Shrink text that would
 * overflow its box (or has a word wider than the box) so nothing overlaps; grow the box as a last resort.
 */
export function fitText(d: DesignDraft, avoidOverlap = true): DesignDraft {
  const ctx = document.createElement("canvas").getContext("2d")
  if (!ctx) return d
  const els = d.els.map((e) => {
    if (e.type !== "text" || !e.text) return e
    const orig = e.fontSize ?? 48
    const lh = e.lineHeight ?? 1.25
    let fs = orig
    const fits = (size: number) => {
      ctx.font = fontCss(e, size)
      const widest = Math.max(...e.text!.split(/\s+/).map((w) => ctx.measureText(w).width))
      const lines = wrap(ctx, e.text!, e.w).length
      return { ok: widest <= e.w && lines * size * lh <= e.h * 1.04, need: lines * size * lh }
    }
    let r = fits(fs)
    while (!r.ok && fs > orig * 0.6) {
      fs = Math.floor(fs * 0.94)
      r = fits(fs)
    }
    return { ...e, fontSize: fs, h: r.ok ? e.h : Math.ceil(r.need) }
  })
  return avoidOverlap ? avoidTextOverlap({ ...d, els }, ctx) : { ...d, els }
}

type Box = { x: number; y: number; w: number; h: number }
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))

/** Where the glyphs actually are (a centred heading in a full-width box only covers the middle). */
function inkBox(e: El, ctx: CanvasRenderingContext2D): Box {
  ctx.font = fontCss(e)
  const lines = wrap(ctx, e.text ?? "", e.w)
  const lw = Math.min(e.w, Math.max(0, ...lines.map((l) => ctx.measureText(l).width)))
  const h = lines.length * (e.fontSize ?? 48) * (e.lineHeight ?? 1.25)
  const x = e.align === "center" ? e.x + (e.w - lw) / 2 : e.align === "right" ? e.x + e.w - lw : e.x
  return { x, y: e.y, w: lw, h }
}

/** Move (and if needed shrink) photos/stickers the model placed on top of text. */
function avoidTextOverlap(d: DesignDraft, ctx: CanvasRenderingContext2D): DesignDraft {
  const texts = d.els.filter((e) => e.type === "text").map((e) => inkBox(e, ctx))
  if (!texts.length) return d
  const placed: Box[] = []
  const els = d.els.map((e) => {
    if (e.type !== "image" || e.w * e.h > d.w * d.h * 0.5) return e
    const cost = (b: Box) => texts.reduce((s, t) => s + overlap(b, t), 0) + placed.reduce((s, p) => s + overlap(b, p) * 0.5, 0)
    if (cost(e) < e.w * e.h * 0.02) {
      placed.push(e)
      return e
    }
    const m = Math.round(Math.min(d.w, d.h) * 0.03)
    let best = { ...e, score: Infinity }
    for (const k of [1, 0.85, 0.7, 0.55]) {
      const w = Math.round(e.w * k)
      const h = Math.round(e.h * k)
      const stepX = Math.max(10, Math.round(d.w / 24))
      const stepY = Math.max(10, Math.round(d.h / 24))
      for (let y = m; y <= d.h - h - m; y += stepY)
        for (let x = m; x <= d.w - w - m; x += stepX) {
          const b = { x, y, w, h }
          // Prefer no overlap, then staying big, then staying near where the model wanted it.
          const score = cost(b) * 50 + (1 - k) * e.w * e.h * 0.6 + Math.hypot(x - e.x, y - e.y) * 2
          if (score < best.score) best = { ...e, x, y, w, h, score }
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { score, ...moved } = best
    placed.push(moved)
    return Number.isFinite(score) ? moved : e
  })
  return { ...d, els }
}

/* ---------- AI helpers ---------- */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const hex = (v: unknown, fb: string) => {
  if (typeof v !== "string" || !HEX.test(v.trim())) return fb
  const s = v.trim().toLowerCase()
  return s.length === 4 ? `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}` : s
}
const num = (v: unknown, fb: number, min: number, max: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 100) / 100)) : fb
}

/** Compact JSON of a design for the model; photos become references so no image data is sent. */
export function designForAi(d: DesignDraft) {
  return {
    name: d.name,
    w: d.w,
    h: d.h,
    bg: d.bg,
    els: d.els.map((e, i) =>
      e.type === "image"
        ? { type: "image", ref: `img${i}`, kind: e.cutout ? "sticker" : "photo", ar: Math.round((e.w / e.h) * 100) / 100, x: e.x, y: e.y, w: e.w, h: e.h, rot: e.rot, radius: e.radius, opacity: e.opacity }
        : Object.fromEntries(
            Object.entries(e).filter(([k, v]) => k !== "id" && v !== undefined && !["src", "nw", "nh", "crop", "filters", "flipX", "flipY", "cutout", "origSrc"].includes(k)),
          ),
    ),
  }
}

/** Turn untrusted model output into a valid design. Images may only reuse the user's existing photos. */
export function sanitizeDesign(raw: unknown, base: { w: number; h: number; els?: El[] }): DesignDraft | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const w = num(r.w, base.w, 200, 4000)
  const h = num(r.h, base.h, 200, 4000)
  const bgr = (r.bg ?? {}) as Record<string, unknown>
  const from = hex(bgr.from, "#ffffff")
  const bg: Bg = { from, to: hex(bgr.to, from), angle: num(bgr.angle, 135, 0, 360) }
  const images = new Map<string, El>((base.els ?? []).map((e, i) => [`img${i}`, e] as [string, El]).filter(([, e]) => e.type === "image"))
  const list = Array.isArray(r.els) ? r.els.slice(0, 60) : []
  const els: El[] = []
  for (const item of list) {
    if (!item || typeof item !== "object") continue
    const e = item as Record<string, unknown>
    const type = e.type
    const common = {
      id: uid(),
      x: num(e.x, 0, -w, w * 2),
      y: num(e.y, 0, -h, h * 2),
      w: num(e.w, w / 3, 4, w * 3),
      h: num(e.h, h / 6, 4, h * 3),
      opacity: num(e.opacity, 1, 0.05, 1),
      rot: num(e.rot, 0, 0, 360) || undefined,
      shadow: e.shadow === true || undefined,
    }
    if (type === "text") {
      const t = typeof e.text === "string" ? e.text.slice(0, 600) : ""
      if (!t.trim()) continue
      els.push({
        ...common,
        type: "text",
        text: t,
        fontSize: num(e.fontSize, 48, 8, 600),
        color: hex(e.color, "#1e293b"),
        weight: [400, 500, 600, 700, 800].includes(Number(e.weight)) ? Number(e.weight) : 600,
        italic: e.italic === true || undefined,
        lineHeight: num(e.lineHeight, 1.25, 0.8, 2.5),
        align: e.align === "center" || e.align === "right" ? e.align : "left",
        font: e.font === "serif" ? "serif" : "sans",
      })
    } else if (type === "rect" || type === "circle") {
      els.push({ ...common, type, fill: hex(e.fill, "#ddd6fe"), radius: type === "rect" ? num(e.radius, 0, 0, 2000) : undefined })
    } else if (type === "image" && typeof e.ref === "string" && images.has(e.ref)) {
      const src = images.get(e.ref)!
      // Keep the photo's own aspect ratio whatever box the model chose.
      const ar = src.w / src.h
      const box = { w: common.w, h: Math.round(common.w / ar) }
      els.push({ ...src, ...common, ...box, y: common.y + (common.h - box.h) / 2, id: uid(), radius: src.cutout ? 0 : num(e.radius, src.radius ?? 0, 0, 2000) })
      images.delete(e.ref)
    }
  }
  // Never silently lose one of her photos: anything the model left out goes back underneath.
  images.forEach((img) => els.unshift({ ...img, id: uid() }))
  if (!els.length) return null
  return { name: typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 60) : "Thiết kế AI", w, h, bg, els }
}
