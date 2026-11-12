"use client"

import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { BookMarked, Check, ChevronDown, ExternalLink, ListPlus, Plus, Quote, RotateCcw, Search } from "lucide-react"
import { Badge, Button, Input, Select } from "@/components/studio/ui"
import { callAi, useAiStatus } from "@/lib/studio/ai"
import { STYLE_LABEL, inText, refHtml, searchWorks, sortRefs, type Ref, type Style } from "@/lib/studio/cite"
import { uid, useStored } from "@/lib/studio/storage"
import { cn } from "@/lib/utils"

export type CiteTarget = { kind: "range"; range: Range; text: string } | { kind: "block"; node: Node; text: string }

type Found = Omit<Ref, "id" | "addedAt">
type Cand = Found & { key: string; score?: number; reason?: string }
type Claim = { claim: string; why: string; query: string; results: Cand[]; showAll?: boolean; searching?: boolean }

const SCORE: Record<number, { label: string; cls: string }> = {
  3: { label: "Rất phù hợp", cls: "bg-emerald-50 text-emerald-700" },
  2: { label: "Liên quan", cls: "bg-sky-50 text-sky-700" },
  1: { label: "Liên quan một phần", cls: "bg-amber-50 text-amber-700" },
  0: { label: "Ít liên quan", cls: "bg-slate-100 text-slate-500" },
}

const keyOf = (w: Found) => (w.doi ?? w.title).toLowerCase()
const titleKey = (w: Found) => "t:" + w.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const authorLine = (w: Found) =>
  w.authors.length === 0 ? "Không rõ tác giả" : w.authors.length > 3 ? `${w.authors[0].family} và cộng sự` : w.authors.map((a) => a.family).join(", ")

/* ---------- Inserting the in-text citation into the editor ---------- */

function textNodes(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return [root as Text]
  const out: Text[] = []
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (w.nextNode()) out.push(w.currentNode as Text)
  return out
}

/** Put " (Author, Year)" right before the sentence-ending punctuation at `offset` in `node`. */
function insertAt(node: Text, offset: number, cite: string) {
  const t = node.data
  let off = offset
  const before = t.slice(0, off)
  const m = before.match(/[.!?。]+["”’)]*\s*$/)
  if (m) off -= m[0].length
  const head = t.slice(0, off).replace(/\s+$/, "")
  node.data = `${head} ${cite}${t.slice(off)}`
}

function sentenceEnd(t: string, from: number) {
  const m = t.slice(from).match(/[.!?。]/)
  return m && m.index !== undefined ? from + m.index + 1 : t.length
}

function insertCitation(editor: HTMLElement, target: CiteTarget, cite: string, claim?: string) {
  const root = target.kind === "range" ? target.range.commonAncestorContainer : target.node
  if (!editor.contains(root)) return false
  const nodes = textNodes(root).filter((n) => editor.contains(n))

  // Prefer placing the citation right after the sentence that holds the claim.
  const probe = claim?.trim().slice(0, 40)
  if (probe && probe.length >= 8) {
    for (const n of nodes) {
      const i = n.data.indexOf(probe)
      if (i >= 0) {
        insertAt(n, sentenceEnd(n.data, i + probe.length), cite)
        return true
      }
    }
  }
  if (target.kind === "range" && target.range.endContainer.nodeType === Node.TEXT_NODE && editor.contains(target.range.endContainer)) {
    insertAt(target.range.endContainer as Text, target.range.endOffset, cite)
    return true
  }
  const last = [...nodes].reverse().find((n) => n.data.trim())
  if (!last) return false
  insertAt(last, last.data.replace(/\s+$/, "").length, cite)
  return true
}

/* ---------- Panel ---------- */

export function CiteFinder({
  editorRef,
  capture,
  preview,
  citedIds,
  onCite,
  onEdited,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>
  capture: () => CiteTarget | null
  preview: string
  citedIds: string[]
  onCite: (refId: string) => void
  onEdited: () => void
}) {
  const ai = useAiStatus()
  const [refs, setRefs] = useStored<Ref[]>("bloom.research.refs", [])
  const [style, setStyle] = useStored<Style>("bloom.research.style", "apa")
  const [target, setTarget] = useState<CiteTarget | null>(null)
  const [busy, setBusy] = useState<"" | "analyze" | "search" | "rank">("")
  const [advice, setAdvice] = useState("")
  const [claims, setClaims] = useState<Claim[]>([])
  const [open, setOpen] = useState<string | null>(null)

  const cited = refs.filter((r) => citedIds.includes(r.id))

  const rank = async (paragraph: string, list: Claim[]) => {
    const all = list.flatMap((c, ci) => c.results.map((r) => ({ ci, r })))
    if (!all.length || !ai) return list
    setBusy("rank")
    try {
      const payload = {
        paragraph,
        claims: list.map((c, i) => ({ i, claim: c.claim })),
        candidates: all.map(({ ci, r }, i) => ({
          i,
          claim: ci,
          title: r.title,
          year: r.year,
          journal: r.container,
          abstract: r.abstract?.slice(0, 450) ?? "(không có tóm tắt)",
        })),
      }
      const res = await callAi<{ ranked?: { i: number; score: number; reason: string }[] }>("cite-rank", { text: JSON.stringify(payload) })
      const byIndex = new Map((res.ranked ?? []).filter((x) => Number.isInteger(x.i) && x.i >= 0 && x.i < all.length).map((x) => [x.i, x]))
      return list.map((c, ci) => ({
        ...c,
        results: c.results
          .map((r) => {
            const idx = all.findIndex((a) => a.ci === ci && a.r.key === r.key)
            const v = byIndex.get(idx)
            return v ? { ...r, score: Math.max(0, Math.min(3, Math.round(Number(v.score) || 0))), reason: String(v.reason ?? "") } : r
          })
          .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
      }))
    } catch {
      toast.warning("Không chấm được độ liên quan, kết quả hiển thị theo thứ tự của Crossref.")
      return list
    }
  }

  const searchClaims = async (list: Claim[]) => {
    setBusy("search")
    const seen = new Set<string>()
    const out: Claim[] = []
    const results = await Promise.all(list.map((c) => searchWorks(c.query, 6, true).catch(() => null)))
    if (results.every((r) => r === null)) throw new Error("Không kết nối được Crossref, kiểm tra mạng rồi thử lại.")
    list.forEach((c, i) => {
      const cands = (results[i] ?? [])
        .filter((w) => w.title && !seen.has(keyOf(w)) && !seen.has(titleKey(w)))
        .map((w) => {
          seen.add(keyOf(w))
          seen.add(titleKey(w))
          return { ...w, key: keyOf(w) }
        })
      out.push({ ...c, results: cands })
    })
    return out
  }

  const find = async () => {
    const t = capture()
    if (!t) return toast.info("Đặt con trỏ vào đoạn văn cần dẫn nguồn, hoặc bôi đen đoạn đó (ít nhất vài câu).")
    setTarget(t)
    setClaims([])
    setAdvice("")
    try {
      let list: Claim[]
      if (ai) {
        setBusy("analyze")
        const res = await callAi<{ advice?: string; claims?: { claim?: string; why?: string; query?: string }[] }>("cite-queries", { text: t.text.slice(0, 4000) })
        setAdvice(String(res.advice ?? ""))
        list = (res.claims ?? [])
          .filter((c) => c && typeof c.query === "string" && c.query.trim())
          .slice(0, 3)
          .map((c) => ({ claim: String(c.claim ?? ""), why: String(c.why ?? ""), query: c.query!.trim(), results: [] }))
        if (!list.length) {
          setBusy("")
          return
        }
      } else {
        list = [{ claim: "", why: "", query: t.text.slice(0, 200), results: [] }]
      }
      list = await searchClaims(list)
      setClaims(list)
      setClaims(await rank(t.text, list))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy("")
    }
  }

  const research = async (ci: number) => {
    const c = claims[ci]
    if (!c.query.trim()) return
    setClaims((cs) => cs.map((x, i) => (i === ci ? { ...x, searching: true } : x)))
    try {
      const res = await searchWorks(c.query, 6, true)
      let next: Claim = { ...c, searching: false, results: res.filter((w) => w.title).map((w) => ({ ...w, key: keyOf(w) })) }
      if (target) next = (await rank(target.text, [next]))[0]
      setClaims((cs) => cs.map((x, i) => (i === ci ? next : x)))
    } catch {
      toast.error("Không kết nối được Crossref.")
      setClaims((cs) => cs.map((x, i) => (i === ci ? { ...x, searching: false } : x)))
    } finally {
      setBusy("")
    }
  }

  const ensureRef = (w: Cand): Ref => {
    const existing = refs.find((r) => (w.doi && r.doi?.toLowerCase() === w.doi.toLowerCase()) || r.title === w.title)
    if (existing) return existing
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { key, score, reason, ...rest } = w
    const r: Ref = { ...rest, id: uid(), addedAt: Date.now(), verified: true }
    setRefs((rs) => [...rs, r])
    return r
  }

  const cite = (w: Cand, claim: string) => {
    const el = editorRef.current
    if (!el || !target) return
    const r = ensureRef(w)
    const allRefs = refs.some((x) => x.id === r.id) ? refs : [...refs, r]
    const n = sortRefs(allRefs, style).findIndex((x) => x.id === r.id) + 1
    const text = inText(r, style, n)
    if (!insertCitation(el, target, text, claim)) return toast.warning("Đoạn văn đã thay đổi, hãy bấm Tìm nguồn lại.")
    onCite(r.id)
    onEdited()
    toast.success(`Đã chèn ${text} và lưu nguồn vào thư viện.`)
  }

  const insertBibliography = () => {
    const el = editorRef.current
    if (!el || !cited.length) return
    el.querySelectorAll("[data-bloom-refs]").forEach((n) => n.remove())
    const heading = style === "mla" ? "Works Cited" : style === "chicago" ? "Bibliography" : "References"
    const list = sortRefs(cited, style)
    const html =
      `<h2 data-bloom-refs="1">${heading}</h2>` +
      list.map((r, i) => `<p data-bloom-refs="1">${refHtml(r, style, style === "ieee" ? refs.findIndex((x) => x.id === r.id) + 1 || i + 1 : i + 1)}</p>`).join("")
    el.insertAdjacentHTML("beforeend", html)
    onEdited()
    toast.success("Đã chèn danh mục tài liệu tham khảo vào cuối bài.")
  }

  const EXAMPLE: Record<Style, string> = { apa: "(Smith, 2020)", mla: "(Smith)", chicago: "(Smith, 2020)", ieee: "[1]" }
  const hasBib = !!editorRef.current?.querySelector("[data-bloom-refs]")
  const step = !preview ? 1 : !claims.length && !advice ? 2 : !cited.length ? 3 : 4

  return (
    <div className="space-y-1">
      <p className="mb-3 text-sm leading-relaxed text-slate-600">
        Tìm bài báo khoa học thật để dẫn nguồn cho đoạn văn của bạn. Làm lần lượt 4 bước dưới đây:
      </p>

      <Step n={1} title="Chọn đoạn văn cần nguồn" done={!!preview} active={step === 1}>
        <p className="text-xs leading-relaxed text-slate-500">Bấm vào một đoạn trong bài (hoặc bôi đen vài câu). Đoạn được chọn sẽ tô vàng trong bài.</p>
        <div className={cn("mt-2 rounded-lg px-3 py-2 text-xs", preview ? "bg-amber-50 text-slate-700 ring-1 ring-amber-200" : "bg-slate-50 text-slate-400")}>
          {preview ? <span className="line-clamp-3">{preview}</span> : "Chưa chọn đoạn nào."}
        </div>
      </Step>

      <Step n={2} title="Tìm nguồn" done={claims.length > 0 || (!!advice && !busy)} active={step === 2}>
        <p className="text-xs leading-relaxed text-slate-500">AI đọc đoạn văn, chỉ ra câu nào cần dẫn nguồn và tìm bài báo thật trên Crossref (mất khoảng 15–30 giây).</p>
        <Button className="mt-2 w-full" icon={Search} loading={!!busy} disabled={!preview && !busy} onClick={find}>
          {busy === "analyze" ? "Đang đọc đoạn văn..." : busy === "search" ? "Đang tìm bài báo..." : busy === "rank" ? "Đang so độ liên quan..." : claims.length ? "Tìm lại cho đoạn đang chọn" : "Tìm nguồn cho đoạn này"}
        </Button>
        {ai === false && <p className="mt-1.5 text-xs text-amber-700">Chưa có AI: web tìm theo chính câu chữ của đoạn. Bạn nên sửa ô từ khóa thành vài từ tiếng Anh.</p>}
        {advice && <div className="mt-2 rounded-lg bg-violet-50/70 px-3 py-2 text-xs leading-relaxed text-slate-700 ring-1 ring-violet-100">{advice}</div>}
        {!busy && target && advice && claims.length === 0 && <p className="mt-2 text-xs text-slate-500">Đoạn này chủ yếu là ý của bạn, chưa cần dẫn nguồn. Thử chọn đoạn khác.</p>}
      </Step>

      <Step n={3} title="Chọn bài phù hợp và chèn trích dẫn" done={cited.length > 0} active={step === 3} last={false}>
        <p className="text-xs leading-relaxed text-slate-500">
          Mỗi ý cần nguồn có vài bài báo, xếp theo mức phù hợp. Bấm <b>Chèn trích dẫn</b> để thêm <b>{EXAMPLE[style]}</b> vào cuối câu đó.
        </p>
        {claims.map((c, ci) => {
          const shown = c.showAll ? c.results : c.results.filter((r) => r.score === undefined || r.score >= 1)
          const hidden = c.results.length - shown.length
          return (
            <div key={ci} className="mt-2 space-y-2 rounded-xl p-2.5 ring-1 ring-slate-200">
              {c.claim && (
                <div>
                  <p className="text-[11px] font-medium tracking-wide text-violet-600 uppercase">Ý cần nguồn {claims.length > 1 ? ci + 1 : ""}</p>
                  <p className="mt-0.5 flex gap-1.5 text-sm font-medium text-slate-800">
                    <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
                    <span className="break-words">{c.claim}</span>
                  </p>
                  {c.why && <p className="mt-1 pl-5 text-xs text-slate-500">{c.why}</p>}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  research(ci)
                }}
              >
                <label className="text-[11px] text-slate-500">Từ khóa đang tìm (tiếng Anh). Kết quả chưa đúng thì sửa rồi bấm Tìm lại:</label>
                <div className="mt-1 flex gap-1.5">
                  <Input
                    value={c.query}
                    onChange={(e) => setClaims((cs) => cs.map((x, i) => (i === ci ? { ...x, query: e.target.value } : x)))}
                    className="h-8 text-xs"
                    aria-label="Từ khóa tìm kiếm"
                  />
                  <Button type="submit" size="sm" variant="outline" icon={RotateCcw} loading={c.searching} className="h-8">
                    Tìm lại
                  </Button>
                </div>
              </form>
              {shown.length === 0 && !c.searching && <p className="text-xs text-slate-500">Chưa thấy bài phù hợp. Thử đổi từ khóa rồi bấm Tìm lại.</p>}
              <ul className="space-y-2">
                {shown.map((w) => {
                  const inLib = refs.find((r) => (w.doi && r.doi?.toLowerCase() === w.doi.toLowerCase()) || r.title === w.title)
                  const isCited = inLib && citedIds.includes(inLib.id)
                  return (
                    <li key={w.key} className={cn("rounded-lg bg-white p-2.5 ring-1", isCited ? "ring-emerald-300" : "ring-slate-100")}>
                      <p className="text-sm leading-snug font-medium break-words text-slate-800">{w.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {authorLine(w)} · {w.year ?? "n.d."}
                        {w.container ? ` · ${w.container}` : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {w.score !== undefined && <Badge className={SCORE[w.score].cls}>{SCORE[w.score].label}</Badge>}
                        {w.abstract ? (
                          <button type="button" onClick={() => setOpen(open === w.key ? null : w.key)} className="inline-flex items-center gap-0.5 text-xs text-violet-600 hover:underline">
                            Đọc tóm tắt
                            <ChevronDown className={cn("h-3 w-3 transition", open === w.key && "rotate-180")} />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Không có tóm tắt</span>
                        )}
                        {w.doi && (
                          <a href={`https://doi.org/${w.doi}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-slate-500 hover:text-violet-600">
                            Mở bài gốc
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {w.reason && <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{w.reason}</p>}
                      {open === w.key && w.abstract && <p className="mt-1.5 rounded-md bg-slate-50 p-2 text-xs leading-relaxed text-slate-600">{w.abstract}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Button size="sm" icon={isCited ? Check : Plus} variant={isCited ? "soft" : "primary"} onClick={() => cite(w, c.claim)}>
                          {isCited ? "Đã chèn, chèn lại" : "Chèn trích dẫn"}
                        </Button>
                        {!inLib && (
                          <Button size="sm" variant="ghost" icon={BookMarked} onClick={() => (ensureRef(w), toast.success("Đã lưu vào Thư viện nguồn."))}>
                            Lưu để dùng sau
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {hidden > 0 && (
                <button type="button" className="text-xs text-violet-600 hover:underline" onClick={() => setClaims((cs) => cs.map((x, i) => (i === ci ? { ...x, showAll: true } : x)))}>
                  Hiện thêm {hidden} bài ít liên quan
                </button>
              )}
            </div>
          )
        })}
        {claims.length > 0 && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            Bài nào cũng có thật, nhưng AI chỉ đọc tiêu đề và tóm tắt. Hãy mở bài gốc đọc phần liên quan, chỉ trích khi nguồn thật sự nói điều đó.
          </p>
        )}
        {cited.length > 0 && <p className="mt-2 text-xs text-emerald-700">Đã trích dẫn {cited.length} nguồn trong bài. Lặp lại bước 1–3 cho các đoạn khác.</p>}
      </Step>

      <Step n={4} title="Thêm danh mục tài liệu ở cuối bài" done={hasBib} active={step === 4} last>
        <p className="text-xs leading-relaxed text-slate-500">Làm khi đã trích dẫn xong cả bài. Web tự tạo mục References liệt kê đủ các nguồn đã chèn, đúng kiểu bạn chọn.</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-xs text-slate-500">Kiểu</span>
          <Select value={style} onValueChange={(value) => setStyle(value as Style)} className="h-8 flex-1 text-xs" aria-label="Kiểu trích dẫn">
            {Object.entries(STYLE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <Button className="mt-2 w-full" size="sm" variant={step === 4 ? "primary" : "soft"} icon={ListPlus} onClick={insertBibliography} disabled={!cited.length}>
          {hasBib ? "Cập nhật danh mục cuối bài" : `Chèn danh mục (${cited.length} nguồn)`}
        </Button>
        <p className="mt-1.5 text-[11px] text-slate-400">Không biết chọn kiểu nào? Ngành ngôn ngữ thường dùng APA 7, hỏi lại thầy cô nếu đề bài có yêu cầu.</p>
      </Step>
    </div>
  )
}

function Step({ n, title, done, active, last, children }: { n: number; title: string; done: boolean; active: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
            done && !active ? "bg-emerald-500 text-white" : active ? "bg-violet-600 text-white ring-4 ring-violet-100" : "bg-slate-100 text-slate-500",
          )}
        >
          {done && !active ? <Check className="h-4 w-4" /> : n}
        </span>
        {!last && <span className="my-1 w-px flex-1 bg-slate-200" />}
      </div>
      <div className={cn("min-w-0 flex-1 pb-4", !active && !done && "opacity-70")}>
        <h3 className={cn("pt-1 text-sm font-semibold", active ? "text-slate-800" : "text-slate-600")}>{title}</h3>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  )
}
