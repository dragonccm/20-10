"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button, Card, Input, Label, Select, Textarea } from "./ui"
import {
  LEARNING_SOURCES,
  LEARNING_UNITS,
  tutorSchema,
  type LearningUnit,
} from "@/lib/studio/learning"
import { callAi } from "@/lib/studio/ai"
import { downloadFile } from "@/lib/studio/storage"
import { FocusTimer } from "./focus-timer"

const SKILLS: Record<string, string> = {
  speaking: "Hội thoại",
  listening: "Nghe hiểu",
  reading: "Đọc hiểu",
  writing: "Viết đoạn / essay",
  grammar: "Ngữ pháp",
  vocabulary: "Từ vựng",
}
type Turn = { role: "user" | "assistant"; text: string }
export function LearningCenter({ lang }: { lang: "en" | "ko" }) {
  const [view, setView] = useState("path"),
    [unit, setUnit] = useState<LearningUnit | null>(null),
    [skill, setSkill] = useState("speaking"),
    [level, setLevel] = useState(lang === "en" ? "A2" : "Sơ cấp"),
    [topic, setTopic] = useState("Một cuộc gặp ở thư viện"),
    [message, setMessage] = useState(""),
    [turns, setTurns] = useState<Turn[]>([]),
    [result, setResult] = useState<ReturnType<typeof tutorSchema.parse> | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [corrections, setCorrections] = useState(true),
    [transcript, setTranscript] = useState(false),
    [answer, setAnswer] = useState(""),
    [assessment, setAssessment] = useState(false),
    [answers, setAnswers] = useState<Record<number, string>>({}),
    [diagnosed, setDiagnosed] = useState(false),
    [listening, setListening] = useState(false)
  const abort = useRef<AbortController | null>(null),
    recognition = useRef<{ stop: () => void } | null>(null)
  useEffect(() => {
    setUnit(null)
    setTurns([])
    setResult(null)
    setLevel(lang === "en" ? "A2" : "Sơ cấp")
    setAnswers({})
    setDiagnosed(false)
    return () => {
      abort.current?.abort()
      recognition.current?.stop()
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel()
    }
  }, [lang])
  const speak = (text: string, slow = false) => {
    if (!("speechSynthesis" in window))
      return toast.info(
        "Trình duyệt chưa có đọc văn bản. Bạn vẫn có thể xem bản chữ.",
      )
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === "en" ? "en-US" : "ko-KR"
    u.rate = slow ? 0.72 : 0.95
    speechSynthesis.speak(u)
  }
  const listen = () => {
    type Recognition = {
      lang: string
      interimResults: boolean
      onresult: (event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>
      }) => void
      onerror: (event: { error: string }) => void
      onend: () => void
      start: () => void
      stop: () => void
    }
    const api = window as unknown as {
      SpeechRecognition?: new () => Recognition
      webkitSpeechRecognition?: new () => Recognition
    }
    const Constructor = api.SpeechRecognition || api.webkitSpeechRecognition
    if (!Constructor)
      return toast.info(
        "Trình duyệt này chưa hỗ trợ nhận giọng nói. Bạn có thể gõ lời đáp, hoặc dùng nhập giọng nói trên bàn phím.",
      )
    if (listening) {
      recognition.current?.stop()
      return
    }
    const r = new Constructor()
    r.lang = lang === "en" ? "en-US" : "ko-KR"
    r.interimResults = false
    r.onresult = (e) =>
      setMessage(
        (prev) =>
          prev +
          (prev ? " " : "") +
          Array.from(e.results)
            .map((x) => x[0].transcript)
            .join(" "),
      )
    r.onerror = (e) => {
      toast.info(
        e.error === "not-allowed"
          ? "Bạn có thể gõ lời đáp nếu không muốn dùng micro."
          : "Chưa nhận được giọng nói. Bạn có thể thử lại hoặc gõ.",
      )
      setListening(false)
    }
    r.onend = () => setListening(false)
    recognition.current = r
    setListening(true)
    r.start()
  }
  const ask = async (initial = false) => {
    if (busy) return
    abort.current = new AbortController()
    setBusy(true)
    const text = initial
      ? "Hãy mở đầu một lượt luyện ngắn, hỏi một câu để mình thử."
      : message.trim()
    if (!text) {
      setBusy(false)
      return
    }
    if (!initial) {
      setTurns((prev) => [...prev, { role: "user", text }])
      setMessage("")
    }
    try {
      const value = tutorSchema.parse(
        await callAi(
          "learning-tutor",
          {
            text: JSON.stringify({
              lang,
              level,
              skill,
              topic,
              unit,
              corrections,
              history: (() => {
                const out: Turn[] = []
                let size = 0
                for (const t of [...turns].reverse()) {
                  if (size + t.text.length > 6000) break
                  out.unshift(t)
                  size += t.text.length
                  if (out.length === 6) break
                }
                return out
              })(),
              message: text,
            }),
          },
          abort.current.signal,
        ),
      )
      abort.current.signal.throwIfAborted()
      const userText = [
        text,
        ...turns.filter((t) => t.role === "user").map((t) => t.text),
      ].join("\n")
      setResult({
        ...value,
        feedback: corrections
          ? value.feedback.filter(
              (f) => f.original.trim() && userText.includes(f.original),
            )
          : [],
      })
      setTurns((prev) => [...prev, { role: "assistant", text: value.reply }])
    } catch (e) {
      if (!abort.current.signal.aborted) {
        if (!initial) setMessage(text)
        toast.error((e as Error).message)
      }
    } finally {
      setBusy(false)
    }
  }
  const choose = (u: LearningUnit) => {
    setUnit(u)
    setSkill(u.skill)
    setLevel(u.level)
    setTopic(u.title)
    setView("practice")
    setResult(null)
    setTurns([])
    setTranscript(false)
    setAnswer("")
  }
  const questions =
    lang === "en"
      ? [
          {
            q: "Chọn câu nói một thói quen của cô ấy.",
            options: [
              "She study every day.",
              "She studies every day.",
              "She studying every day.",
            ],
            answer: 1,
            why: "Hiện tại đơn với she thường thêm -s vào động từ.",
          },
          {
            q: "Đặt câu hỏi về hôm qua.",
            options: ["Did you go?", "Did you went?", "Do you went?"],
            answer: 0,
            why: "Sau did, động từ chính dùng dạng gốc.",
          },
          {
            q: "Chọn cách nêu giới hạn một kết quả.",
            options: [
              "This proves everything.",
              "The evidence suggests a pattern but does not establish causation.",
              "Evidence never matters.",
            ],
            answer: 1,
            why: "Cần phân biệt một khuynh hướng với bằng chứng về quan hệ nhân quả.",
          },
        ]
      : [
          {
            q: "Chọn lời chào lịch sự thông dụng.",
            options: ["안녕하세요.", "책이에요.", "먹어요."],
            answer: 0,
            why: "안녕하세요 là lời chào lịch sự thông dụng.",
          },
          {
            q: "Trong 저는 책을 읽어요, 책을 là gì?",
            options: ["Thời gian", "Đối tượng của hành động đọc", "Chủ đề"],
            answer: 1,
            why: "을 đánh dấu 책 là đối tượng của hành động đọc.",
          },
          {
            q: "그래서 thường nối ý theo quan hệ nào?",
            options: [
              "Kết quả / vì vậy",
              "Tương phản / tuy nhiên",
              "Chỉ thời gian tương lai",
            ],
            answer: 0,
            why: "그래서 thường diễn đạt kết quả hoặc hệ quả từ câu trước.",
          },
        ]
  const score = questions.filter(
    (q, i) => Number(answers[i]) === q.answer && answers[i] !== undefined,
  ).length
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-serif text-2xl">Chọn cách học hợp với lúc này</h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Mình có thể giúp bạn tìm một chỗ bắt đầu, thử một đoạn hội thoại hay
          cùng xem bài viết. Lộ trình là gợi ý để chọn, không đặt lịch hoặc yêu
          cầu học đủ.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["path", "Tìm chỗ bắt đầu"],
            ["practice", "Cùng luyện"],
            ["sources", "Nguồn chính thức"],
            ["focus", "Khoảng tập trung"],
          ].map(([id, label]) => (
            <Button
              key={id}
              variant={view === id ? "primary" : "outline"}
              onClick={() => setView(id)}
            >
              {label}
            </Button>
          ))}
          <Link
            href="/studio/documents"
            className="rounded-xl border border-violet-100 px-4 py-2 text-sm text-violet-600"
          >
            Học từ tài liệu của mình
          </Link>
        </div>
      </Card>
      {view === "path" && (
        <>
          <Card className="p-5">
            <h3 className="font-medium">Nếu chưa biết chọn mức nào</h3>
            <p className="my-3 text-sm leading-7 text-slate-500">
              Bạn có thể tự chọn một chủ đề bên dưới, hoặc thử ba câu để tìm
              điểm bắt đầu. Đây không phải bài xác định CEFR/TOPIK hay đánh giá
              năng lực toàn diện.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setAssessment((v) => !v)
                setDiagnosed(false)
              }}
            >
              {assessment ? "Để lúc khác" : "Thử vài câu gợi ý"}
            </Button>
            {assessment && (
              <div className="mt-4 space-y-5">
                {questions.map((q, i) => (
                  <div key={i}>
                    <p className="mb-2 text-sm">{q.q}</p>
                    <Select
                      aria-label={`Câu gợi ý ${i + 1}`}
                      value={answers[i] ?? ""}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [i]: e.target.value }))
                      }
                    >
                      <option value="">Chọn khi bạn muốn</option>
                      {q.options.map((o, j) => (
                        <option key={j} value={j}>
                          {o}
                        </option>
                      ))}
                    </Select>
                    {diagnosed && (
                      <p className="mt-2 text-xs leading-6 text-slate-500">
                        {q.why}
                      </p>
                    )}
                  </div>
                ))}
                <Button
                  disabled={Object.keys(answers).length < 3}
                  onClick={() => setDiagnosed(true)}
                >
                  Xem gợi ý bắt đầu
                </Button>
                {diagnosed && (
                  <p className="text-sm leading-7 text-violet-700">
                    {score < 2
                      ? "Bạn có thể thử những chủ đề nền tảng trước, rồi chọn tiếp điều thấy hứng thú."
                      : "Bạn có thể thử đọc, viết hoặc hội thoại với ngữ cảnh dài hơn nếu muốn."}{" "}
                    Bạn vẫn có thể chọn bất kỳ chủ đề nào bên dưới.
                  </p>
                )}
              </div>
            )}
          </Card>
          <div className="grid gap-3 md:grid-cols-2">
            {LEARNING_UNITS.filter((u) => u.lang === lang).map((u) => (
              <button
                key={u.id}
                className="rounded-2xl border border-white bg-white/80 p-5 text-left"
                onClick={() => choose(u)}
              >
                <small className="text-violet-500">
                  {u.level} · {SKILLS[u.skill] || u.skill}
                </small>
                <h3 className="mt-2 font-medium">{u.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  {u.practice}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
      {view === "practice" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="space-y-4 p-5">
            <h3 className="font-medium">Bạn muốn thử điều gì?</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <Label>Kỹ năng</Label>
                <Select
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                >
                  {[
                    ["speaking", "Hội thoại"],
                    ["listening", "Nghe hiểu"],
                    ["reading", "Đọc hiểu"],
                    ["writing", "Viết đoạn / essay"],
                    ["grammar", "Ngữ pháp"],
                    ["vocabulary", "Từ vựng"],
                  ].map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <Label>Mức bạn muốn thử</Label>
                <Input
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  placeholder="A1, B1, sơ cấp…"
                />
              </label>
            </div>
            <label className="block">
              <Label>Tình huống / Chủ đề</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
            </label>
            {unit && (
              <div className="rounded-xl bg-violet-50 p-4">
                <h4 className="font-medium">{unit.title}</h4>
                <p className="mt-2 text-sm leading-7">{unit.guide}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Khung và ví dụ do Bloom biên soạn; nguồn bên dưới là tài
                  nguyên để bạn tự đối chiếu, không phải chứng nhận nội dung AI.
                </p>
                <a
                  className="mt-2 block text-xs text-violet-600 underline"
                  href={LEARNING_SOURCES[unit.source].url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {LEARNING_SOURCES[unit.source].name}
                </a>
                {skill !== "listening" || transcript ? (
                  unit.examples.map((e, i) => (
                    <p key={i} className="mt-3 text-sm leading-7">
                      {e}
                    </p>
                  ))
                ) : (
                  <p className="mt-3 text-sm">
                    Bạn có thể nghe trước rồi mở bản chữ để đối chiếu.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => speak(unit.examples[0])}
                  >
                    Nghe ví dụ
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => speak(unit.examples[0], true)}
                  >
                    Nghe chậm
                  </Button>
                  {skill === "listening" && (
                    <Button
                      variant="ghost"
                      onClick={() => setTranscript((v) => !v)}
                    >
                      {transcript ? "Ẩn bản chữ" : "Xem bản chữ"}
                    </Button>
                  )}
                </div>
                <p className="mt-4 text-sm leading-7">{unit.practice}</p>
                <Textarea
                  rows={4}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Bạn thử tự trả lời trước, rồi có thể gửi ở ô bên phải để cùng xem lại."
                />
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => setMessage(answer)}
                >
                  Đưa câu trả lời sang chỗ cùng luyện
                </Button>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={corrections}
                onChange={(e) => setCorrections(e.target.checked)}
              />{" "}
              Mình muốn nhận góp ý sau mỗi lượt
            </label>
            <Button loading={busy} onClick={() => ask(true)}>
              Mở đầu một lượt luyện với AI
            </Button>
            <p className="text-xs leading-6 text-slate-500">
              Phần AI tạo là bài tập và phản hồi tham khảo, có thể sai. Không tự
              ghi âm hoặc tự phát tiếng; chức năng đọc dùng giọng sẵn có của
              thiết bị/trình duyệt.
            </p>
          </Card>
          <Card className="space-y-4 p-5">
            <h3 className="font-medium">Cùng thử từng chút</h3>
            <div className="max-h-[450px] space-y-3 overflow-auto">
              {turns.map((t, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-4 text-sm leading-7 ${t.role === "user" ? "bg-slate-50" : "bg-violet-50"}`}
                >
                  <small className="text-slate-400">
                    {t.role === "user" ? "Bạn" : "Bloom · AI"}
                  </small>
                  <p className="whitespace-pre-wrap">{t.text}</p>
                  {t.role === "assistant" && (
                    <Button
                      className="mt-2"
                      variant="ghost"
                      onClick={() => speak(t.text)}
                    >
                      Nghe câu này
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {result && (
              <>
                <details>
                  <summary className="cursor-pointer text-sm text-violet-600">
                    Giải thích / nghĩa tiếng Việt
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                    {result.translation}
                  </p>
                </details>
                {result.feedback.map((f, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-slate-50 p-3 text-sm leading-7"
                  >
                    <p>Đoạn bạn viết: {f.original}</p>
                    <p>Gợi ý: {f.suggested}</p>
                    <p className="text-xs text-slate-500">{f.why}</p>
                  </div>
                ))}
                {result.next && (
                  <p className="text-sm leading-7 text-violet-600">
                    Nếu muốn thử tiếp: {result.next}
                  </p>
                )}
              </>
            )}
            <Textarea
              rows={7}
              maxLength={12000}
              aria-label="Lời đáp hoặc bài viết để cùng luyện"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bạn có thể gõ lời đáp, dán đoạn viết hoặc hỏi lại điều chưa rõ."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                loading={busy}
                disabled={!message.trim()}
                onClick={() => ask()}
              >
                Cùng xem câu này
              </Button>
              <Button variant="outline" onClick={listen}>
                {listening ? "Dừng micro" : "Dùng micro nếu muốn"}
              </Button>
              {busy && (
                <Button
                  variant="outline"
                  onClick={() => abort.current?.abort()}
                >
                  Dừng
                </Button>
              )}
            </div>
            <p className="text-xs leading-6 text-slate-500">
              Nhận giọng nói phụ thuộc trình duyệt và có thể dùng dịch vụ của
              nhà cung cấp trình duyệt. Bạn có thể từ chối micro và gõ thay thế.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  abort.current?.abort()
                  recognition.current?.stop()
                  if (typeof speechSynthesis !== "undefined")
                    speechSynthesis.cancel()
                  setView("path")
                }}
              >
                Để lúc khác
              </Button>
              <Button
                variant="outline"
                disabled={!turns.length}
                onClick={() =>
                  downloadFile(
                    "buoi-cung-luyen.txt",
                    turns
                      .map(
                        (t) =>
                          (t.role === "user" ? "Bạn" : "Bloom AI") +
                          ": " +
                          t.text,
                      )
                      .join("\n\n"),
                    "text/plain;charset=utf-8",
                  )
                }
              >
                Giữ bản ghi chữ
              </Button>
            </div>
          </Card>
        </div>
      )}
      {view === "sources" && (
        <Card className="space-y-5 p-5">
          <h3 className="font-medium">Nguồn để bạn tự tìm hiểu và đối chiếu</h3>
          <p className="text-sm leading-7 text-slate-500">
            Bloom liên kết đến tài nguyên chính thức, không sao chép nguyên khóa
            học hoặc gắn nhãn bài AI là nội dung của các tổ chức này.
          </p>
          {Object.values(LEARNING_SOURCES).map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-violet-100 p-4 text-sm text-violet-700 underline"
            >
              {s.name}
            </a>
          ))}
          <p className="text-xs leading-6 text-slate-500">
            Cách dùng gợi ý: đọc/nghe một phần ngắn → tự nhớ và diễn đạt lại →
            đối chiếu → để hôm khác xem lại nếu muốn. Tự kiểm tra và ôn cách
            quãng có cơ sở nghiên cứu; đồng hồ tập trung chỉ là tiện ích chia
            thời gian.
          </p>
          <a
            href="https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-violet-700 underline"
          >
            Tổng quan nghiên cứu về kỹ thuật học
          </a>
        </Card>
      )}
      {view === "focus" && <FocusTimer />}
    </div>
  )
}
