"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { BookOpen, Camera, Download, FileText, Layers, Plus, RotateCcw, Search, Sparkles, SpellCheck, Trash2, Upload, Volume2 } from "lucide-react"
import { AiNotice, AiResult, Badge, Button, Card, Empty, Input, Label, PageHeader, Stat, Tabs, Textarea } from "@/components/studio/ui"
import { TOOLS } from "@/lib/studio/tools"
import { downloadFile, uid, useStored } from "@/lib/studio/storage"
import { callAi } from "@/lib/studio/ai"
import { cn } from "@/lib/utils"
import { fileToDataUrl } from "@/lib/studio/image"
import { CAMBRIDGE_AWL, ACADEMIC_PHRASES, ACADEMIC_PREPOSITIONS } from "@/lib/studio/cambridge"

const tool = TOOLS.find((t) => t.slug === "korean")!
const DAY = 86400000
const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60] // days per Leitner box

type FlashCard = { id: string; front: string; back: string; example?: string; box: number; due: number; reps: number; lapses: number }

const STARTER: [string, string, string?][] = [
  ["안녕하세요", "Xin chào", "안녕하세요, 만나서 반가워요."],
  ["감사합니다", "Cảm ơn", "도와주셔서 감사합니다."],
  ["학교", "Trường học", "학교에 가요."],
  ["학생", "Học sinh, sinh viên", "저는 대학생이에요."],
  ["선생님", "Giáo viên, thầy/cô", "선생님께 질문했어요."],
  ["공부하다", "Học (bài)", "도서관에서 공부해요."],
  ["도서관", "Thư viện", "도서관은 조용해요."],
  ["숙제", "Bài tập về nhà", "숙제가 어려워요."],
  ["시험", "Kỳ thi, bài kiểm tra", "내일 시험이 있어요."],
  ["발표", "Bài thuyết trình", "다음 주에 발표를 해요."],
  ["친구", "Bạn bè", "친구하고 영화를 봐요."],
  ["시간", "Thời gian", "시간이 없어요."],
  ["오늘", "Hôm nay", "오늘 날씨가 좋아요."],
  ["내일", "Ngày mai", "내일 만나요."],
  ["어제", "Hôm qua", "어제 친구를 만났어요."],
  ["먹다", "Ăn", "점심을 먹었어요."],
  ["마시다", "Uống", "커피를 마셔요."],
  ["어렵다", "Khó", "한국어 문법이 어려워요."],
  ["쉽다", "Dễ", "이 문제는 쉬워요."],
  ["졸업", "Tốt nghiệp", "내년에 졸업해요."],
]

const PARTICLES = [
  { p: "은 / 는", use: "Chủ đề của câu, so sánh đối chiếu", ex: "저는 학생이에요.", vi: "Tôi là sinh viên." },
  { p: "이 / 가", use: "Chủ ngữ, thông tin mới hoặc nhấn mạnh", ex: "비가 와요.", vi: "Trời mưa." },
  { p: "을 / 를", use: "Tân ngữ trực tiếp", ex: "책을 읽어요.", vi: "Tôi đọc sách." },
  { p: "에", use: "Nơi tồn tại, đích đến, thời điểm", ex: "3시에 학교에 가요.", vi: "Tôi đến trường lúc 3 giờ." },
  { p: "에서", use: "Nơi diễn ra hành động; điểm xuất phát", ex: "도서관에서 공부해요.", vi: "Tôi học ở thư viện." },
  { p: "의", use: "Sở hữu (của)", ex: "친구의 책이에요.", vi: "Đây là sách của bạn tôi." },
  { p: "와 / 과, 하고, (이)랑", use: "Và, cùng với", ex: "친구하고 영화를 봐요.", vi: "Tôi xem phim với bạn." },
  { p: "도", use: "Cũng", ex: "저도 학생이에요.", vi: "Tôi cũng là sinh viên." },
  { p: "만", use: "Chỉ", ex: "물만 마셔요.", vi: "Tôi chỉ uống nước." },
  { p: "에게 / 한테", use: "Cho, đối với (người, động vật)", ex: "친구에게 선물을 줘요.", vi: "Tôi tặng quà cho bạn." },
  { p: "(으)로", use: "Phương tiện, cách thức, hướng", ex: "버스로 가요.", vi: "Tôi đi bằng xe buýt." },
  { p: "부터 ~ 까지", use: "Từ ~ đến (thời gian)", ex: "9시부터 5시까지 일해요.", vi: "Tôi làm việc từ 9 giờ đến 5 giờ." },
]

/** Final consonant of the last Hangul syllable: null = not Hangul, 0 = none, 8 = ㄹ. */
function batchim(word: string) {
  const ch = word.trim().slice(-1)
  const code = ch.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return null
  return code % 28
}

function attach(noun: string) {
  const b = batchim(noun)
  if (b === null) return null
  const has = b !== 0
  return [
    { label: "Chủ đề", form: noun + (has ? "은" : "는") },
    { label: "Chủ ngữ", form: noun + (has ? "이" : "가") },
    { label: "Tân ngữ", form: noun + (has ? "을" : "를") },
    { label: "Và / với", form: noun + (has ? "과" : "와") },
    { label: "Bằng / hướng", form: noun + (has && b !== 8 ? "으로" : "로") },
    { label: "Là (lịch sự)", form: noun + (has ? "이에요" : "예요") },
  ]
}

function speak(text: string, lang: "ko" | "en" = "ko") {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === "ko" ? "ko-KR" : "en-GB"
    u.rate = 0.9
    const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang === "ko" ? "ko" : "en"))
    if (voice) u.voice = voice
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  } catch {
    toast.error("Trình duyệt này không hỗ trợ đọc thành tiếng.")
  }
}

const makeCard = (front: string, back: string, example?: string): FlashCard => ({
  id: uid(),
  front,
  back,
  example,
  box: 0,
  due: Date.now() - 1000,
  reps: 0,
  lapses: 0,
})

export default function KoreanPage() {
  const [lang, setLang] = useStored<"ko" | "en">("bloom.language.active", "ko")
  const [cardsKo, setCardsKo, loadedKo] = useStored<FlashCard[]>("bloom.korean.cards", [])
  const [seededKo, setSeededKo] = useStored("bloom.korean.seeded", false)
  const [cardsEn, setCardsEn, loadedEn] = useStored<FlashCard[]>("bloom.english.cards", [])
  const [seededEn, setSeededEn] = useStored("bloom.english.seeded", false)
  const [tab, setTab] = useState<"review" | "deck" | "grammar" | "check">("review")

  useEffect(() => {
    if (loadedKo && !seededKo) {
      setCardsKo((cs) => (cs.length ? cs : STARTER.map(([f, b, e]) => makeCard(f, b, e))))
      setSeededKo(true)
    }
  }, [loadedKo, seededKo, setCardsKo, setSeededKo])

  useEffect(() => {
    if (loadedEn && !seededEn) {
      setCardsEn((cs) =>
        cs.length
          ? cs
          : CAMBRIDGE_AWL.map((w) => makeCard(w.word, `${w.vi} (${w.pos}) · ${w.ipa}`, w.example))
      )
      setSeededEn(true)
    }
  }, [loadedEn, seededEn, setCardsEn, setSeededEn])

  if (!loadedKo || !loadedEn) return null

  const cards = lang === "ko" ? cardsKo : cardsEn
  const setCards = lang === "ko" ? setCardsKo : setCardsEn

  return (
    <div>
      <PageHeader
        icon={tool.icon}
        tint={tool.tint}
        title={tool.name}
        guide={tool.guide}
        desc={
          lang === "ko"
            ? "Cùng khám phá tiếng Hàn qua từ vựng, cách dùng và những câu hỏi nhỏ, theo nhịp của bạn."
            : "Ôn từ vựng học thuật Academic Word List (AWL), tra cứu collocations và kiểm tra văn phong bài luận."
        }
      />

      {/* Language Switcher Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ngôn ngữ:</span>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setLang("ko")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                lang === "ko" ? "bg-white text-violet-700 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>🇰🇷</span> Tiếng Hàn (TOPIK)
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                lang === "en" ? "bg-white text-violet-700 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>🇬🇧</span> Tiếng Anh (từ học thuật)
            </button>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {lang === "ko" ? "Luyện từ vựng TOPIK & ngữ pháp tiểu từ" : "Kho từ học thuật Academic Word List & Collocations C1"}
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "review", label: "Ôn tập", icon: RotateCcw },
          { id: "deck", label: `Bộ thẻ (${cards.length})`, icon: Layers },
          { id: "grammar", label: lang === "ko" ? "Tiểu từ" : "Học thuật & Collocations", icon: BookOpen },
          { id: "check", label: "Kiểm tra câu", icon: SpellCheck },
        ]}
      />
      <div className="mt-4">
        {tab === "review" && <Review cards={cards} setCards={setCards} lang={lang} />}
        {tab === "deck" && <Deck cards={cards} setCards={setCards} lang={lang} />}
        {tab === "grammar" && (lang === "ko" ? <Grammar /> : <EnglishGrammar />)}
        {tab === "check" && <SentenceCheck lang={lang} />}
      </div>
    </div>
  )
}

type SetCards = (fn: (cs: FlashCard[]) => FlashCard[]) => void

type Mode = "flip" | "choice" | "type"

const normalizeKo = (s: string) => s.normalize("NFC").replace(/[\s.,!?·~'"“”‘’()-]/g, "").toLowerCase()

function Review({ cards, setCards, lang = "ko" }: { cards: FlashCard[]; setCards: SetCards; lang?: "ko" | "en" }) {
  const [now, setNow] = useState(() => Date.now())
  const [mode, setMode] = useStored<Mode>("bloom.korean.mode", "flip")
  const [flipped, setFlipped] = useState(false)
  const [extra, setExtra] = useState<string[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState("")
  const [checked, setChecked] = useState<null | boolean>(null)
  const [session, setSession] = useState({ right: 0, wrong: 0 })
  const [started, setStarted] = useState(false)

  const normalizeWord = (s: string) => (lang === "ko" ? normalizeKo(s) : s.trim().toLowerCase())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(t)
  }, [])

  const due = useMemo(() => {
    const t = Math.max(now, Date.now())
    return cards.filter((c) => c.due <= t).sort((a, b) => a.due - b.due)
  }, [cards, now])
  const queue = due.length ? due : cards.filter((c) => extra.includes(c.id))
  const current = queue[0]
  const learned = cards.filter((c) => c.box >= 3).length

  // Four answer options: the right meaning + three distinct distractors.
  const options = useMemo(() => {
    if (!current) return []
    const others = Array.from(new Set(cards.filter((c) => c.id !== current.id && c.back !== current.back).map((c) => c.back)))
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[others[i], others[j]] = [others[j], others[i]]
    }
    const opts = [current.back, ...others.slice(0, 3)]
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[opts[i], opts[j]] = [opts[j], opts[i]]
    }
    return opts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, cards.length])

  const resetCard = () => {
    setFlipped(false)
    setPicked(null)
    setTyped("")
    setChecked(null)
  }

  const rate = (grade: 0 | 1 | 2 | 3) => {
    if (!current) return
    const t = Date.now()
    setCards((cs) =>
      cs.map((c) => {
        if (c.id !== current.id) return c
        let box = c.box
        let due = t
        if (grade === 0) {
          box = 0
          due = t + 60 * 1000
        } else if (grade === 1) {
          box = Math.max(1, c.box)
          due = t + DAY
        } else {
          box = Math.min(INTERVALS.length - 1, c.box + (grade === 3 ? 2 : 1))
          due = t + INTERVALS[box] * DAY
        }
        return { ...c, box, due, reps: c.reps + 1, lapses: c.lapses + (grade === 0 ? 1 : 0) }
      }),
    )
    setSession((s) => (grade === 0 ? { ...s, wrong: s.wrong + 1 } : { ...s, right: s.right + 1 }))
    setExtra((ex) => ex.filter((id) => id !== current.id))
    resetCard()
    setNow(t + 1)
  }

  const choose = (opt: string) => {
    if (picked || !current) return
    setPicked(opt)
    if (opt === current.back) speak(current.front, lang)
  }

  const checkTyped = () => {
    if (!current || !typed.trim()) return
    const ok = normalizeWord(typed) === normalizeWord(current.front)
    setChecked(ok)
    speak(current.front, lang)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!started) return
      if ((e.target as HTMLElement)?.closest("input,textarea,select,button,a,summary")) return
      if (mode === "flip") {
        if (e.code === "Space") {
          e.preventDefault()
          setFlipped((f) => !f)
        } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) rate((Number(e.key) - 1) as 0 | 1 | 2 | 3)
      } else if (mode === "choice") {
        if (!picked && ["1", "2", "3", "4"].includes(e.key) && options[Number(e.key) - 1]) choose(options[Number(e.key) - 1])
        else if (picked && (e.key === "Enter" || e.code === "Space")) {
          e.preventDefault()
          rate(picked === current?.back ? 2 : 0)
        }
      } else if (mode === "type" && checked !== null && e.key === "Enter") rate(checked ? 2 : 0)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const MODES: { id: Mode; label: string }[] = [
    { id: "flip", label: "Lật thẻ" },
    { id: "choice", label: "Trắc nghiệm" },
    { id: "type", label: "Gõ đáp án" },
  ]

  if (!started) return <Card className="mx-auto max-w-2xl p-7 sm:p-10"><BookOpen className="h-8 w-8 text-violet-400"/><h2 className="mt-5 font-serif text-2xl text-slate-700">Một chút ngoại ngữ, khi bạn muốn.</h2><p className="mt-3 text-sm leading-7 text-slate-500">Mình có thể cùng bạn khám phá vài từ, nghe cách đọc hoặc thử một câu. Bạn có thể dừng bất cứ lúc nào; những thẻ đã lưu vẫn ở đây.</p><Button className="mt-6" onClick={()=>setStarted(true)}>Xem vài từ cùng mình</Button><p className="mt-4 text-xs leading-6 text-slate-400">Bạn cũng có thể mở Bộ thẻ hoặc Kiểm tra câu ở phía trên, nếu đó là điều bạn đang cần.</p></Card>

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
        <button className="mb-4 text-sm text-violet-600 underline underline-offset-4" onClick={()=>{setStarted(false);resetCard()}}>Để lúc khác</button>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => (setMode(m.id), resetCard())}
              className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium transition", mode === m.id ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")}
            >
              {m.label}
            </button>
          ))}
        </div>

        {!current ? (
          <Card>
            <Empty icon={RotateCcw} title="Mình có thể nghỉ ở đây một chút" desc="Những thẻ bạn vừa xem đã được lưu. Nếu vẫn muốn khám phá thêm, bạn có thể tự chọn ở bên dưới.">
              {cards.length > 0 && (
                <Button
                  variant="soft"
                  onClick={() =>
                    setExtra(
                      [...cards]
                        .sort((a, b) => a.due - b.due)
                        .slice(0, 10)
                        .map((c) => c.id),
                    )
                  }
                >
                  Xem thêm vài thẻ
                </Button>
              )}
            </Empty>
          </Card>
        ) : mode === "flip" ? (
          <div>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              className="flex min-h-72 w-full flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/70 transition hover:shadow-md"
            >
              <span className="text-4xl font-semibold text-slate-800 sm:text-5xl" lang={lang}>
                {current.front}
              </span>
              {flipped ? (
                <span className="mt-6 block">
                  <span className="block text-xl text-violet-700">{current.back}</span>
                  {current.example && (
                    <span className="mt-3 block text-sm text-slate-500" lang={lang}>
                      {current.example}
                    </span>
                  )}
                </span>
              ) : (
                <span className="mt-6 text-sm text-slate-400">Bấm vào thẻ hoặc nhấn phím cách để xem nghĩa</span>
              )}
            </button>
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" icon={Volume2} onClick={() => speak(current.front + (flipped && current.example ? `. ${current.example}` : ""), lang)}>
                Nghe phát âm
              </Button>
            </div>
            {flipped && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ["Quên", "1 phút", "bg-rose-50 text-rose-700 hover:bg-rose-100"],
                    ["Khó", "1 ngày", "bg-amber-50 text-amber-700 hover:bg-amber-100"],
                    ["Nhớ", `${INTERVALS[Math.min(7, current.box + 1)]} ngày`, "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"],
                    ["Dễ", `${INTERVALS[Math.min(7, current.box + 2)]} ngày`, "bg-sky-50 text-sky-700 hover:bg-sky-100"],
                  ] as const
                ).map(([l, d, cls], i) => (
                  <button key={l} type="button" onClick={() => rate(i as 0 | 1 | 2 | 3)} className={cn("rounded-2xl px-3 py-3 text-center transition", cls)}>
                    <span className="block font-semibold">{l}</span>
                    <span className="block text-xs opacity-75">
                      {d} · phím {i + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : mode === "choice" ? (
          <Card className="p-6">
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Chọn nghĩa đúng</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="text-4xl font-semibold text-slate-800 sm:text-5xl" lang={lang}>
                {current.front}
              </span>
              <Button variant="ghost" size="icon" icon={Volume2} aria-label="Nghe" onClick={() => speak(current.front, lang)} />
            </div>
            {options.length < 2 ? (
              <p className="mt-6 text-center text-sm text-slate-500">Cần ít nhất 2 thẻ có nghĩa khác nhau để làm trắc nghiệm.</p>
            ) : (
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {options.map((o, i) => {
                  const right = o === current.back
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => choose(o)}
                      disabled={!!picked}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium ring-1 transition",
                        !picked && "bg-white text-slate-700 ring-slate-200 hover:bg-violet-50 hover:ring-violet-200",
                        picked && right && "bg-emerald-50 text-emerald-800 ring-emerald-300",
                        picked && !right && picked === o && "bg-rose-50 text-rose-700 ring-rose-300",
                        picked && !right && picked !== o && "bg-white text-slate-400 ring-slate-100",
                      )}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs text-slate-500">{i + 1}</span>
                      {o}
                    </button>
                  )
                })}
              </div>
            )}
            {picked && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-sm">
                  <span className={cn("font-semibold", picked === current.back ? "text-emerald-700" : "text-rose-600")}>
                    {picked === current.back ? "Chính xác!" : `Đáp án: ${current.back}`}
                  </span>
                  {current.example && (
                    <span className="mt-1 block text-slate-500" lang={lang}>
                      {current.example}
                    </span>
                  )}
                </div>
                <Button onClick={() => rate(picked === current.back ? 2 : 0)}>Tiếp tục</Button>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-6">
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              {lang === "ko" ? "Viết từ tiếng Hàn" : "Viết từ tiếng Anh"}
            </p>
            <p className="mt-3 text-center text-3xl font-semibold text-violet-700">{current.back}</p>
            <form
              className="mx-auto mt-6 flex max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (checked === null) checkTyped()
                else rate(checked ? 2 : 0)
              }}
            >
              <Input
                autoFocus
                lang={lang}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={checked !== null}
                placeholder={lang === "ko" ? "Gõ bằng bàn phím tiếng Hàn..." : "Gõ từ tiếng Anh..."}
                className={cn("text-lg", checked === true && "border-emerald-400 bg-emerald-50", checked === false && "border-rose-400 bg-rose-50")}
              />
              <Button type="submit">{checked === null ? "Kiểm tra" : "Tiếp tục"}</Button>
            </form>
            {checked !== null && (
              <div className="mx-auto mt-4 max-w-md rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <span className={cn("font-semibold", checked ? "text-emerald-700" : "text-rose-600")}>{checked ? "Chính xác!" : "Chưa đúng."}</span>{" "}
                Đáp án:{" "}
                <span className="font-semibold text-slate-800" lang="ko">
                  {current.front}
                </span>
                {current.example && (
                  <span className="mt-1 block text-slate-500" lang="ko">
                    {current.example}
                  </span>
                )}
                {!checked && (
                  <button type="button" onClick={() => rate(2)} className="mt-2 block text-xs text-violet-600 hover:underline">
                    Mình gõ đúng nhưng khác cách viết, tính là đúng
                  </button>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
      <details className="h-fit rounded-2xl bg-white/70 p-4">
        <summary className="cursor-pointer text-sm text-slate-500">Xem ghi chú buổi học</summary>
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
          <Stat label="Thẻ gợi ý để xem lại" value={due.length} />
          <Stat label="Tổng số thẻ" value={cards.length} />
          <Stat label="Thẻ đã quen hơn" value={learned} />
          <Stat label="Lượt nhớ / thử lại" value={`${session.right} / ${session.wrong}`} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">Mức độ bạn chọn giúp sắp xếp thẻ cho lần sau. Đây là gợi ý khi bạn muốn học tiếp, không phải lịch hẹn cần hoàn thành.</p>
      </details>
    </div>
  )
}

/* ---------- AI: vocabulary from a photo or a passage ---------- */

type Draft = { id: string; front: string; back: string; example: string; on: boolean; dup: boolean }

function AiVocab({ cards, setCards, lang = "ko" }: { cards: FlashCard[]; setCards: SetCards; lang?: "ko" | "en" }) {
  const [src, setSrc] = useState<"image" | "text">("image")
  const [image, setImage] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = async (f: File) => {
    if (!f.type.startsWith("image/")) return toast.error("Hãy chọn một tệp ảnh.")
    try {
      setImage((await fileToDataUrl(f, 1400, 0.82)).src)
      setDrafts([])
    } catch {
      toast.error("Không đọc được ảnh này.")
    }
  }

  const run = async () => {
    if (src === "image" && !image) return toast.info("Hãy chụp hoặc chọn một ảnh trước.")
    if (src === "text" && !text.trim()) {
      return toast.info(lang === "ko" ? "Hãy dán một đoạn văn tiếng Hàn." : "Hãy dán một đoạn văn tiếng Anh.")
    }
    setBusy(true)
    try {
      const res = await callAi<{ cards?: { front?: string; back?: string; example?: string }[] }>("vocab", src === "image" ? { image, text: "" } : { text })
      const known = new Set(cards.map((c) => c.front.trim().toLowerCase()))
      const seen = new Set<string>()
      const list = (res.cards ?? [])
        .filter((c) => typeof c.front === "string" && c.front.trim() && typeof c.back === "string")
        .filter((c) => !seen.has(c.front!.trim().toLowerCase()) && seen.add(c.front!.trim().toLowerCase()))
        .map((c) => {
          const dup = known.has(c.front!.trim().toLowerCase())
          return { id: uid(), front: c.front!.trim(), back: c.back!.trim(), example: (c.example ?? "").trim(), on: !dup, dup }
        })
      setDrafts(list)
      if (!list.length) toast.info(lang === "ko" ? "Không tìm thấy từ tiếng Hàn nào. Thử ảnh rõ hơn nhé." : "Không tìm thấy từ vựng nào. Thử ảnh rõ hơn nhé.")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const add = () => {
    const chosen = drafts.filter((d) => d.on && d.front && d.back)
    if (!chosen.length) return toast.info("Chưa chọn từ nào.")
    setCards((cs) => [...chosen.map((d) => makeCard(d.front, d.back, d.example || undefined)), ...cs])
    setDrafts([])
    setImage(null)
    setText("")
    toast.success(`Đã thêm ${chosen.length} thẻ vào bộ thẻ.`)
  }

  const edit = (id: string, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  const chosenCount = drafts.filter((d) => d.on).length

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-medium text-slate-800">
          <Sparkles className="h-4 w-4 text-violet-500" />
          Tạo thẻ bằng AI
        </h3>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              ["image", "Từ ảnh", Camera],
              ["text", "Từ đoạn văn", FileText],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSrc(id)}
              className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium", src === id ? "bg-white text-violet-700 shadow-sm" : "text-slate-500")}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">Chụp trang giáo trình, slide hoặc dán bài đọc. AI gợi ý từ vựng, bạn xem lại và sửa trước khi thêm.</p>

      <div className="mt-3">
        <AiNotice />
      </div>

      {src === "image" ? (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) pick(f)
              e.target.value = ""
            }}
          />
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="Ảnh đã chọn" className="h-24 w-auto max-w-[60%] rounded-xl object-cover ring-1 ring-slate-200" />
          ) : null}
          <Button variant="outline" icon={Camera} onClick={() => fileRef.current?.click()}>
            {image ? "Chọn ảnh khác" : "Chụp / chọn ảnh"}
          </Button>
        </div>
      ) : (
        <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} lang="ko" placeholder="민수 씨는 매일 도서관에서 공부합니다..." />
      )}

      <Button className="mt-3" icon={Sparkles} loading={busy} onClick={run}>
        {busy ? "Đang đọc..." : "Lấy từ vựng"}
      </Button>

      {drafts.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              {drafts.length} từ gợi ý · đã chọn {chosenCount}
            </span>
            <button type="button" className="text-violet-600 hover:underline" onClick={() => setDrafts((ds) => ds.map((d) => ({ ...d, on: chosenCount < ds.length })))}>
              {chosenCount < drafts.length ? "Chọn tất cả" : "Bỏ chọn tất cả"}
            </button>
          </div>
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li key={d.id} className={cn("rounded-xl p-2.5 ring-1", d.on ? "bg-white ring-violet-200" : "bg-slate-50 ring-slate-100")}>
                <div className="flex items-start gap-2">
                  <input type="checkbox" checked={d.on} onChange={(e) => edit(d.id, { on: e.target.checked })} className="mt-3 accent-violet-600" aria-label="Chọn từ" />
                  <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-[1fr_1.3fr]">
                    <Input value={d.front} onChange={(e) => edit(d.id, { front: e.target.value })} lang={lang} className="h-9" aria-label="Từ vựng" />
                    <Input value={d.back} onChange={(e) => edit(d.id, { back: e.target.value })} className="h-9" aria-label="Nghĩa" />
                    <Input value={d.example} onChange={(e) => edit(d.id, { example: e.target.value })} lang={lang} className="h-9 text-xs sm:col-span-2" placeholder="Câu ví dụ" aria-label="Câu ví dụ" />
                  </div>
                  <button type="button" onClick={() => speak(d.front, lang)} aria-label="Nghe" className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-600">
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                {d.dup && <p className="mt-1 pl-6 text-xs text-amber-600">Từ này đã có trong bộ thẻ.</p>}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button icon={Plus} onClick={add} disabled={!chosenCount}>
              Thêm {chosenCount} thẻ
            </Button>
            <Button variant="ghost" onClick={() => setDrafts([])}>
              Hủy
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">AI có thể nhầm dạng từ điển hoặc nghĩa. Hãy kiểm tra lại với giáo trình.</p>
        </div>
      )}
    </Card>
  )
}

function Deck({ cards, setCards, lang = "ko" }: { cards: FlashCard[]; setCards: SetCards; lang?: "ko" | "en" }) {
  const [front, setFront] = useState("")
  const [back, setBack] = useState("")
  const [example, setExample] = useState("")
  const [bulk, setBulk] = useState("")
  const [showBulk, setShowBulk] = useState(false)
  const [q, setQ] = useState("")

  const add = () => {
    if (!front.trim() || !back.trim()) return toast.error("Cần nhập từ và nghĩa.")
    setCards((cs) => [makeCard(front.trim(), back.trim(), example.trim() || undefined), ...cs])
    setFront("")
    setBack("")
    setExample("")
    toast.success("Đã thêm thẻ.")
  }

  const importBulk = () => {
    const rows = bulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split(/\t|\s+[-–=:|]\s+|\s*\|\s*/))
      .filter((p) => p.length >= 2 && p[0] && p[1])
    if (!rows.length) return toast.error("Không đọc được dòng nào. Dùng dạng: từ - nghĩa")
    setCards((cs) => [...rows.map((p) => makeCard(p[0].trim(), p[1].trim(), p[2]?.trim())), ...cs])
    setBulk("")
    setShowBulk(false)
    toast.success(`Đã thêm ${rows.length} thẻ.`)
  }

  const exportCsv = () => {
    const esc = (s = "") => `"${s.replace(/"/g, '""')}"`
    const fileName = lang === "ko" ? "korean-flashcards.csv" : "cambridge-awl-flashcards.csv"
    downloadFile(fileName, "﻿" + ["front,back,example", ...cards.map((c) => [c.front, c.back, c.example].map(esc).join(","))].join("\n"), "text/csv;charset=utf-8")
  }

  const loadCambridgePack = () => {
    const existing = new Set(cards.map((c) => c.front.toLowerCase()))
    const toAdd = CAMBRIDGE_AWL.filter((w) => !existing.has(w.word.toLowerCase())).map((w) =>
      makeCard(w.word, `${w.vi} (${w.pos}) · ${w.ipa}`, w.example)
    )
    if (!toAdd.length) {
      toast.info("Đã có đủ tất cả từ vựng trong danh mục từ học thuật!")
    } else {
      setCards((cs) => [...toAdd, ...cs])
      toast.success(`Đã nạp thêm ${toAdd.length} từ vựng học thuật từ học thuật!`)
    }
  }

  const filtered = cards.filter((c) => !q || `${c.front} ${c.back}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-4">
      <AiVocab cards={cards} setCards={setCards} lang={lang} />
      <Card className="p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
          <Input value={front} onChange={(e) => setFront(e.target.value)} placeholder={lang === "ko" ? "Từ tiếng Hàn" : "Từ tiếng Anh (Headword)"} lang={lang} />
          <Input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Nghĩa tiếng Việt" />
          <Input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Câu ví dụ (tùy chọn)" onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button icon={Plus} onClick={add}>
            Thêm
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {lang === "en" && (
            <Button size="sm" variant="soft" onClick={loadCambridgePack} className="bg-blue-50 text-blue-700 hover:bg-blue-100">
              📚 Nạp thêm từ vựng từ học thuật
            </Button>
          )}
          <Button size="sm" variant={showBulk ? "soft" : "outline"} icon={Upload} onClick={() => setShowBulk((v) => !v)}>
            Nhập nhiều thẻ
          </Button>
          <Button size="sm" variant="outline" icon={Download} onClick={exportCsv} disabled={!cards.length}>
            Xuất CSV
          </Button>
        </div>
        {showBulk && (
          <div className="mt-3">
            <Textarea
              rows={6}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={lang === "ko" ? "Mỗi dòng một thẻ:\n사과 - quả táo\n기차 | tàu hỏa | 기차를 타요." : "Mỗi dòng một thẻ:\nanalyze - phân tích dữ liệu\nconcept | khái niệm lý thuyết | fundamental concept"}
            />
            <Button className="mt-2" size="sm" onClick={importBulk}>
              Thêm các thẻ này
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm thẻ..." className="pl-9" />
        </div>
        {filtered.length === 0 ? (
          <Empty icon={Layers} title="Không có thẻ nào" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <button type="button" onClick={() => speak(c.front, lang)} aria-label="Nghe" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-600">
                  <Volume2 className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800" lang={lang}>
                    {c.front} <span className="font-normal text-slate-500">· {c.back}</span>
                  </div>
                  {c.example && (
                    <div className="truncate text-xs text-slate-500" lang={lang}>
                      {c.example}
                    </div>
                  )}
                </div>
                <Badge className="hidden sm:inline-flex">Hộp {c.box}</Badge>
                <Button size="icon" variant="danger" icon={Trash2} aria-label="Xóa thẻ" onClick={() => setCards((cs) => cs.filter((x) => x.id !== c.id))} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Grammar() {
  const [noun, setNoun] = useState("학교")
  const forms = attach(noun)
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {PARTICLES.map((p) => (
            <li key={p.p} className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr]">
              <div className="text-lg font-semibold text-violet-700" lang="ko">
                {p.p}
              </div>
              <div>
                <div className="text-sm text-slate-700">{p.use}</div>
                <button type="button" onClick={() => speak(p.ex, "ko")} className="mt-1 inline-flex items-center gap-1.5 text-left text-sm text-slate-500 hover:text-violet-700">
                  <Volume2 className="h-3.5 w-3.5 shrink-0" />
                  <span lang="ko">{p.ex}</span>
                  <span className="text-slate-400">· {p.vi}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="h-fit p-4">
        <h3 className="font-medium text-slate-800">Gắn tiểu từ tự động</h3>
        <p className="mt-1 text-xs text-slate-500">Nhập một danh từ, Bloom chọn đúng dạng theo patchim (phụ âm cuối).</p>
        <Input className="mt-3" value={noun} onChange={(e) => setNoun(e.target.value)} lang="ko" placeholder="vd: 친구, 책, 서울" />
        {forms ? (
          <>
            <p className="mt-3 text-xs text-slate-500">{batchim(noun) ? "Có patchim" : "Không có patchim"}</p>
            <ul className="mt-2 space-y-1.5">
              {forms.map((f) => (
                <li key={f.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-500">{f.label}</span>
                  <span className="font-medium text-slate-800" lang="ko">
                    {f.form}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          noun.trim() && <p className="mt-3 text-sm text-amber-600">Hãy nhập từ bằng chữ Hangul.</p>
        )}
      </Card>
    </div>
  )
}

function EnglishGrammar() {
  const [filter, setFilter] = useState("")
  const [catIndex, setCatIndex] = useState(0)

  const activeCategory = ACADEMIC_PHRASES[catIndex]
  const filteredPreps = ACADEMIC_PREPOSITIONS.filter(
    (p) =>
      !filter ||
      p.verb.toLowerCase().includes(filter.toLowerCase()) ||
      p.meaning.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      {/* Cụm từ liên kết học thuật */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-slate-800">Cụm từ liên kết học thuật</h3>
            <p className="text-xs text-slate-500">Các mẫu câu dẫn chuẩn mực cho bài luận C1 & IELTS Academic</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {ACADEMIC_PHRASES.map((cat, i) => (
            <button
              key={cat.category}
              type="button"
              onClick={() => setCatIndex(i)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                catIndex === i ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {cat.category}
            </button>
          ))}
        </div>

        <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50 p-2">
          {activeCategory.items.map((item) => (
            <li key={item.en} className="py-2.5 px-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-slate-800 text-sm" lang="en">
                  {item.en}
                </span>
                <button
                  type="button"
                  onClick={() => speak(item.en.replace(/\.\.\./g, ""), "en")}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                  aria-label="Nghe đọc"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{item.vi}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* Động từ & giới từ học thuật */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-slate-800">Động từ & Giới từ đi kèm</h3>
              <p className="text-xs text-slate-500">Academic Verbs & Prepositions</p>
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Tìm động từ hoặc nghĩa..."
            className="h-8 pl-8 text-xs bg-white"
          />
        </div>

        <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
          {filteredPreps.map((p) => (
            <div key={p.verb} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-700 text-sm" lang="en">
                    {p.verb}
                  </span>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">+{p.prep}</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => speak(p.example, "en")}
                  className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                  aria-label="Nghe ví dụ"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-slate-600 mt-1 font-medium">{p.meaning}</p>
              <p className="text-slate-500 italic mt-1 text-[11px]" lang="en">
                Ví dụ: {p.example}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function SentenceCheck({ lang = "ko" }: { lang?: "ko" | "en" }) {
  const [textKo, setTextKo] = useStored("bloom.korean.check", "")
  const [textEn, setTextEn] = useStored("bloom.english.check", "")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState("")

  const text = lang === "ko" ? textKo : textEn
  const setText = lang === "ko" ? setTextKo : setTextEn

  const run = async () => {
    if (!text.trim()) {
      return toast.info(lang === "ko" ? "Hãy nhập câu tiếng Hàn." : "Hãy nhập câu tiếng Anh học thuật.")
    }
    setBusy(true)
    try {
      const task = lang === "ko" ? "korean" : "english"
      setResult((await callAi(task, { text })).text)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4">
      <AiNotice />
      <Label>
        {lang === "ko"
          ? "Câu hoặc đoạn văn tiếng Hàn"
          : "Câu hoặc đoạn văn tiếng Anh học thuật (Academic English)"}
      </Label>
      <Textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        lang={lang}
        placeholder={
          lang === "ko"
            ? "저는 학교에 공부해요."
            : "Ví dụ: In stark contrast to previous studies, our empirical findings demonstrate that..."
        }
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button icon={Sparkles} loading={busy} onClick={run}>
          {lang === "ko" ? "Kiểm tra và giải thích" : "Kiểm tra cách diễn đạt học thuật"}
        </Button>
        <Button variant="outline" icon={Volume2} onClick={() => text.trim() && speak(text, lang)}>
          Nghe đọc
        </Button>
      </div>
      {result && <AiResult text={result} />}
    </Card>
  )
}
