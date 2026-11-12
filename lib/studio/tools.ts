import { Briefcase, FolderOpen, Languages, Palette, PenLine, ScanSearch, Search, type LucideIcon } from "lucide-react"
import type { GuideSpec } from "@/components/studio/ui"

export type Tool = { slug: string; name: string; short: string; desc: string; icon: LucideIcon; tint: string; guide: GuideSpec }

export const TOOLS: Tool[] = [
 {slug:"helpers",name:"Những việc nhỏ",short:"Việc nhỏ",desc:"Soạn email, đổi tên và định dạng file, điền mẫu Word hoặc chọn một khoảng tập trung.",icon:FolderOpen,tint:"bg-teal-100 text-teal-700",guide:{id:"helpers",steps:["Chọn việc bạn đang cần.","Xem trước và tải một bản mới; file gốc vẫn được giữ.","Email chỉ là bản nháp để bạn đọc và tự gửi."]}},
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
    name: "Xem lại bài cùng mình",
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
    name: "Một chút ngoại ngữ",
    short: "Ngoại ngữ",
    desc: "Ôn từ vựng tiếng Hàn & tiếng Anh học thuật AWL bằng thẻ lặp lại ngắt quãng, nghe phát âm và AI kiểm tra câu.",
    icon: Languages,
    tint: "bg-violet-100 text-violet-600",
    guide: {
      id: "korean",
      steps: [
        "Chuyển đổi linh hoạt giữa Tiếng Hàn 🇰🇷 và Tiếng Anh 🇬🇧 (AWL) ở thanh chọn trên cùng.",
        "Tab Ôn tập: chọn lúc bạn muốn xem lại vài từ. Bấm thẻ để lật, nghe phát âm rồi chọn mức độ nhớ.",
        "Tab Bộ thẻ: thêm từ mới hoặc tra cứu kho từ học thuật cốt lõi học thuật.",
        "Tab Ngữ pháp / Collocations: bảng tiểu từ tiếng Hàn và cụm từ học thuật tiếng Anh.",
        "Tab Kiểm tra câu: AI sửa và phân tích ngữ pháp, văn phong học thuật chi tiết.",
      ],
      tip: "Thẻ được sắp xếp để dễ xem lại khi bạn muốn. Bạn có thể dừng bất cứ lúc nào.",
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
    desc: "Kho 240 mẫu Bloom thuộc 12 nhóm: slide, CV, mạng xã hội, ảnh, video, tài liệu, bảng tính, website và nhiều hơn nữa.",
    icon: Palette,
    tint: "bg-pink-100 text-pink-600",
    guide: {
      id: "creative",
      steps: [
        "Chọn một trong 12 nhóm thiết kế, tìm mẫu và mở công cụ phù hợp. Mỗi nhóm có 20 mẫu Bloom nguyên bản.",
        "Bấm vào chữ, ảnh, khối để sửa ở bảng bên phải. Kéo để di chuyển, kéo chấm tím để đổi cỡ.",
        "Thêm ảnh bằng nút Ảnh; chọn ảnh rồi bấm Tự động để xóa nền thành sticker.",
        "Mở Xuất thiết kế để tải PNG, JPG, PowerPoint, JSON hoặc chuẩn bị bản in PDF. Công cụ video, bảng tính và HTML có nút xuất riêng.",
      ],
      tip: "Bấm “Chỉnh bằng AI” rồi nói điều cần đổi, ví dụ “đổi sang tông xanh mint”. Ctrl+Z để hoàn tác.",
    },
  },
]
