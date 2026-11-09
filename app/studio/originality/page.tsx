"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { BadgeCheck, CircleAlert, CircleCheck, FileSearch, Info, Library, Plus, Quote, ScanSearch, Sparkles, Trash2, Type } from "lucide-react"
import { AiNotice, AiResult, Badge, Button, Card, Input, Label, PageHeader, Select, Stat, Tabs, Textarea } from "@/components/studio/ui"
import { TOOLS } from "@/lib/studio/tools"
import { readLS, uid, useStored } from "@/lib/studio/storage"
import { lookupDoi, refText, sortRefs, type Ref } from "@/lib/studio/cite"
import { normalizeLatin, textStats } from "@/lib/studio/text"
import { callAi } from "@/lib/studio/ai"
import { cn } from "@/lib/utils"

const tool = TOOLS.find((t) => t.slug === "originality")!

export default function OriginalityPage() {
  const [tab, setTab] = useState<"citations" | "compare" | "style">("citations")
  const [essay, setEssay] = useStored("bloom.originality.essay", "")
  const [writingDocs] = useStored<{ id: string; title: string; html: string }[]>("bloom.writing.docs", [])

  return (
    <div>
      <PageHeader
        icon={tool.icon}
        tint={tool.tint}
        title={tool.name} guide={tool.guide}
        desc="Tự rà soát trước khi nộp: trích dẫn có khớp danh mục không, đoạn nào trùng với nguồn bạn đã đọc, văn phong đã đủ học thuật chưa."
      />
      <Card className="mb-4 p-4">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <Label className="mb-0">Bước 1: đưa bài viết vào đây (dùng chung cho cả ba tab bên dưới)</Label>
          {writingDocs.length > 0 && (
            <Select
              value=""
              onChange={(e) => {
                const d = writingDocs.find((x) => x.id === e.target.value)
                if (!d) return
                const div = document.createElement("div")
                div.innerHTML = d.html
                div.querySelectorAll("p,h2,h3,li,blockquote").forEach((n) => n.append("\n\n"))
                setEssay(div.textContent!.replace(/\n{3,}/g, "\n\n").trim())
              }}
              className="h-8 w-auto max-w-full text-xs"
              aria-label="Lấy bài đang viết"
            >
              <option value="">Lấy bài đang viết...</option>
              {writingDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </Select>
          )}
        </div>
        <Textarea rows={8} value={essay} onChange={(e) => setEssay(e.target.value)} placeholder="Dán toàn bộ bài viết vào đây, kể cả mục References ở cuối bài. Hoặc chọn “Lấy bài đang viết” ở góc phải." />
        <p className="mt-1.5 text-xs text-slate-500">{textStats(essay).words.toLocaleString("vi-VN")} từ</p>
      </Card>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "citations", label: "1. Trích dẫn có khớp?", icon: Quote },
          { id: "compare", label: "2. Có chép nguyên văn?", icon: FileSearch },
          { id: "style", label: "3. Văn phong học thuật", icon: Type },
        ]}
      />
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50/80 px-3 py-2.5 text-sm leading-relaxed text-sky-900 ring-1 ring-sky-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <span>{INTRO[tab]}</span>
      </div>
      <div className="mt-4">
        {tab === "citations" && <CitationCheck essay={essay} />}
        {tab === "compare" && <CompareSources essay={essay} />}
        {tab === "style" && <StyleReview essay={essay} />}
      </div>
    </div>
  )
}

const INTRO = {
  citations:
    "Kiểm tra mỗi trích dẫn trong bài, ví dụ (Smith, 2020), đều có nguồn tương ứng trong danh mục tài liệu cuối bài, và ngược lại, nguồn nào ghi trong danh mục cũng được trích trong bài. Giáo viên rất hay trừ điểm lỗi này. Nếu bài đã có mục References ở cuối, web tự tách ra, bạn không cần dán gì thêm.",
  compare:
    "Dán đoạn văn gốc của bài báo hay sách bạn đã đọc. Web tô vàng những cụm từ trong bài bạn trùng nguyên văn với nguồn, để bạn diễn đạt lại bằng lời của mình hoặc đặt trong ngoặc kép kèm trích dẫn.",
  style:
    "Tìm những chỗ chưa đủ trang trọng cho bài học thuật: câu quá dài, từ viết tắt (don't, it's), từ thân mật (a lot, really), từ lặp lại nhiều. Bấm Nhận xét bài viết để AI góp ý thêm về bố cục và lập luận.",
} as const

const REF_HEADING = /^\s*(references|reference list|works cited|bibliography|tài liệu tham khảo|danh mục tài liệu tham khảo|참고\s*문헌)\s*:?\s*$/im

/** Split an essay into the body and the reference list under a "References"-style heading, if any. */
function splitRefs(essay: string) {
  const m = essay.match(REF_HEADING)
  if (!m || m.index === undefined) return { body: essay, refs: null as string | null }
  const refs = essay.slice(m.index + m[0].length).trim()
  return { body: essay.slice(0, m.index), refs: refs || null }
}

/* ---------------- Citation check ---------------- */

const NAME = "[\\p{Lu}][\\p{L}'’-]+"
const YEAR = "(\\d{4}[a-z]?|n\\.d\\.)"

function parseRefs(text: string) {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 8)
    .map((line) => {
      const surname = line.match(/^\s*(?:\[\d+\]\s*)?([\p{L}'’-]+)/u)?.[1] ?? ""
      const year = line.match(/\((\d{4}[a-z]?|n\.d\.)\)/)?.[1] ?? line.match(/\b((?:1[89]|20)\d{2}[a-z]?)\b/)?.[1] ?? ""
      return { line, surname, year, key: `${normalizeLatin(surname)}|${year}` }
    })
}

function parseCitations(text: string) {
  const found = new Map<string, { label: string; surname: string; year: string; count: number }>()
  const add = (surname: string, year: string, label: string) => {
    const key = `${normalizeLatin(surname)}|${year}`
    const cur = found.get(key)
    if (cur) cur.count++
    else found.set(key, { label, surname, year, count: 1 })
  }
  // Narrative: Smith (2020), Smith and Lee (2020), Smith et al. (2020, p. 4)
  const narrative = new RegExp(`(${NAME})((?:\\s+et al\\.)|(?:\\s+(?:and|&)\\s+${NAME}))?\\s+\\(${YEAR}[^)]*\\)`, "gu")
  for (const m of text.matchAll(narrative)) add(m[1], m[3], `${m[1]}${m[2] ?? ""} (${m[3]})`)
  // Parenthetical: (Smith, 2020; Lee & Park, 2019, p. 3)
  for (const m of text.matchAll(/\(([^()]{3,300})\)/g)) {
    for (const part of m[1].split(";")) {
      const y = part.match(new RegExp(YEAR))
      if (!y) continue
      const before = part.slice(0, y.index).replace(/\b(e\.g\.|see|cf\.|also)\b,?/gi, "")
      const name = before.match(new RegExp(NAME, "u"))?.[0]
      if (name) add(name, y[1], `(${part.trim()})`)
    }
  }
  const numeric = new Set<number>()
  for (const m of text.matchAll(/\[(\d+(?:\s*[-–,]\s*\d+)*)\]/g)) {
    for (const seg of m[1].split(",")) {
      const [a, b] = seg.split(/[-–]/).map((x) => parseInt(x))
      if (b && b >= a && b - a < 100) for (let i = a; i <= b; i++) numeric.add(i)
      else if (a) numeric.add(a)
    }
  }
  return { authorYear: Array.from(found.entries()), numeric }
}

function CitationCheck({ essay }: { essay: string }) {
  const [refsText, setRefsText] = useStored("bloom.originality.refs", "")
  const [doiStatus, setDoiStatus] = useState<Record<string, "ok" | "missing" | "error" | "checking">>({})

  const auto = useMemo(() => splitRefs(essay), [essay])
  const usingAuto = !refsText.trim() && !!auto.refs
  const refsSource = refsText.trim() ? refsText : auto.refs ?? ""

  const result = useMemo(() => {
    const refs = parseRefs(refsSource)
    const { authorYear, numeric } = parseCitations(auto.body)
    const refKeys = new Set(refs.map((r) => r.key))
    const refSurnames = new Set(refs.map((r) => normalizeLatin(r.surname)))
    const cited = authorYear.map(([key, c]) => ({
      ...c,
      status: refKeys.has(key) ? "ok" : refSurnames.has(normalizeLatin(c.surname)) ? "year" : "missing",
    }))
    const citedKeys = new Set(authorYear.map(([k]) => k))
    const uncited = refs.filter((r) => !citedKeys.has(r.key) && !(numeric.size && /^\s*\[\d+\]/.test(r.line)))
    const numericMissing = Array.from(numeric).filter((n) => n > refs.length)
    return { refs, cited, uncited, numeric, numericMissing }
  }, [auto.body, refsSource])

  const dois = useMemo(() => Array.from(new Set((refsSource.match(/10\.\d{4,9}\/[^\s"<>]+/gi) ?? []).map((d) => d.replace(/[.,;)\]]+$/, "")))), [refsSource])

  const loadLibrary = () => {
    const lib = readLS<Ref[]>("bloom.research.refs", [])
    if (!lib.length) return toast.info("Thư viện nguồn đang trống, hãy lưu bài báo ở trang Thư viện nguồn trước.")
    setRefsText(sortRefs(lib, "apa").map((r) => refText(r, "apa")).join("\n"))
    toast.success(`Đã lấy ${lib.length} nguồn (định dạng APA).`)
  }

  const checkDois = async () => {
    for (const d of dois.slice(0, 40)) {
      setDoiStatus((s) => ({ ...s, [d]: "checking" }))
      try {
        const w = await lookupDoi(d)
        setDoiStatus((s) => ({ ...s, [d]: w ? "ok" : "missing" }))
      } catch {
        setDoiStatus((s) => ({ ...s, [d]: "error" }))
      }
    }
  }

  const problems = result.cited.filter((c) => c.status !== "ok").length + result.uncited.length + result.numericMissing.length

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label className="mb-0">Danh mục tài liệu tham khảo</Label>
          <Button size="sm" variant="ghost" icon={Library} onClick={loadLibrary}>
            Lấy từ Thư viện nguồn
          </Button>
        </div>
        {usingAuto ? (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            <p className="flex items-center gap-2 font-medium">
              <CircleCheck className="h-4 w-4" />
              Đã tự tìm thấy danh mục ở cuối bài ({result.refs.length} nguồn)
            </p>
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-xs text-emerald-900/80">
              {result.refs.map((r) => (
                <li key={r.line} className="line-clamp-2">
                  {r.line}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setRefsText(auto.refs ?? "")} className="mt-2 text-xs font-medium text-emerald-700 underline">
              Sửa danh mục này
            </button>
          </div>
        ) : (
          <>
            <p className="mb-1.5 text-xs text-slate-500">
              Bài chưa có mục References ở cuối? Dán danh mục vào đây (mỗi nguồn một dòng), hoặc bấm Lấy từ Thư viện nguồn.
            </p>
            <Textarea rows={10} value={refsText} onChange={(e) => setRefsText(e.target.value)} placeholder="Smith, J. (2020). Title of the article. Journal, 12(3), 45–67. https://doi.org/..." />
            {refsText.trim() && auto.refs && (
              <button type="button" onClick={() => setRefsText("")} className="mt-1 text-xs text-violet-600 underline">
                Dùng danh mục có sẵn ở cuối bài
              </button>
            )}
          </>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="soft" icon={BadgeCheck} onClick={checkDois} disabled={!dois.length}>
            Kiểm tra {dois.length} DOI với Crossref
          </Button>
          {dois.length > 0 && <span className="text-xs text-slate-500">Xem các DOI có thật không (DOI sai là lỗi hay gặp khi chép nguồn)</span>}
        </div>
        {dois.length > 0 && Object.keys(doiStatus).length > 0 && (
          <ul className="mt-3 space-y-1.5 text-xs">
            {dois.map((d) => (
              <li key={d} className="flex items-center gap-2 break-all">
                <DoiIcon s={doiStatus[d]} />
                <span className="text-slate-600">{d}</span>
                {doiStatus[d] === "missing" && <span className="shrink-0 text-rose-600">không tồn tại</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Trích dẫn trong bài" value={result.cited.length + result.numeric.size} />
          <Stat label="Nguồn trong danh mục" value={result.refs.length} />
          <Stat label="Cần xem lại" value={<span className={problems ? "text-amber-600" : "text-emerald-600"}>{problems}</span>} />
        </div>
        {!essay.trim() ? (
          <p className="mt-4 text-sm text-slate-500">Dán bài viết ở ô phía trên để bắt đầu kiểm tra.</p>
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            {result.cited.length > 0 && (
              <div>
                <h3 className="mb-2 font-medium text-slate-700">Trích dẫn tác giả–năm</h3>
                <ul className="space-y-1.5">
                  {result.cited.map((c) => (
                    <li key={c.label + c.year} className="flex items-start gap-2">
                      {c.status === "ok" ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                      <span className="text-slate-700">
                        {c.label}
                        {c.count > 1 && <span className="text-slate-400"> ×{c.count}</span>}
                        {c.status === "missing" && <span className="block text-xs text-amber-700">Không có trong danh mục tài liệu.</span>}
                        {c.status === "year" && <span className="block text-xs text-amber-700">Có tác giả này nhưng năm không khớp.</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.numeric.size > 0 && (
              <div>
                <h3 className="mb-1 font-medium text-slate-700">Trích dẫn dạng số</h3>
                <p className="text-slate-600">
                  Dùng các số: {Array.from(result.numeric).sort((a, b) => a - b).join(", ")}
                  {result.numericMissing.length > 0 && <span className="block text-amber-700">Số {result.numericMissing.join(", ")} vượt quá số nguồn trong danh mục.</span>}
                </p>
              </div>
            )}
            {result.uncited.length > 0 && (
              <div>
                <h3 className="mb-2 font-medium text-slate-700">Có trong danh mục nhưng chưa được trích dẫn</h3>
                <ul className="space-y-1.5">
                  {result.uncited.map((r) => (
                    <li key={r.line} className="flex items-start gap-2 text-slate-600">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span className="line-clamp-2">{r.line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.cited.length === 0 && result.numeric.size === 0 && <p className="text-slate-500">Chưa phát hiện trích dẫn nào trong bài.</p>}
            {problems === 0 && (result.cited.length > 0 || result.numeric.size > 0) && (
              <p className="flex items-center gap-2 text-emerald-700">
                <CircleCheck className="h-4 w-4" />
                Mọi trích dẫn đều khớp với danh mục.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

function DoiIcon({ s }: { s?: string }) {
  if (s === "ok") return <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500" />
  if (s === "missing") return <CircleAlert className="h-4 w-4 shrink-0 text-rose-500" />
  if (s === "checking") return <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-violet-500" />
  if (s === "error") return <CircleAlert className="h-4 w-4 shrink-0 text-slate-400" />
  return <span className="h-4 w-4 shrink-0" />
}

/* ---------------- Compare with sources ---------------- */

type Source = { id: string; label: string; text: string }
type Tok = { w: string; start: number; end: number }

function tokenize(text: string): Tok[] {
  return Array.from(text.matchAll(/[\p{L}\p{N}]+/gu)).map((m) => ({ w: m[0].toLowerCase(), start: m.index!, end: m.index! + m[0].length }))
}

function quotedRanges(text: string) {
  return Array.from(text.matchAll(/“[^”]*”|"[^"\n]*"|「[^」]*」/g)).map((m) => [m.index!, m.index! + m[0].length] as const)
}

function CompareSources({ essay }: { essay: string }) {
  const [sources, setSources] = useStored<Source[]>("bloom.originality.sources", [])
  const [n, setN] = useState(5)
  const [skipQuotes, setSkipQuotes] = useState(true)

  const analysis = useMemo(() => {
    const toks = tokenize(essay)
    const quotes = skipQuotes ? quotedRanges(essay) : []
    const isQuoted = toks.map((t) => quotes.some(([a, b]) => t.start >= a && t.end <= b))
    const coveredBy: (number | null)[] = toks.map(() => null)
    const perSource = sources.map((s, si) => {
      const st = tokenize(s.text).map((t) => t.w)
      const set = new Set<string>()
      for (let i = 0; i + n <= st.length; i++) set.add(st.slice(i, i + n).join(" "))
      const mine = new Set<number>()
      for (let i = 0; i + n <= toks.length; i++) {
        if (set.has(toks.slice(i, i + n).map((t) => t.w).join(" "))) {
          for (let k = i; k < i + n; k++) {
            if (isQuoted[k]) continue
            mine.add(k)
            if (coveredBy[k] === null) coveredBy[k] = si
          }
        }
      }
      return mine.size
    })
    const counted = toks.filter((_, i) => !isQuoted[i]).length
    const covered = coveredBy.filter((c) => c !== null).length
    return { toks, coveredBy, perSource, counted, pct: counted ? (covered / counted) * 100 : 0 }
  }, [essay, sources, n, skipQuotes])

  const highlighted = useMemo(() => {
    const out: React.ReactNode[] = []
    let pos = 0
    const { toks, coveredBy } = analysis
    let i = 0
    while (i < toks.length) {
      if (coveredBy[i] === null) {
        i++
        continue
      }
      let j = i
      while (j + 1 < toks.length && coveredBy[j + 1] !== null) j++
      const a = toks[i].start
      const b = toks[j].end
      if (a > pos) out.push(essay.slice(pos, a))
      out.push(
        <mark key={a} className="rounded bg-amber-200/70 px-0.5 text-slate-900" title={sources[coveredBy[i]!]?.label}>
          {essay.slice(a, b)}
        </mark>,
      )
      pos = b
      i = j + 1
    }
    out.push(essay.slice(pos))
    return out
  }, [analysis, essay, sources])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        {sources.map((s, i) => (
          <Card key={s.id} className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Input value={s.label} onChange={(e) => setSources((ss) => ss.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))} className="h-9" />
              <Badge className="shrink-0 bg-amber-50 text-amber-700">{analysis.counted ? Math.round((analysis.perSource[i] / analysis.counted) * 100) : 0}%</Badge>
              <Button size="icon" variant="danger" icon={Trash2} aria-label="Xóa nguồn" onClick={() => setSources((ss) => ss.filter((x) => x.id !== s.id))} />
            </div>
            <Textarea rows={5} value={s.text} onChange={(e) => setSources((ss) => ss.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))} placeholder="Dán nội dung nguồn tham khảo..." />
          </Card>
        ))}
        <Button variant="outline" icon={Plus} className="w-full" onClick={() => setSources((ss) => [...ss, { id: uid(), label: `Nguồn ${ss.length + 1}`, text: "" }])}>
          Thêm nguồn để so khớp
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-slate-500">Tỷ lệ trùng với các nguồn đã dán</div>
            <div className={cn("text-3xl font-semibold", analysis.pct > 25 ? "text-rose-600" : analysis.pct > 10 ? "text-amber-600" : "text-emerald-600")}>
              {analysis.pct.toFixed(1)}%
            </div>
          </div>
          <label className="text-xs text-slate-500">
            Độ dài cụm
            <Select value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-1 h-9 w-24">
              {[3, 4, 5, 6, 8].map((x) => (
                <option key={x} value={x}>
                  {x} từ
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={skipQuotes} onChange={(e) => setSkipQuotes(e.target.checked)} className="accent-violet-600" />
          Không tính phần đặt trong ngoặc kép (trích dẫn trực tiếp)
        </label>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Chỉ so với những nguồn bạn dán vào đây. Đây không phải tỷ lệ đạo văn toàn diện như các hệ thống của trường. Đoạn tô vàng là cụm từ trùng nguyên văn, nên diễn đạt lại hoặc trích dẫn.
        </div>
        <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
          {essay.trim() ? highlighted : <span className="text-slate-400">Bài viết sẽ hiện ở đây với các đoạn trùng được tô màu.</span>}
        </div>
      </Card>
    </div>
  )
}

/* ---------------- Style review ---------------- */

const INFORMAL = ["a lot", "lots of", "really", "stuff", "things", "kind of", "sort of", "gonna", "wanna", "pretty much", "basically", "totally", "awesome", "nowadays", "okay", "plus", "anyway", "get", "got"]
const STOP = new Set(
  "the and that this with from have has were was are for not but they their there which what when will would could should into about than then them these those been being also such more most other some only very your our its his her can may might must each many much over just like because while where".split(
    " ",
  ),
)

function StyleReview({ essay }: { essay: string }) {
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState("")
  const [lang, setLang] = useState<"en" | "ko" | "vi">("en")

  const r = useMemo(() => {
    const sentences = essay.split(/(?<=[.!?。])\s+|\n+/).map((s) => s.trim()).filter(Boolean)
    const long = sentences.map((s) => ({ s, w: s.split(/\s+/).length })).filter((x) => x.w > (lang === "ko" ? 25 : 35))
    const lower = essay.toLowerCase()
    const contractions = Array.from(new Set(lower.match(/\b[a-z]+(?:n't|'re|'ve|'ll|'m|'d)\b/g) ?? []))
    const informal = INFORMAL.map((w) => ({ w, c: (lower.match(new RegExp(`\\b${w}\\b`, "g")) ?? []).length })).filter((x) => x.c)
    const firstPerson = (essay.match(/\b(I|me|my|we|our|us)\b/g) ?? []).length
    const freq = new Map<string, number>()
    for (const w of lower.match(/[\p{L}]{4,}/gu) ?? []) if (!STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1)
    const repeated = Array.from(freq.entries())
      .filter(([, c]) => c >= 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    // Korean speech levels: academic writing should use the plain -다 style consistently.
    const ends = sentences.map((s) => s.replace(/[.!?。"”']+$/, ""))
    const formal = ends.filter((s) => /니다$/.test(s)).length
    const polite = ends.filter((s) => /요$/.test(s)).length
    const plain = ends.filter((s) => /다$/.test(s) && !/니다$/.test(s)).length
    return { sentences, long, contractions, informal, firstPerson, repeated, ko: { formal, polite, plain } }
  }, [essay, lang])

  const runAi = async () => {
    if (!essay.trim()) return toast.info("Hãy dán bài viết trước.")
    setBusy(true)
    try {
      setAi((await callAi("structure", { text: essay, lang })).text)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const Item = ({ ok, title, children }: { ok: boolean; title: string; children?: React.ReactNode }) => (
    <div className="flex items-start gap-2.5 py-2">
      {ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
      <div className="min-w-0 text-sm">
        <div className="font-medium text-slate-700">{title}</div>
        {children && <div className="mt-1 text-slate-600">{children}</div>}
      </div>
    </div>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-medium text-slate-800">Rà soát tự động</h3>
          <Select value={lang} onChange={(e) => setLang(e.target.value as "en" | "ko" | "vi")} className="h-9 w-36">
            <option value="en">Tiếng Anh</option>
            <option value="ko">Tiếng Hàn</option>
            <option value="vi">Tiếng Việt</option>
          </Select>
        </div>
        {!essay.trim() ? (
          <p className="text-sm text-slate-500">Dán bài viết ở ô phía trên để bắt đầu.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            <Item ok={r.long.length === 0} title={r.long.length ? `${r.long.length} câu quá dài` : "Độ dài câu hợp lý"}>
              {r.long.slice(0, 3).map((x) => (
                <p key={x.s} className="mt-1 line-clamp-2 text-xs">
                  <span className="font-medium">{x.w} từ:</span> {x.s}
                </p>
              ))}
            </Item>
            {lang === "en" && (
              <>
                <Item ok={!r.contractions.length} title={r.contractions.length ? "Có từ viết tắt (nên viết đầy đủ trong văn học thuật)" : "Không dùng từ viết tắt"}>
                  {r.contractions.length > 0 && r.contractions.join(", ")}
                </Item>
                <Item ok={!r.informal.length} title={r.informal.length ? "Có từ ngữ thân mật" : "Không có từ ngữ thân mật"}>
                  {r.informal.length > 0 && r.informal.map((x) => `${x.w} (${x.c})`).join(", ")}
                </Item>
                <Item ok={r.firstPerson <= 3} title={`Ngôi thứ nhất: ${r.firstPerson} lần`}>
                  {r.firstPerson > 3 && "Kiểm tra lại yêu cầu đề bài; nhiều bài học thuật hạn chế dùng I/we."}
                </Item>
              </>
            )}
            {lang === "ko" && (
              <Item ok={!(r.ko.plain && (r.ko.formal || r.ko.polite))} title="Đuôi câu">
                -다: {r.ko.plain} câu · -니다: {r.ko.formal} câu · -요: {r.ko.polite} câu.
                {r.ko.plain > 0 && (r.ko.formal > 0 || r.ko.polite > 0) && " Đang trộn lẫn các cấp độ đuôi câu; văn viết học thuật thường dùng thống nhất đuôi -다."}
              </Item>
            )}
            <Item ok={!r.repeated.length} title={r.repeated.length ? "Từ lặp lại nhiều" : "Từ vựng đa dạng"}>
              {r.repeated.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {r.repeated.map(([w, c]) => (
                    <Badge key={w}>
                      {w} ×{c}
                    </Badge>
                  ))}
                </span>
              )}
            </Item>
          </div>
        )}
      </Card>
      <Card className="p-4">
        <h3 className="font-medium text-slate-800">Nhận xét chuyên sâu bằng AI</h3>
        <p className="mt-1 text-sm text-slate-500">Luận điểm, bố cục, lập luận và tính mạch lạc giữa các đoạn.</p>
        <div className="mt-3">
          <AiNotice />
        </div>
        <Button icon={Sparkles} loading={busy} onClick={runAi}>
          Nhận xét bài viết
        </Button>
        {ai && <AiResult text={ai} />}
        {!ai && !busy && (
          <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <ScanSearch className="h-4 w-4" />
            Kết quả sẽ hiện ở đây.
          </div>
        )}
      </Card>
    </div>
  )
}
