import { z } from "zod"
export const LEARNING_SOURCES = {
  cambridge: {
    name: "Cambridge English · Activities for Learners",
    url: "https://www.cambridgeenglish.org/learning-english/activities-for-learners/",
  },
  council: {
    name: "British Council · LearnEnglish",
    url: "https://learnenglish.britishcouncil.org/",
  },
  sejong: {
    name: "Online King Sejong Institute",
    url: "https://www.iksi.or.kr/lms/main/curriculum.do",
  },
  awl: {
    name: "Academic Word List · Victoria University of Wellington",
    url: "https://www.wgtn.ac.nz/lals/resources/academicwordlist/information",
  },
}
export type LearningUnit = {
  id: string
  lang: "en" | "ko"
  level: string
  title: string
  skill: string
  guide: string
  examples: string[]
  practice: string
  source: keyof typeof LEARNING_SOURCES
}
export const LEARNING_UNITS: LearningUnit[] = [
  {
    id: "en-intro",
    lang: "en",
    level: "A1",
    title: "Kể một chút về mình",
    skill: "speaking",
    guide:
      "Bắt đầu bằng tên, nơi sống hoặc một điều bạn thích. Dùng I am… cho thông tin về mình, I like… cho sở thích.",
    examples: ["I am a student.", "I like reading in the afternoon."],
    practice: "Viết hoặc nói ba câu giới thiệu theo thông tin thật của bạn.",
    source: "cambridge",
  },
  {
    id: "en-routine",
    lang: "en",
    level: "A1–A2",
    title: "Một ngày bình thường",
    skill: "grammar",
    guide:
      "Dùng hiện tại đơn cho việc thường làm. Với he/she/it, động từ thường thêm -s/-es. Câu hỏi dùng do/does.",
    examples: [
      "I read every evening.",
      "She studies Korean. Does she study English too?",
    ],
    practice:
      "Kể một thói quen của bạn và đặt một câu hỏi về thói quen của người khác.",
    source: "council",
  },
  {
    id: "en-past",
    lang: "en",
    level: "A2",
    title: "Kể lại một chuyện nhỏ",
    skill: "grammar",
    guide:
      "Dùng quá khứ đơn cho sự việc đã kết thúc. Khi hỏi hoặc phủ định bằng did, động từ chính trở về dạng gốc.",
    examples: [
      "Yesterday I visited a friend.",
      "I did not go by bus. Did you walk?",
    ],
    practice: "Kể chuyện hôm qua bằng ba câu, có một câu phủ định.",
    source: "council",
  },
  {
    id: "en-vocab",
    lang: "en",
    level: "B1–B2",
    title: "Dùng từ học thuật có ngữ cảnh",
    skill: "vocabulary",
    guide:
      "Học một từ cùng nghĩa trong ngữ cảnh, một cụm đi kèm và một ví dụ của riêng bạn. Phân biệt nghĩa thường dùng và nghĩa trong tài liệu.",
    examples: [
      "assess the evidence",
      "The report assesses the effects of the new policy.",
    ],
    practice:
      "Chọn một từ từ tài liệu bạn đang đọc, giải thích nghĩa và đặt một câu không chép ví dụ.",
    source: "awl",
  },
  {
    id: "en-reading",
    lang: "en",
    level: "B1",
    title: "Đọc để thấy luận điểm",
    skill: "reading",
    guide:
      "Đọc lướt tiêu đề và câu đầu mỗi đoạn, đặt câu hỏi rồi tìm dẫn chứng. Sau đó đóng tài liệu và tự kể lại điều tác giả muốn nói.",
    examples: [
      "Main claim → evidence → limitation",
      "A result can suggest an explanation without proving it.",
    ],
    practice:
      "Chọn một đoạn: ghi luận điểm, bằng chứng và điều tác giả chưa kết luận.",
    source: "cambridge",
  },
  {
    id: "en-listen",
    lang: "en",
    level: "A2–B1",
    title: "Nghe ý chính trước",
    skill: "listening",
    guide:
      "Lượt đầu nghe để đoán tình huống và ý chính. Lượt sau mới tìm chi tiết. Có thể mở bản chữ khi cần đối chiếu.",
    examples: [
      "Could we meet at the library at three? I will bring the notes.",
      "The meeting is in the afternoon, and one person will bring some notes.",
    ],
    practice:
      "Nghe câu đầu rồi kể lại ai hẹn, ở đâu và để làm gì; sau đó so với bản chữ.",
    source: "council",
  },
  {
    id: "en-essay",
    lang: "en",
    level: "B1–B2",
    title: "Từ ý kiến đến một đoạn essay",
    skill: "writing",
    guide:
      "Một đoạn có ý chính, giải thích, dẫn chứng và liên hệ lại luận đề. Dẫn chứng cần có nguồn thật; chừa chỗ nếu chưa tìm được.",
    examples: [
      "Topic sentence → explanation → evidence → link",
      "One possible benefit is… This matters because…",
    ],
    practice:
      "Viết 100–150 từ về một chủ đề bạn quan tâm. Nêu một lý do và một giới hạn cho ý kiến của mình.",
    source: "cambridge",
  },
  {
    id: "en-argument",
    lang: "en",
    level: "B2",
    title: "Cân nhắc hai góc nhìn",
    skill: "writing",
    guide:
      "Tách quan điểm của mình khỏi bằng chứng. Trình bày phản biện công bằng rồi giải thích vì sao mình giữ hoặc điều chỉnh lập trường.",
    examples: [
      "Although this approach may…, it also…",
      "The available evidence does not yet establish…",
    ],
    practice: "Chọn một ý kiến và viết hai câu: một ủng hộ, một nêu giới hạn.",
    source: "council",
  },
  {
    id: "ko-intro",
    lang: "ko",
    level: "Nhập môn",
    title: "Chào và giới thiệu",
    skill: "speaking",
    guide:
      "Dùng 안녕하세요 khi chào lịch sự. Giới thiệu bằng 저는 …이에요/예요. Danh từ có phụ âm cuối dùng 이에요, không có phụ âm cuối dùng 예요.",
    examples: [
      "안녕하세요. 저는 학생이에요.",
      "저는 응안이에요. 만나서 반가워요.",
    ],
    practice: "Thay tên và thông tin của bạn vào một lời giới thiệu ngắn.",
    source: "sejong",
  },
  {
    id: "ko-particles",
    lang: "ko",
    level: "Sơ cấp",
    title: "Tìm vai trò của tiểu từ",
    skill: "grammar",
    guide:
      "은/는 thường đánh dấu chủ đề, 이/가 đánh dấu chủ ngữ, 을/를 đánh dấu đối tượng của hành động. Cần đọc trong ngữ cảnh, không thay thế máy móc.",
    examples: ["저는 책을 읽어요.", "친구가 와요."],
    practice: "Viết một câu về việc bạn làm, chỉ ra chủ đề và đối tượng.",
    source: "sejong",
  },
  {
    id: "ko-day",
    lang: "ko",
    level: "Sơ cấp",
    title: "Nói về sinh hoạt",
    skill: "vocabulary",
    guide:
      "Học từ theo tình huống thay vì một danh sách rời. Kết hợp động từ với đồ vật, nơi chốn hoặc thời gian thường đi cùng.",
    examples: ["도서관에서 공부해요.", "저녁에 친구를 만나요."],
    practice:
      "Kể hai việc bạn làm trong một ngày và hỏi lại người đối thoại một câu.",
    source: "sejong",
  },
  {
    id: "ko-listen",
    lang: "ko",
    level: "Sơ cấp",
    title: "Nghe một lời hẹn",
    skill: "listening",
    guide:
      "Nghe để tìm thời gian, địa điểm và hành động. Có thể nghe chậm rồi nghe lại ở tốc độ thường.",
    examples: ["내일 오후 세 시에 도서관에서 만나요.", "책을 가져올게요."],
    practice:
      "Nghe ví dụ, thử nói lại thời gian và nơi gặp trước khi nhìn chữ.",
    source: "sejong",
  },
  {
    id: "ko-reading",
    lang: "ko",
    level: "Sơ cấp–Trung cấp",
    title: "Đọc một đoạn ngắn",
    skill: "reading",
    guide:
      "Tìm từ khóa và đuôi câu trước, sau đó xem mối liên hệ giữa các câu. Ghi lại điều hiểu chắc và chỗ còn phân vân.",
    examples: [
      "오늘은 비가 와요. 그래서 집에서 책을 읽어요.",
      "날씨가 좋으면 산책하고 싶어요.",
    ],
    practice:
      "Tóm tắt tình huống bằng tiếng Việt rồi viết một câu tiếng Hàn diễn đạt lại.",
    source: "sejong",
  },
  {
    id: "ko-writing",
    lang: "ko",
    level: "Trung cấp",
    title: "Viết có mạch liên kết",
    skill: "writing",
    guide:
      "Nêu ý chính trước, dùng từ nối hợp lý và giữ nhất quán đuôi câu. Không cần viết dài khi chưa rõ ý.",
    examples: ["제 생각에는… 왜냐하면…", "하지만 다른 관점도 있어요."],
    practice:
      "Viết 5–7 câu về một việc bạn muốn thử, có lý do và một điều cần cân nhắc.",
    source: "sejong",
  },
]
export const tutorSchema = z
  .object({
    reply: z.string().min(1).max(6500),
    translation: z.string().max(4000),
    feedback: z
      .array(
        z.object({
          original: z.string().max(1000),
          suggested: z.string().max(1200),
          why: z.string().max(1800),
        }),
      )
      .max(8),
    next: z.string().max(1800),
  })
  .strict()
export function recallInterval(
  grade: "again" | "familiar" | "easy",
  box: number,
) {
  return grade === "again"
    ? { box: 0, days: 0 }
    : grade === "familiar"
      ? {
          box: Math.min(box + 1, 6),
          days: [1, 2, 4, 7, 15, 30, 60][Math.min(box + 1, 6)],
        }
      : {
          box: Math.min(box + 2, 6),
          days: [1, 2, 4, 7, 15, 30, 60][Math.min(box + 2, 6)],
        }
}
