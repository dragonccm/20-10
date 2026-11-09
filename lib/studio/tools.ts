import { Briefcase, FolderOpen, Languages, Palette, PenLine, ScanSearch, Search, type LucideIcon } from "lucide-react"
import type { GuideSpec } from "@/components/studio/ui"

export type Tool = { slug: string; name: string; short: string; desc: string; icon: LucideIcon; tint: string; guide: GuideSpec }

export const TOOLS: Tool[] = [
  {
    slug: "documents",
    name: "Tài liệu của tôi",
    short: "Tài liệu",
    desc: "Tải lên essay, CV, slide, PDF hay ảnh chụp. AI nhận xét, tóm tắt, hỏi đáp, tạo câu ôn tập và chuyển sang công cụ khác.",
    icon: FolderOpen,
    tint: "bg-indigo-100 text-indigo-600",
    guide: {
      id: "documents",
      steps: [
        "Kéo thả hoặc bấm Chọn tệp để tải lên PDF, Word, PowerPoint hay ảnh chụp tài liệu.",
        "Kiểm tra ô “Đây là” (bài luận, CV, slide...). Web tự đoán, sai thì đổi lại.",
        "Dùng các tab AI nhận xét, Hỏi đáp, Ôn tập để AI đọc và giúp bạn hiểu tài liệu.",
        "Muốn sửa tiếp thì bấm nút tím ở “Chuyển sang công cụ”: mở trong trang Viết bài, trình tạo CV hoặc Thiết kế.",
      ],
      tip: "Tệp chỉ được đọc ngay trên máy này. Chỉ phần chữ được gửi cho AI khi bạn bấm một nút AI.",
    },
  },
  {
    slug: "writing",
    name: "Viết bài",
    short: "Viết",
    desc: "Soạn và sửa essay: AI sửa từng lỗi kèm giải thích, tìm nguồn trích dẫn cho đoạn văn, xuất Word/PDF.",
    icon: PenLine,
    tint: "bg-rose-100 text-rose-600",
    guide: {
      id: "writing",
      steps: [
        "Bấm “Bài mới” để viết, hoặc “Nhập tệp” để mở bài có sẵn (Word, PDF). Bài tự lưu liên tục.",
        "Tab Sửa lỗi: AI chỉ ra từng lỗi kèm lý do, bạn chọn Áp dụng hoặc Bỏ qua.",
        "Tab Trích dẫn: bấm vào đoạn văn cần nguồn rồi bấm Tìm nguồn, chọn bài báo và Chèn trích dẫn.",
        "Tab Xuất: tải bài về Word hoặc PDF để nộp.",
      ],
      tip: "Bôi đen một đoạn rồi vào tab Trợ lý để viết lại học thuật hơn hoặc dịch.",
    },
  },
  {
    slug: "research",
    name: "Thư viện nguồn",
    short: "Nguồn",
    desc: "Tìm bài báo khoa học theo tên hoặc DOI, lưu vào thư viện và lấy danh mục tài liệu tham khảo theo APA, MLA...",
    icon: Search,
    tint: "bg-sky-100 text-sky-600",
    guide: {
      id: "research",
      steps: [
        "Tìm bài báo: gõ tên bài, tác giả, từ khóa tiếng Anh hoặc dán DOI rồi bấm Tìm.",
        "Bấm Lưu ở bài bạn sẽ dùng. Bài được giữ trong Thư viện của bạn.",
        "Vào tab “3. Lấy danh mục”, chọn kiểu trích dẫn (APA, MLA...) ở góc trên rồi bấm Sao chép để dán vào cuối bài.",
      ],
      tip: "Đang viết mà chưa biết đoạn nào cần nguồn? Dùng trang Viết bài, tab Trích dẫn: AI tự chỉ ra ý cần nguồn và tìm bài phù hợp.",
    },
  },
  {
    slug: "originality",
    name: "Kiểm tra trước khi nộp",
    short: "Kiểm tra",
    desc: "Rà lần cuối trước khi nộp: trích dẫn có khớp danh mục không, có đoạn nào chép nguyên văn nguồn không, văn phong đủ học thuật chưa.",
    icon: ScanSearch,
    tint: "bg-amber-100 text-amber-600",
    guide: {
      id: "originality",
      steps: [
        "Bấm “Lấy bài đang viết” để chọn bài từ trang Viết bài, hoặc dán bài vào ô lớn (nên dán cả mục References ở cuối).",
        "Tab 1: xem trích dẫn nào thiếu trong danh mục, nguồn nào ghi mà chưa trích. Dấu vàng là chỗ cần sửa.",
        "Tab 2: dán đoạn gốc của bài báo bạn đã đọc, web tô vàng chỗ bạn chép nguyên văn để diễn đạt lại.",
        "Tab 3: tìm câu quá dài, từ thân mật, từ lặp; bấm Nhận xét bài viết để AI góp ý thêm.",
      ],
      tip: "Nên làm bước này ngay trước khi nộp bài. Không cần làm đủ cả 3 tab, chọn tab bạn cần.",
    },
  },
  {
    slug: "korean",
    name: "Học tiếng Hàn",
    short: "Tiếng Hàn",
    desc: "Ôn từ vựng mỗi ngày bằng thẻ lật, nghe phát âm, bảng tiểu từ và AI sửa câu tiếng Hàn.",
    icon: Languages,
    tint: "bg-violet-100 text-violet-600",
    guide: {
      id: "korean",
      steps: [
        "Tab Ôn tập: mỗi ngày ôn các thẻ đến hạn. Bấm thẻ để lật, rồi chọn Quên, Khó, Nhớ hoặc Dễ.",
        "Tab Bộ thẻ: thêm từ mới, hoặc chụp ảnh trang sách để AI tự lấy từ vựng.",
        "Tab Kiểm tra câu: viết câu tiếng Hàn, AI sửa và giải thích tiểu từ, ngữ pháp.",
      ],
      tip: "Thẻ nhớ tốt sẽ giãn dần 1, 2, 4, 7... ngày. Chỉ cần ôn đều mỗi ngày một ít.",
    },
  },
  {
    slug: "career",
    name: "CV & xin việc",
    short: "Xin việc",
    desc: "Tạo CV Việt/Anh/Hàn với nhiều mẫu đẹp và xuất PDF, viết thư xin việc, luyện phỏng vấn.",
    icon: Briefcase,
    tint: "bg-emerald-100 text-emerald-600",
    guide: {
      id: "career",
      steps: [
        "Đã có CV? Bấm “Nhập CV có sẵn” để AI điền sẵn. Chưa có thì điền từng mục bên dưới.",
        "Chọn một mẫu CV, hoặc mô tả mẫu bạn thích để AI tạo mẫu mới.",
        "Xem bản xem trước bên phải, bấm Tải PDF khi đã ưng.",
        "Tab Thư xin việc và Luyện phỏng vấn để chuẩn bị tiếp.",
      ],
    },
  },
  {
    slug: "creative",
    name: "Thiết kế",
    short: "Thiết kế",
    desc: "Làm poster, slide, thiệp, thẻ từ vựng từ mẫu có sẵn hoặc nhờ AI, kéo thả, xóa nền ảnh và xuất PNG.",
    icon: Palette,
    tint: "bg-pink-100 text-pink-600",
    guide: {
      id: "creative",
      steps: [
        "Bấm “Thiết kế mới”: mô tả cho AI tạo, chọn một mẫu có sẵn, hoặc nhập slide PowerPoint/PDF.",
        "Bấm vào chữ, ảnh, khối để sửa ở bảng bên phải. Kéo để di chuyển, kéo chấm tím để đổi cỡ.",
        "Thêm ảnh bằng nút Ảnh; chọn ảnh rồi bấm Tự động để xóa nền thành sticker.",
        "Bấm PNG hoặc JPG ở góc trên để tải về.",
      ],
      tip: "Bấm “Chỉnh bằng AI” rồi nói điều cần đổi, ví dụ “đổi sang tông xanh mint”. Ctrl+Z để hoàn tác.",
    },
  },
]
