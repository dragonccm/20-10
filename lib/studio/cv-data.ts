export type Lang = "vi" | "en" | "ko"
export type Edu = { id: string; school: string; degree: string; from: string; to: string; detail: string }
export type Exp = { id: string; org: string; role: string; from: string; to: string; bullets: string }
export type Proj = { id: string; name: string; detail: string }
export type Lng = { id: string; name: string; level: string }

export type CvLayout = "classic" | "banner" | "sidebar" | "timeline" | "minimal" | "split" | "korean"
export type CvTheme = {
  name: string
  layout: CvLayout
  side: "left" | "right"
  accent: string
  ink: string
  paper: string
  panel: string
  panel2: string
  panelInk: string
  font: "sans" | "serif" | "mix"
  heading: "underline" | "bar" | "pill" | "caps" | "dot"
  density: "compact" | "normal" | "airy"
  photo: "none" | "circle" | "rounded" | "square"
  skills: "tags" | "list" | "text"
}

export type CV = {
  lang: Lang
  accent: string
  theme?: CvTheme
  photo?: string
  name: string
  title: string
  email: string
  phone: string
  location: string
  link: string
  summary: string
  education: Edu[]
  experience: Exp[]
  projects: Proj[]
  skills: string
  languages: Lng[]
  certificates: string
}

export const EMPTY_CV: CV = {
  lang: "vi",
  accent: "#7c3aed",
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  link: "",
  summary: "",
  education: [],
  experience: [],
  projects: [],
  skills: "",
  languages: [],
  certificates: "",
}

export const SAMPLE_CV: CV = {
  ...EMPTY_CV,
  name: "Nguyễn Thúy Ngân",
  title: "Thực tập sinh Biên phiên dịch tiếng Hàn",
  email: "ngan.nguyen@email.com",
  phone: "0901 234 567",
  location: "TP. Hồ Chí Minh",
  link: "linkedin.com/in/thuyngan",
  summary:
    "Sinh viên năm 3 ngành Ngôn ngữ Hàn Quốc, TOPIK 5. Có kinh nghiệm phiên dịch cho sự kiện giao lưu văn hóa và hỗ trợ đối tác Hàn Quốc. Cẩn thận, chủ động và mong muốn phát triển trong lĩnh vực biên phiên dịch thương mại.",
  education: [{ id: "e1", school: "Trường ĐH Khoa học Xã hội và Nhân văn", degree: "Cử nhân Ngôn ngữ Hàn Quốc", from: "2023", to: "", detail: "GPA 3.6/4 · Học bổng khuyến khích học tập 2 kỳ" }],
  experience: [
    { id: "x1", org: "Công ty TNHH ABC Vina", role: "Thực tập sinh phiên dịch", from: "06/2025", to: "09/2025", bullets: "Phiên dịch Hàn–Việt cho 12 buổi họp với đối tác\nDịch 40+ tài liệu kỹ thuật và hợp đồng\nHỗ trợ đón tiếp đoàn khách 15 người" },
    { id: "x2", org: "CLB Tiếng Hàn", role: "Trưởng ban truyền thông", from: "2024", to: "", bullets: "Tổ chức 3 sự kiện văn hóa, mỗi sự kiện 200+ người\nQuản lý fanpage tăng 2.000 người theo dõi" },
  ],
  projects: [{ id: "p1", name: "Dự án dịch phụ đề phim tài liệu", detail: "Dịch và căn phụ đề cho 5 tập phim tài liệu về văn hóa Hàn Quốc." }],
  skills: "Biên phiên dịch, MS Office, Canva, Thuyết trình, Làm việc nhóm",
  languages: [
    { id: "l1", name: "Tiếng Hàn", level: "TOPIK 5" },
    { id: "l2", name: "Tiếng Anh", level: "IELTS 6.5" },
  ],
  certificates: "TOPIK cấp 5 (2025)\nChứng chỉ Tin học văn phòng MOS",
}

const base = { side: "left" as const, ink: "#1e293b", paper: "#ffffff", panel2: "", density: "normal" as const, photo: "circle" as const, skills: "text" as const }

export const CV_THEMES: CvTheme[] = [
  { ...base, name: "Thanh lịch", layout: "classic", accent: "#7c3aed", panel: "#f5f3ff", panelInk: "#1e293b", font: "sans", heading: "underline" },
  { ...base, name: "Banner hồng", layout: "banner", accent: "#db2777", panel: "#db2777", panel2: "#9333ea", panelInk: "#ffffff", font: "sans", heading: "bar", skills: "tags" },
  { ...base, name: "Sidebar tím", layout: "sidebar", accent: "#6d28d9", panel: "#4c1d95", panel2: "#6d28d9", panelInk: "#f5f3ff", font: "sans", heading: "caps", skills: "tags" },
  { ...base, name: "Xanh chuyên nghiệp", layout: "sidebar", side: "right", accent: "#0369a1", panel: "#e0f2fe", panelInk: "#0c4a6e", font: "sans", heading: "underline", photo: "rounded", skills: "list" },
  { ...base, name: "Dòng thời gian", layout: "timeline", accent: "#059669", panel: "#ecfdf5", panelInk: "#064e3b", font: "sans", heading: "dot", skills: "tags" },
  { ...base, name: "Tối giản cổ điển", layout: "minimal", accent: "#334155", panel: "#f8fafc", panelInk: "#0f172a", font: "serif", heading: "caps", photo: "none", density: "airy" },
  { ...base, name: "Hiện đại hai cột", layout: "split", accent: "#0284c7", panel: "#f0f9ff", panelInk: "#0c4a6e", font: "sans", heading: "pill", skills: "tags" },
  { ...base, name: "이력서 Hàn Quốc", layout: "korean", accent: "#1e3a8a", panel: "#eff6ff", panelInk: "#1e3a8a", font: "sans", heading: "bar", photo: "square", density: "compact" },
  { ...base, name: "Pastel Seoul", layout: "banner", accent: "#c026d3", panel: "#fce7f3", panel2: "#ede9fe", panelInk: "#701a75", font: "mix", heading: "pill", skills: "tags" },
  { ...base, name: "Đêm xanh vàng kim", layout: "sidebar", accent: "#b45309", panel: "#0f172a", panel2: "#1e293b", panelInk: "#fde68a", font: "mix", heading: "bar", skills: "list" },
  { ...base, name: "Gọn một trang", layout: "classic", accent: "#e11d48", panel: "#fff1f2", panelInk: "#1e293b", font: "sans", heading: "bar", density: "compact", photo: "none", skills: "tags" },
  { ...base, name: "Sang trọng serif", layout: "split", accent: "#9f1239", panel: "#fff7ed", panelInk: "#431407", font: "serif", heading: "underline", photo: "circle", density: "airy" },
  { ...base, name: "Học thuật Oxford", layout: "classic", accent: "#173c58", panel: "#eef3f6", panelInk: "#173c58", font: "serif", heading: "underline", photo: "none", density: "airy" },
  { ...base, name: "Creative terracotta", layout: "banner", accent: "#a84b31", panel: "#f6e9de", panelInk: "#522a22", font: "mix", heading: "caps", photo: "rounded", skills: "list" },
  { ...base, name: "Product designer", layout: "split", accent: "#156d67", panel: "#edf6f2", panelInk: "#164a45", font: "sans", heading: "bar", photo: "rounded", skills: "tags" },
  { ...base, name: "Kỹ thuật ATS", layout: "minimal", accent: "#242d38", panel: "#f3f5f7", panelInk: "#242d38", font: "sans", heading: "underline", photo: "none", density: "compact", skills: "text" },
  { ...base, name: "Luật & tư vấn", layout: "classic", accent: "#654c3e", panel: "#f8f4ed", panelInk: "#443025", font: "serif", heading: "caps", photo: "none", skills: "list" },
  { ...base, name: "Chuyên gia dữ liệu", layout: "sidebar", side: "right", accent: "#3655a4", panel: "#1e2c50", panelInk: "#ffffff", font: "sans", heading: "dot", photo: "none", density: "compact", skills: "tags" },
  { ...base, name: "Giảng viên & nghiên cứu", layout: "timeline", accent: "#527049", panel: "#f0f5eb", panelInk: "#33472d", font: "mix", heading: "underline", photo: "circle", skills: "list" },
  { ...base, name: "이력서 hiện đại", layout: "korean", accent: "#6a4a84", panel: "#f5f0f8", panelInk: "#4b325e", font: "sans", heading: "bar", photo: "square", skills: "text" },
]
