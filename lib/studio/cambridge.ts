"use client"

export type EnglishVocab = {
  word: string
  pos: "noun" | "verb" | "adj" | "adv"
  ipa: string
  vi: string
  sublist?: number
  example: string
  collocations?: string[]
}

/**
 * Danh sách từ vựng học thuật chuẩn Cambridge Academic Word List (AWL - Averil Coxhead).
 * Tuyển tập các từ vựng xuất hiện với tần suất cao nhất trong các bài báo nghiên cứu,
 * luận văn và kỳ thi học thuật quốc tế (IELTS/TOEFL/GRE).
 */
export const CAMBRIDGE_AWL: EnglishVocab[] = [
  // Sublist 1 - Cốt lõi thiết yếu
  {
    word: "analyze",
    pos: "verb",
    ipa: "/ˈæn.əl.aɪz/",
    vi: "Phân tích (dữ liệu, cấu trúc, bản chất)",
    sublist: 1,
    example: "Researchers analyzed the survey data to identify key linguistic patterns.",
    collocations: ["analyze data", "analyze in detail", "critically analyze"],
  },
  {
    word: "approach",
    pos: "noun",
    ipa: "/əˈprəʊtʃ/",
    vi: "Cách tiếp cận, phương pháp giải quyết",
    sublist: 1,
    example: "A communicative approach is essential for second-language acquisition.",
    collocations: ["innovative approach", "adopt an approach", "holistic approach"],
  },
  {
    word: "assess",
    pos: "verb",
    ipa: "/əˈses/",
    vi: "Đánh giá, thẩm định (chất lượng, mức độ)",
    sublist: 1,
    example: "The study assessed the effectiveness of digital flashcards in vocabulary retention.",
    collocations: ["assess the impact", "comprehensively assess", "criteria to assess"],
  },
  {
    word: "assume",
    pos: "verb",
    ipa: "/əˈsjuːm/",
    vi: "Giả định, thừa nhận ngầm",
    sublist: 1,
    example: "It is often assumed that immersion is the fastest way to master pronunciation.",
    collocations: ["assume responsibility", "widely assumed that", "reasonable to assume"],
  },
  {
    word: "authority",
    pos: "noun",
    ipa: "/ɔːˈθɒr.ə.ti/",
    vi: "Chuyên gia đầu ngành; thẩm quyền, uy tín học thuật",
    sublist: 1,
    example: "She is a leading authority on applied linguistics and syntax.",
    collocations: ["leading authority on", "recognized authority", "moral authority"],
  },
  {
    word: "concept",
    pos: "noun",
    ipa: "/ˈkɒn.sept/",
    vi: "Khái niệm, ý niệm lý thuyết",
    sublist: 1,
    example: "The concept of linguistic relativity has sparked significant debate.",
    collocations: ["fundamental concept", "grasp a concept", "theoretical concept"],
  },
  {
    word: "consist",
    pos: "verb",
    ipa: "/kənˈsɪst/",
    vi: "Bao gồm, cấu thành từ (đi kèm 'of')",
    sublist: 1,
    example: "The evaluation test consists of four distinct linguistic components.",
    collocations: ["consist of", "largely consist of", "consist primarily in"],
  },
  {
    word: "context",
    pos: "noun",
    ipa: "/ˈkɒn.tekst/",
    vi: "Ngữ cảnh, bối cảnh nghiên cứu",
    sublist: 1,
    example: "Words acquire precise nuances when examined in authentic cultural context.",
    collocations: ["in this context", "historical context", "social context"],
  },
  {
    word: "derive",
    pos: "verb",
    ipa: "/dɪˈraɪv/",
    vi: "Bắt nguồn từ, rút ra từ (đi kèm 'from')",
    sublist: 1,
    example: "Many contemporary terms are derived from classical Latin and Greek roots.",
    collocations: ["derive from", "derive benefits from", "derive satisfaction"],
  },
  {
    word: "distribute",
    pos: "verb",
    ipa: "/dɪˈstrɪb.juːt/",
    vi: "Phân bổ, phân phát (tài liệu, tài nguyên)",
    sublist: 1,
    example: "Surveys were distributed among university students across different semesters.",
    collocations: ["evenly distribute", "distribute questionnaires", "widely distributed"],
  },
  {
    word: "establish",
    pos: "verb",
    ipa: "/ɪˈstæb.lɪʃ/",
    vi: "Thiết lập, chứng minh rõ ràng một luận điểm",
    sublist: 1,
    example: "Previous empirical research has established a strong link between reading and writing fluency.",
    collocations: ["establish a correlation", "firmly establish", "establish guidelines"],
  },
  {
    word: "estimate",
    pos: "verb",
    ipa: "/ˈes.tɪ.meɪt/",
    vi: "Ước lượng, ước tính số liệu",
    sublist: 1,
    example: "Linguists estimate that bilingualism delays cognitive decline by several years.",
    collocations: ["roughly estimate", "conservative estimate", "estimate the cost"],
  },
  {
    word: "evidence",
    pos: "noun",
    ipa: "/ˈev.ɪ.dəns/",
    vi: "Bằng chứng, dẫn chứng xác thực",
    sublist: 1,
    example: "Substantial empirical evidence supports the spaced repetition methodology.",
    collocations: ["compelling evidence", "empirical evidence", "evidence suggests that"],
  },
  {
    word: "indicate",
    pos: "verb",
    ipa: "/ˈɪn.dɪ.keɪt/",
    vi: "Chỉ ra, biểu thị xu hướng",
    sublist: 1,
    example: "Recent statistical findings indicate a surge in demand for multilingual professionals.",
    collocations: ["strongly indicate", "indicate a trend", "clear evidence to indicate"],
  },
  {
    word: "interpret",
    pos: "verb",
    ipa: "/ɪnˈtɜː.prɪt/",
    vi: "Thông dịch; diễn giải, giải thích ý nghĩa",
    sublist: 1,
    example: "Statistical outcomes must be interpreted with caution due to sample constraints.",
    collocations: ["interpret findings", "correctly interpret", "interpret data"],
  },
  {
    word: "method",
    pos: "noun",
    ipa: "/ˈmeθ.əd/",
    vi: "Phương pháp luận, quy trình nghiên cứu",
    sublist: 1,
    example: "Qualitative research methods provide in-depth insight into learner motivation.",
    collocations: ["research method", "rigorous method", "effective method"],
  },
  {
    word: "principle",
    pos: "noun",
    ipa: "/ˈprɪn.sə.pəl/",
    vi: "Nguyên lý, nguyên tắc nền tảng",
    sublist: 1,
    example: "Adhering to ethical principles is mandatory throughout academic fieldwork.",
    collocations: ["fundamental principle", "guiding principle", "underlying principle"],
  },
  {
    word: "significant",
    pos: "adj",
    ipa: "/sɪɡˈnɪf.ɪ.kənt/",
    vi: "Có ý nghĩa thống kê; quan trọng, đáng kể",
    sublist: 1,
    example: "The experimental group exhibited a significant improvement in academic writing accuracy.",
    collocations: ["statistically significant", "significant difference", "play a significant role"],
  },
  {
    word: "structure",
    pos: "noun",
    ipa: "/ˈstrʌk.tʃər/",
    vi: "Cấu trúc, bố cục (bài luận, câu)",
    sublist: 1,
    example: "A coherent paragraph structure reinforces the clarity of your core thesis.",
    collocations: ["sentence structure", "organizational structure", "underlying structure"],
  },
  {
    word: "theory",
    pos: "noun",
    ipa: "/ˈθɪə.ri/",
    vi: "Học thuyết, lý thuyết khoa học",
    sublist: 1,
    example: "The hypothesis was grounded in contemporary sociolinguistic theory.",
    collocations: ["in theory", "formulate a theory", "grounded in theory"],
  },

  // Sublist 2 - Học thuật nâng cao
  {
    word: "acquire",
    pos: "verb",
    ipa: "/əˈkwaɪər/",
    vi: "Tiếp thu, lĩnh hội (ngôn ngữ, kỹ năng)",
    sublist: 2,
    example: "Learners acquire idiomatic expressions naturally through extensive reading.",
    collocations: ["acquire knowledge", "acquire a language", "acquire skills"],
  },
  {
    word: "appropriate",
    pos: "adj",
    ipa: "/əˈprəʊ.pri.ət/",
    vi: "Phù hợp, thích hợp với văn cảnh",
    sublist: 2,
    example: "Selecting an appropriate academic register is critical when addressing scholars.",
    collocations: ["highly appropriate", "culturally appropriate", "appropriate register"],
  },
  {
    word: "conduct",
    pos: "verb",
    ipa: "/kənˈdʌkt/",
    vi: "Tiến hành, thực hiện (nghiên cứu, khảo sát)",
    sublist: 2,
    example: "The research team conducted a series of controlled classroom experiments.",
    collocations: ["conduct research", "conduct an experiment", "conduct a survey"],
  },
  {
    word: "consequent",
    pos: "adj",
    ipa: "/ˈkɒn.sɪ.kwənt/",
    vi: "Kéo theo, là hệ quả tất yếu của",
    sublist: 2,
    example: "Rapid technological shifts and the consequent changes in translation workflows.",
    collocations: ["consequent upon", "consequent rise in", "subsequent and consequent"],
  },
  {
    word: "correlate",
    pos: "verb",
    ipa: "/ˈkɒr.ə.leɪt/",
    vi: "Có tương quan, liên hệ tương hỗ",
    sublist: 2,
    example: "Reading comprehension scores correlate strongly with active vocabulary breadth.",
    collocations: ["positively correlate with", "correlate closely", "statistically correlate"],
  },
  {
    word: "evaluate",
    pos: "verb",
    ipa: "/ɪˈvæl.ju.eɪt/",
    vi: "Đánh giá, nhận định giá trị",
    sublist: 2,
    example: "Reviewers evaluate manuscripts based on originality, methodology, and rigor.",
    collocations: ["critically evaluate", "evaluate the outcomes", "evaluate progress"],
  },
  {
    word: "framework",
    pos: "noun",
    ipa: "/ˈfreɪm.wɜːk/",
    vi: "Khung lý thuyết, khung tham chiếu",
    sublist: 2,
    example: "The analysis adopts the Common European Framework of Reference (CEFR).",
    collocations: ["theoretical framework", "conceptual framework", "within the framework of"],
  },
  {
    word: "illustrate",
    pos: "verb",
    ipa: "/ˈɪl.ə.streɪt/",
    vi: "Minh họa, làm sáng tỏ bằng ví dụ",
    sublist: 2,
    example: "Case studies are provided to illustrate how pragmatic markers function in dialogue.",
    collocations: ["clearly illustrate", "serve to illustrate", "illustrate this point"],
  },
  {
    word: "maintain",
    pos: "verb",
    ipa: "/meɪnˈteɪn/",
    vi: "Duy trì; giữ vững lập trường/luận điểm",
    sublist: 2,
    example: "The author maintains that language immersion yields superior communicative confidence.",
    collocations: ["maintain an argument", "maintain consistency", "maintain standards"],
  },
  {
    word: "potential",
    pos: "adj",
    ipa: "/pəˈten.ʃəl/",
    vi: "Tiềm năng, có triển vọng phát triển",
    sublist: 2,
    example: "AI assistants offer immense potential to personalize individualized study paths.",
    collocations: ["great potential", "potential benefits", "potential drawbacks"],
  },
  {
    word: "relevant",
    pos: "adj",
    ipa: "/ˈrel.ə.vənt/",
    vi: "Có liên quan, thích đáng với chủ đề",
    sublist: 2,
    example: "Only cite peer-reviewed sources that are directly relevant to your thesis question.",
    collocations: ["highly relevant", "directly relevant to", "relevant literature"],
  },
]

/**
 * Các cụm từ liên kết học thuật chuẩn Cambridge / Academic Essay Writing
 */
export const ACADEMIC_PHRASES = [
  {
    category: "Mở đầu & Nêu luận điểm",
    items: [
      { en: "It is widely acknowledged that...", vi: "Một điều được công nhận rộng rãi rằng..." },
      { en: "A growing body of literature suggests that...", vi: "Ngày càng có nhiều nghiên cứu chỉ ra rằng..." },
      { en: "The primary objective of this paper is to...", vi: "Mục tiêu hàng đầu của bài viết này là..." },
      { en: "To substantiate this claim, one must examine...", vi: "Để minh chứng cho luận điểm này, cần xem xét..." },
    ],
  },
  {
    category: "So sánh & Đối chiếu luận cứ",
    items: [
      { en: "In stark contrast to previous assumptions...", vi: "Hoàn toàn trái ngược với các giả định trước đây..." },
      { en: "Conversely, empirical findings demonstrate that...", vi: "Ngược lại, các kết quả thực nghiệm lại chứng minh..." },
      { en: "On the one hand..., on the other hand...", vi: "Một mặt..., mặt khác..." },
      { en: "While this view possesses merits, it overlooks...", vi: "Dù quan điểm này có giá trị, nó lại bỏ qua khía cạnh..." },
    ],
  },
  {
    category: "Nguyên nhân & Hệ quả",
    items: [
      { en: "This phenomenon can be largely attributed to...", vi: "Hiện tượng này phần lớn có thể quy cho..." },
      { en: "Consequently, the implications for learners are...", vi: "Hệ quả là, những tác động đối với người học là..." },
      { en: "As a direct result of this intervention...", vi: "Như là một kết quả trực tiếp của sự can thiệp này..." },
      { en: "This serves as a catalyst for...", vi: "Điều này đóng vai trò như chất xúc tác cho..." },
    ],
  },
  {
    category: "Kết luận & Khái quát",
    items: [
      { en: "In light of the evidence presented...", vi: "Dưới góc độ các bằng chứng đã trình bày..." },
      { en: "Taken together, these results imply that...", vi: "Tổng hòa lại, những kết quả này hàm ý rằng..." },
      { en: "It is reasonable to deduce that...", vi: "Hoàn toàn có cơ sở để suy luận rằng..." },
      { en: "Future research should focus on...", vi: "Các nghiên cứu tương lai nên tập trung vào..." },
    ],
  },
]

/**
 * Động từ học thuật đi kèm giới từ cố định (Academic Collocations & Prepositions)
 */
export const ACADEMIC_PREPOSITIONS = [
  { verb: "adhere to", prep: "to", meaning: "tuân thủ theo (quy tắc, phương pháp)", example: "All essays must adhere strictly to APA guidelines." },
  { verb: "attribute ... to", prep: "to", meaning: "quy cái gì là do cái gì", example: "Scholars attribute language proficiency to active daily engagement." },
  { verb: "collaborate with", prep: "with", meaning: "hợp tác cùng ai", example: "Researchers collaborate with universities overseas." },
  { verb: "compensate for", prep: "for", meaning: "bù đắp cho thiếu sót", example: "High motivation can compensate for initial linguistic challenges." },
  { verb: "conform to", prep: "to", meaning: "phù hợp, tuân theo tiêu chuẩn", example: "The experiment conforms to institutional ethical standards." },
  { verb: "correlate with", prep: "with", meaning: "tương quan với", example: "Extensive reading correlates positively with essay fluency." },
  { verb: "derive from", prep: "from", meaning: "bắt nguồn từ", example: "Many academic idioms derive from classical philosophy." },
  { verb: "engage in", prep: "in", meaning: "tham gia tích cực vào", example: "Students frequently engage in structured peer reviews." },
  { verb: "infer from", prep: "from", meaning: "suy luận ra từ", example: "We can infer from the data that retention rates increase over time." },
  { verb: "refrain from", prep: "from", meaning: "kiềm chế, tránh làm việc gì", example: "Scholars should refrain from overgeneralizing singular case studies." },
]
