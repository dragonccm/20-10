"use client"
import { CitationCompanion } from "@/components/studio/citation-companion"
import { inText,refHtml } from "@/lib/studio/cite"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Bold,
  Check,
  Copy,
  FileDown,
  FilePlus2,
  FileText,
  FileUp,
  GraduationCap,
  Heading2,
  Heading3,
  History,
  Italic,
  Languages,
  Lightbulb,
  List,
  ListOrdered,
  ListTree,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  SpellCheck,
  Trash2,
  Underline,
  Undo2,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react"
import { AiNotice, AiResult, Badge, Button, Card, Empty, Input, Label, PageHeader, Select, Stat, Tabs, Textarea } from "@/components/studio/ui"
import { TOOLS } from "@/lib/studio/tools"
import { callAi, type GrammarIssue } from "@/lib/studio/ai"
import { copyText, downloadFile, escapeHtml, formatTime, printHtml, safeFileName, uid, useStored, readLS, writeLS } from "@/lib/studio/storage"
import { useRouter } from "next/navigation"
import { htmlToMarkdown, replaceInElement, textStats, textToHtml } from "@/lib/studio/text"
import { docxToHtml } from "@/lib/studio/docx"
import { detectLang, parseFile } from "@/lib/studio/docparse"
import { CiteFinder, type CiteTarget } from "@/components/studio/cite-finder"
import { cn } from "@/lib/utils"

type Lang = "en" | "ko" | "vi"
type Version = { at: number; html: string; label: string }
type Doc = {
  id: string
  title: string
  kind: "essay" | "report" | "other"
  lang: Lang
  wordLimit: number | null
  requirements: string
  html: string
  createdAt: number
  updatedAt: number
  versions: Version[]
  cites?: string[]
}
type Issue = GrammarIssue & { id: string; status: "pending" | "applied" | "dismissed" }
type ToolKind = "outline" | "summarize" | "structure" | "academic" | "translate"

const tool = TOOLS.find((t) => t.slug === "writing")!
const LANG_LABEL: Record<Lang, string> = { en: "Tiếng Anh", ko: "Tiếng Hàn", vi: "Tiếng Việt" }
const KIND_LABEL = { essay: "Essay", report: "Báo cáo", other: "Khác" }
const CATEGORY_LABEL: Record<string, string> = {
  grammar: "Ngữ pháp",
  spelling: "Chính tả",
  "word-choice": "Dùng từ",
  particle: "Tiểu từ",
  punctuation: "Dấu câu",
  style: "Văn phong",
}
const AUTO_VERSION_MS = 10 * 60 * 1000

function newDoc(partial: Partial<Doc> = {}): Doc {
  const now = Date.now()
  return {
    id: uid(),
    title: "Bài viết chưa đặt tên",
    kind: "essay",
    lang: "en",
    wordLimit: null,
    requirements: "",
    html: "",
    createdAt: now,
    updatedAt: now,
    versions: [],
    ...partial,
  }
}

const PRINT_CSS =
  "body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6;color:#111;max-width:720px;margin:40px auto;padding:0 24px}h1{font-size:20pt}h2{font-size:15pt;margin-top:18pt}h3{font-size:13pt}blockquote{border-left:3px solid #ccc;margin-left:0;padding-left:12px;color:#444}"

export default function WritingPage() {
  const router = useRouter()
  const [docs, setDocs, loaded] = useStored<Doc[]>("bloom.writing.docs", [])
  const [activeId, setActiveId] = useStored<string | null>("bloom.writing.active", null)
  const active = docs.find((d) => d.id === activeId) ?? docs[0] ?? null

  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)
  const snapshotTaken = useRef(false)

  const [plain, setPlain] = useState("")
  const [wordFormat,setWordFormat]=useState({font:"Times New Roman",size:13,marginCm:2,line:1.5})
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved")
  const [selection, setSelection] = useState("")
  const [panel, setPanel] = useState<"review" | "cite" | "tools" | "versions" | "export">("review")
  const lastRange = useRef<Range | null>(null)
  const [citePreview, setCitePreview] = useState("")
  const [issues, setIssues] = useState<Issue[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [busyTool, setBusyTool] = useState<ToolKind | null>(null)
  const [toolResult, setToolResult] = useState<{ kind: ToolKind; text: string; source: string } | null>(null)
  const [target, setTarget] = useState<Lang>("vi")
  const [preview, setPreview] = useState<Version | null>(null)
  const [showReq, setShowReq] = useState(false)

  const updateDoc = useCallback(
    (id: string, fn: (d: Doc) => Doc) => setDocs((ds) => ds.map((d) => (d.id === id ? fn(d) : d))),
    [setDocs],
  )

  // Reset per-document UI state when switching documents.
  useEffect(() => {
    setIssues([])
    setToolResult(null)
    setSelection("")
    setCitePreview("")
    lastRange.current = null
    snapshotTaken.current = false
  }, [active?.id])

  const saveNow = useCallback(() => {
    clearTimeout(saveTimer.current)
    const el = editorRef.current
    if (!el || !active) return
    const html = el.innerHTML
    const now = Date.now()
    updateDoc(active.id, (d) => {
      const last = d.versions[0]
      const needAuto = el.innerText.trim() && (!last || (now - last.at > AUTO_VERSION_MS && last.html !== html))
      return {
        ...d,
        html,
        updatedAt: now,
        versions: needAuto ? [{ at: now, html, label: "Tự động" }, ...d.versions].slice(0, 30) : d.versions,
      }
    })
    setSaveState("saved")
  }, [active, updateDoc])

  const onEditorInput = useCallback(() => {
    setPlain(editorRef.current?.innerText ?? "")
    setSaveState("saving")
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(saveNow, 700)
  }, [saveNow])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  // The paragraph (or selected sentences) the citation finder works on.
  const captureTarget = (): CiteTarget | null => {
    const el = editorRef.current
    const r = lastRange.current
    if (!el || !r || !el.contains(r.commonAncestorContainer)) return null
    const selected = r.toString().trim()
    if (!r.collapsed && selected.length >= 20) return { kind: "range", range: r.cloneRange(), text: selected }
    let n: Node | null = r.startContainer === el ? el.childNodes[Math.min(r.startOffset, el.childNodes.length - 1)] ?? null : r.startContainer
    const start = n
    while (n && n !== el && !(n instanceof HTMLElement && /^(P|LI|H2|H3|BLOCKQUOTE|DIV)$/.test(n.tagName))) n = n.parentNode
    const block = !n || n === el ? start : n
    const text = block?.textContent?.trim() ?? ""
    return block && text.length >= 20 ? { kind: "block", node: block, text } : null
  }

  // Track the user's selection inside the editor (for rewrite / translate).
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection()
      const el = editorRef.current
      if (!sel || !el || !sel.rangeCount) return
      if (!el.contains(sel.getRangeAt(0).commonAncestorContainer)) return
      setSelection(sel.isCollapsed ? "" : sel.toString())
      lastRange.current = sel.getRangeAt(0).cloneRange()
      setCitePreview(captureTarget()?.text ?? "")
    }
    document.addEventListener("selectionchange", handler)
    return () => document.removeEventListener("selectionchange", handler)
  }, [])

  // Show which paragraph the citation finder will use (CSS Custom Highlight: no DOM changes, nothing saved).
  useEffect(() => {
    const H = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight
    const reg = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights
    if (!H || !reg) return
    const t = panel === "cite" && citePreview ? captureTarget() : null
    if (!t) {
      reg.delete("cite-target")
      return
    }
    let r: Range
    if (t.kind === "range") r = t.range
    else {
      r = document.createRange()
      r.selectNodeContents(t.node)
    }
    reg.set("cite-target", new H(r))
    return () => {
      reg.delete("cite-target")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, citePreview])

  // Deep link from the home page: /studio/writing?panel=cite
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("panel")
    if (p === "cite" || p === "review" || p === "tools" || p === "export") setPanel(p)
  }, [])

  const addVersion = (label: string) => {
    const el = editorRef.current
    if (!el || !active) return
    const html = el.innerHTML
    updateDoc(active.id, (d) => ({ ...d, html, versions: [{ at: Date.now(), html, label }, ...d.versions].slice(0, 30) }))
  }

  // Persist pending edits of the current document before switching away from it.
  const flush = () => {
    if (saveState === "saving") saveNow()
    clearTimeout(saveTimer.current)
  }

  useEffect(() => {
    const added = (event: Event) => {
      const id = (event as CustomEvent<{id:string}>).detail?.id
      const incoming = readLS<Doc[]>("bloom.writing.docs", []).find(d => d.id === id)
      if (incoming) setDocs(ds => ds.some(d => d.id === id) ? ds : [incoming, ...ds])
    }
    const removed = (event: Event) => {
      const id = (event as CustomEvent<{id:string}>).detail?.id
      if (id !== active?.id) setDocs(ds => ds.filter(d => d.id !== id))
    }
    const open = (event: Event) => {
      flush()
      added(event)
      const id = (event as CustomEvent<{id:string}>).detail?.id
      if (id && readLS<Doc[]>("bloom.writing.docs", []).some(d => d.id === id)) setActiveId(id)
    }
    window.addEventListener("bloom:draft-created", added)
    window.addEventListener("bloom:draft-removed", removed)
    window.addEventListener("bloom:draft-open", open)
    return () => { window.removeEventListener("bloom:draft-created", added);window.removeEventListener("bloom:draft-removed", removed);window.removeEventListener("bloom:draft-open", open) }
  }, [active?.id, saveState, saveNow, setDocs, setActiveId])

  const switchDoc = (id: string) => {
    flush()
    setActiveId(id)
  }

  const createDoc = (partial?: Partial<Doc>) => {
    flush()
    const d = newDoc(partial)
    setDocs((ds) => [d, ...ds])
    setActiveId(d.id)
    return d
  }

  const deleteDoc = () => {
    if (!active || !confirm(`Xóa "${active.title}"? Không thể hoàn tác.`)) return
    clearTimeout(saveTimer.current)
    const rest = docs.filter((d) => d.id !== active.id)
    setDocs(rest)
    setActiveId(rest[0]?.id ?? null)
  }

  const importFile = async (file: File) => {
    try {
      const name = file.name.replace(/\.[^.]+$/, "")
      let html: string
      let lang: Lang | undefined
      if (file.size > 20 * 1024 * 1024) throw new Error("Tệp lớn hơn 20MB.")
      if (/\.docx$/i.test(file.name)) html = await docxToHtml(file)
      else if (/\.(txt|md|markdown)$/i.test(file.name)) html = textToHtml(await file.text())
      else if (/\.pdf$/i.test(file.name)) {
        const p = await parseFile(file, file.name)
        if (!p.text.trim()) throw new Error("PDF này không có lớp chữ (có thể là bản scan). Hãy vào Tài liệu của tôi để AI đọc chữ từ ảnh chụp.")
        html = textToHtml(p.text)
        lang = detectLang(p.text)
      } else throw new Error("Hiện hỗ trợ tệp .docx, .pdf, .txt và .md.")
      createDoc({ title: name, html, ...(lang ? { lang } : {}) })
      toast.success(`Đã nhập "${file.name}" thành tài liệu mới.`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
    onEditorInput()
  }

  // ---------- AI review ----------
  const runReview = async () => {
    const text = editorRef.current?.innerText.trim() ?? ""
    if (!text || !active) return toast.info("Hãy viết hoặc nhập nội dung trước nhé.")
    setReviewing(true)
    try {
      const res = await callAi<{ issues?: GrammarIssue[] }>("grammar", { text, lang: active.lang })
      const list = (res.issues ?? [])
        .filter((i) => i && typeof i.original === "string" && typeof i.suggested === "string" && i.original !== i.suggested)
        .map((i) => ({ ...i, id: uid(), status: "pending" as const }))
      setIssues(list)
      snapshotTaken.current = false
      if (!list.length) toast.success("Không phát hiện lỗi nào. Tuyệt vời!")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setReviewing(false)
    }
  }

  const applyIssue = (issue: Issue) => {
    const el = editorRef.current
    if (!el) return
    if (!snapshotTaken.current) {
      addVersion("Trước khi áp dụng gợi ý AI")
      snapshotTaken.current = true
    }
    if (!replaceInElement(el, issue.original, issue.suggested)) {
      toast.warning("Không tìm thấy đoạn này trong bài nữa, có thể bạn đã sửa rồi.")
      return
    }
    setIssues((is) => is.map((i) => (i.id === issue.id ? { ...i, status: "applied" } : i)))
    onEditorInput()
  }

  // ---------- AI tools ----------
  const runTool = async (kind: ToolKind) => {
    if (!active) return
    const body = editorRef.current?.innerText.trim() ?? ""
    let source = body
    if (kind === "academic" || kind === "translate") source = selection.trim() || body
    if (kind === "outline") source = [active.title, active.requirements, body.slice(0, 3000)].filter(Boolean).join("\n\n")
    if (!source) return toast.info("Chưa có nội dung. Với dàn ý, hãy nhập tiêu đề hoặc yêu cầu đề bài.")
    setBusyTool(kind)
    try {
      const res = await callAi(kind, { text: source, lang: active.lang, target, requirements: active.requirements })
      setToolResult({ kind, text: res.text, source })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusyTool(null)
    }
  }

  const replaceSource = () => {
    const el = editorRef.current
    if (!el || !toolResult) return
    addVersion("Trước khi thay bằng gợi ý AI")
    if (replaceInElement(el, toolResult.source, toolResult.text)) {
      onEditorInput()
      setToolResult(null)
      toast.success("Đã thay đoạn văn.")
    } else toast.warning("Đoạn gốc đã thay đổi nên không thể thay tự động. Bạn có thể sao chép kết quả.")
  }

  const appendResult = () => {
    const el = editorRef.current
    if (!el || !toolResult) return
    el.insertAdjacentHTML("beforeend", textToHtml(toolResult.text))
    onEditorInput()
    toast.success("Đã chèn vào cuối bài.")
  }

  // ---------- Export ----------
  const exportAs = async (fmt: "doc" | "md" | "txt" | "pdf") => {
    const el = editorRef.current
    if (!el || !active) return
    saveNow()
    const name = safeFileName(active.title)
    const html = el.innerHTML
    if (fmt === "doc") {
      const {htmlToDocx}=await import("@/lib/studio/word-template")
      downloadFile(`${name}.docx`,htmlToDocx(`<h1>${escapeHtml(active.title)}</h1>${html}`,wordFormat) as BlobPart,"application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    } else if (fmt === "md") downloadFile(`${name}.md`, `# ${active.title}\n\n${htmlToMarkdown(html)}`, "text/markdown;charset=utf-8")
    else if (fmt === "txt") downloadFile(`${name}.txt`, `${active.title}\n\n${el.innerText}`, "text/plain;charset=utf-8")
    else printHtml(active.title, `<h1>${escapeHtml(active.title)}</h1>${html}`, PRINT_CSS)
  }

  const stats = textStats(plain)
  const limit = active?.wordLimit ?? null
  const over = limit ? stats.words > limit : false

  if (!loaded) return null

  return (
    <div>
      <PageHeader
        icon={tool.icon}
        tint={tool.tint}
        title={tool.name} guide={tool.guide}
        desc="Viết nháp, sửa câu và hoàn thiện theo ý bạn."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".docx,.pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importFile(f)
                e.target.value = ""
              }}
            />
            <Button variant="outline" icon={FileUp} onClick={() => fileRef.current?.click()}>
              Nhập tệp
            </Button>
            <Button icon={FilePlus2} onClick={() => createDoc()}>
              Bài mới
            </Button>
          </>
        }
      />

      {!active ? (
        <Card>
          <Empty icon={FileText} title="Chưa có bài viết nào" desc="Viết bài mới, hoặc bấm Nhập tệp để mở bài có sẵn (Word, PDF, TXT).">
            <Button icon={FilePlus2} onClick={() => createDoc()}>
              Tạo bài viết đầu tiên
            </Button>
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          {/* ---------- Editor column ---------- */}
          <div className="min-w-0 space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Bài đang mở</span>
                <Select value={active.id} onChange={(e) => switchDoc(e.target.value)} className="w-auto max-w-full min-w-0 flex-1 sm:max-w-xs" aria-label="Bài đang mở">
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </Select>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  {saveState === "saving" ? (
                    "Đang lưu..."
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Đã lưu
                    </>
                  )}
                </span>
                <Button variant="danger" size="icon" icon={Trash2} onClick={deleteDoc} aria-label="Xóa tài liệu" className="ml-auto" />
              </div>

              <input
                value={active.title}
                onChange={(e) => updateDoc(active.id, (d) => ({ ...d, title: e.target.value, updatedAt: Date.now() }))}
                className="mt-4 w-full bg-transparent font-semibold text-2xl text-slate-800 outline-none placeholder:text-slate-300"
                placeholder="Tiêu đề bài viết"
              />

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                <Select value={active.kind} onChange={(e) => updateDoc(active.id, (d) => ({ ...d, kind: e.target.value as Doc["kind"] }))}>
                  {Object.entries(KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
                <Select value={active.lang} onChange={(e) => updateDoc(active.id, (d) => ({ ...d, lang: e.target.value as Lang }))}>
                  {Object.entries(LANG_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={0}
                  placeholder="Giới hạn từ"
                  value={active.wordLimit ?? ""}
                  onChange={(e) => updateDoc(active.id, (d) => ({ ...d, wordLimit: e.target.value ? Math.max(0, Number(e.target.value)) : null }))}
                />
                <Button variant={showReq ? "soft" : "outline"} icon={ListTree} onClick={() => setShowReq((v) => !v)}>
                  Đề bài
                </Button>
              </div>
              {showReq && (
                <Textarea
                  className="mt-2"
                  rows={3}
                  placeholder="Dán yêu cầu đề bài, rubric chấm điểm... (dùng cho dàn ý và nhận xét cấu trúc)"
                  value={active.requirements}
                  onChange={(e) => updateDoc(active.id, (d) => ({ ...d, requirements: e.target.value }))}
                />
              )}
            </Card>

            <Card className="overflow-hidden">
              <div className="flex flex-wrap gap-0.5 border-b border-slate-100 bg-slate-50/70 p-1.5">
                {(
                  [
                    [Bold, "Đậm", () => exec("bold")],
                    [Italic, "Nghiêng", () => exec("italic")],
                    [Underline, "Gạch chân", () => exec("underline")],
                    [Heading2, "Tiêu đề lớn", () => exec("formatBlock", "<h2>")],
                    [Heading3, "Tiêu đề nhỏ", () => exec("formatBlock", "<h3>")],
                    [Pilcrow, "Đoạn văn", () => exec("formatBlock", "<p>")],
                    [List, "Danh sách", () => exec("insertUnorderedList")],
                    [ListOrdered, "Danh sách số", () => exec("insertOrderedList")],
                    [Quote, "Trích dẫn", () => exec("formatBlock", "<blockquote>")],
                    [RemoveFormatting, "Xóa định dạng", () => exec("removeFormat")],
                    [Undo2, "Hoàn tác", () => exec("undo")],
                    [Redo2, "Làm lại", () => exec("redo")],
                  ] as [LucideIcon, string, () => void][]
                ).map(([Icon, label, fn]) => (
                  <button
                    key={label}
                    type="button"
                    title={label}
                    aria-label={label}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={fn}
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-white hover:text-violet-700"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <Editor key={active.id} html={active.html} editorRef={editorRef} onInput={onEditorInput} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                <span className={cn(over && "font-semibold text-rose-600")}>
                  {stats.words.toLocaleString("vi-VN")} từ{limit ? ` / ${limit.toLocaleString("vi-VN")}` : ""}
                </span>
                <span>{stats.chars.toLocaleString("vi-VN")} ký tự</span>
                <span>{stats.sentences} câu</span>
                <span>{stats.paragraphs} đoạn</span>
                <span>~{stats.readingMin} phút đọc</span>
                {selection && <Badge className="bg-violet-100 text-violet-700">Đang chọn {selection.trim().split(/\s+/).length} từ</Badge>}
              </div>
              {limit ? (
                <div className="h-1 bg-slate-100">
                  <div className={cn("h-full transition-all", over ? "bg-rose-500" : "bg-violet-500")} style={{ width: `${Math.min(100, (stats.words / limit) * 100)}%` }} />
                </div>
              ) : null}
            </Card>
          </div>

          {/* ---------- Side panel (stays in view while scrolling a long essay) ---------- */}
          <div className="min-w-0 lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100dvh-2rem)] lg:flex-col lg:self-start">
            <Tabs
              compact
              value={panel}
              onChange={setPanel}
              tabs={[
                { id: "review", label: "Sửa lỗi", icon: SpellCheck },
                { id: "cite", label: "Trích dẫn", icon: GraduationCap },
                { id: "tools", label: "Trợ lý", icon: Sparkles },
                { id: "versions", label: "Lịch sử", icon: History },
                { id: "export", label: "Xuất", icon: FileDown },
              ]}
            />
            <Card className="mt-3 min-h-0 p-4 lg:overflow-y-auto">
              <AiNotice />

              {panel === "review" && (
                <div>
                  <p className="text-sm text-slate-600">
                    AI đọc bài {LANG_LABEL[active.lang].toLowerCase()} của bạn, chỉ ra từng lỗi kèm lý do. Bạn chọn áp dụng hoặc bỏ qua từng gợi ý.
                  </p>
                  <Button className="mt-3 w-full" icon={SpellCheck} loading={reviewing} onClick={runReview}>
                    {reviewing ? "Đang đọc bài..." : "Kiểm tra ngữ pháp"}
                  </Button>
                  {issues.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {issues.filter((i) => i.status === "pending").length} gợi ý đang chờ · {issues.filter((i) => i.status === "applied").length} đã áp dụng
                        </span>
                      </div>
                      {issues.map((i) => {
                        const stale = i.status === "pending" && !plain.includes(i.original)
                        return (
                          <div
                            key={i.id}
                            className={cn(
                              "rounded-xl p-3 ring-1",
                              i.status === "pending" ? "bg-white ring-slate-200" : "bg-slate-50 opacity-60 ring-slate-100",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge className="bg-amber-50 text-amber-700">{CATEGORY_LABEL[i.category] ?? i.category}</Badge>
                              {i.status === "applied" && <span className="text-xs text-emerald-600">Đã áp dụng</span>}
                              {i.status === "dismissed" && <span className="text-xs text-slate-400">Đã bỏ qua</span>}
                            </div>
                            <p className="mt-2 text-sm break-words">
                              <span className="text-rose-600 line-through decoration-rose-300">{i.original}</span>
                            </p>
                            <p className="mt-1 text-sm font-medium break-words text-emerald-700">{i.suggested}</p>
                            <p className="mt-2 text-xs leading-relaxed text-slate-600">{i.explanation}</p>
                            {stale && <p className="mt-2 text-xs text-amber-600">Đoạn này không còn trong bài.</p>}
                            {i.status === "pending" && (
                              <div className="mt-3 flex gap-2">
                                <Button size="sm" icon={Check} onClick={() => applyIssue(i)} disabled={stale}>
                                  Áp dụng
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={X}
                                  onClick={() => setIssues((is) => is.map((x) => (x.id === i.id ? { ...x, status: "dismissed" } : x)))}
                                >
                                  Bỏ qua
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {panel === "cite" && <CitationCompanion essay={plain} onInsert={(claim,ref,style)=>{
                const el=editorRef.current;if(!el)return
                const source=el.textContent||'',start=source.indexOf(claim)
                if(start<0||source.indexOf(claim,start+1)>=0){toast.info("Chưa tìm được duy nhất một đoạn trong bài. Bạn có thể chọn đoạn cụ thể rồi kiểm tra lại.");return}
                const target=start+claim.length-(/[.!?]$/.test(claim)?1:0);const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let offset=0,endNode:Node|null=null,endOffset=0
                for(let node=walker.nextNode();node;node=walker.nextNode()){const length=node.textContent?.length||0;if(offset+length>=target){endNode=node;endOffset=target-offset;break}offset+=length}
                if(!endNode)return
                const rows=Array.from(el.querySelectorAll("[data-bloom-refs] p"));const refKey=ref.doi||ref.title;const existingIndex=rows.findIndex(p=>p.getAttribute("data-source")===refKey);const number=existingIndex>=0?existingIndex+1:rows.length+1;const citation=inText(ref,style,number);if(!source.slice(start+claim.length,start+claim.length+citation.length+3).includes(citation)){const range=document.createRange();range.setStart(endNode,endOffset);range.collapse(true);range.insertNode(document.createTextNode(" "+citation))}
                if(!ref.doi||!(el.textContent||"").includes(ref.doi)){let list=el.querySelector('[data-bloom-refs]');if(!list){list=document.createElement('div');list.setAttribute('data-bloom-refs','true');const h=document.createElement('h2');h.textContent='Tài liệu tham khảo đã chọn';list.append(h);el.append(list)}const p=document.createElement('p');p.setAttribute('data-source',refKey);p.innerHTML=refHtml(ref,style,number);p.setAttribute('data-sort',ref.authors[0]?.family||ref.title);list.append(p);if(style!=='ieee')for(const row of Array.from(list.querySelectorAll('p')).sort((a,b)=>(a.getAttribute('data-sort')||a.textContent||'').localeCompare(b.getAttribute('data-sort')||b.textContent||'')))list.append(row)}
                onEditorInput();toast.success("Đã chèn trích dẫn và thông tin nguồn để bạn xem lại.");return el.innerText
              }}/>}
              {panel === "cite" && <details className="mt-4"><summary className="cursor-pointer text-xs text-slate-500">Công cụ tìm nguồn theo vùng chọn nâng cao</summary>
                <CiteFinder
                  editorRef={editorRef}
                  capture={captureTarget}
                  preview={citePreview}
                  citedIds={active.cites ?? []}
                  onCite={(id) => updateDoc(active.id, (d) => ({ ...d, cites: [...new Set([...(d.cites ?? []), id])] }))}
                  onEdited={onEditorInput}
                />
              </details>}

              {panel === "tools" && (
                <div className="space-y-2">
                  <ToolButton icon={ListTree} title="Lập dàn ý" desc="Từ tiêu đề và đề bài" busy={busyTool === "outline"} onClick={() => runTool("outline")} />
                  <ToolButton icon={Lightbulb} title="Nhận xét cấu trúc" desc="Luận điểm, bố cục, mạch lạc" busy={busyTool === "structure"} onClick={() => runTool("structure")} />
                  <ToolButton icon={FileText} title="Tóm tắt" desc="Các ý chính của bài" busy={busyTool === "summarize"} onClick={() => runTool("summarize")} />
                  <ToolButton
                    icon={WandSparkles}
                    title="Viết lại học thuật"
                    desc={selection ? "Đoạn bạn đang chọn" : "Bôi đen một đoạn để viết lại"}
                    busy={busyTool === "academic"}
                    onClick={() => (selection.trim() ? runTool("academic") : toast.info("Hãy bôi đen đoạn cần viết lại trong bài."))}
                  />
                  <div className="flex items-center gap-2">
                    <ToolButton
                      icon={Languages}
                      title="Dịch"
                      desc={selection ? "Đoạn đang chọn" : "Toàn bài"}
                      busy={busyTool === "translate"}
                      onClick={() => runTool("translate")}
                      className="flex-1"
                    />
                    <Select value={target} onChange={(e) => setTarget(e.target.value as Lang)} className="w-28">
                      <option value="vi">Việt</option>
                      <option value="en">Anh</option>
                      <option value="ko">Hàn</option>
                    </Select>
                  </div>
                  {toolResult && (
                    <AiResult text={toolResult.text}>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Copy}
                        onClick={async () => toast[(await copyText(toolResult.text)) ? "success" : "error"]("Đã sao chép")}
                      >
                        Sao chép
                      </Button>
                      {(toolResult.kind === "academic" || toolResult.kind === "translate") && !toolResult.source.includes("\n") && (
                        <Button size="sm" icon={Check} onClick={replaceSource}>
                          Thay vào bài
                        </Button>
                      )}
                      {toolResult.kind === "outline" && (
                        <Button size="sm" variant="soft" icon={FilePlus2} onClick={appendResult}>
                          Chèn vào cuối bài
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" icon={X} onClick={() => setToolResult(null)}>
                        Đóng
                      </Button>
                    </AiResult>
                  )}
                </div>
              )}

              {panel === "versions" && (
                <div>
                  <Button className="w-full" variant="soft" icon={Save} onClick={() => (addVersion(prompt("Tên phiên bản (tùy chọn)", "Bản lưu tay") || "Bản lưu tay"), toast.success("Đã lưu phiên bản."))}>
                    Lưu phiên bản hiện tại
                  </Button>
                  <p className="mt-2 text-xs text-slate-500">Hệ thống tự lưu một phiên bản mỗi 10 phút khi bạn đang viết, giữ tối đa 30 bản.</p>
                  {active.versions.length === 0 ? (
                    <Empty icon={History} title="Chưa có phiên bản nào" />
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {active.versions.map((v) => (
                        <li key={v.at} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-700">{v.label}</div>
                            <div className="text-xs text-slate-500">{formatTime(v.at)}</div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setPreview(v)}>
                            Xem
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            icon={RotateCcw}
                            onClick={() => {
                              if (!editorRef.current || !confirm("Khôi phục phiên bản này? Bản hiện tại sẽ được lưu lại trước.")) return
                              addVersion("Trước khi khôi phục")
                              editorRef.current.innerHTML = v.html
                              onEditorInput()
                              toast.success("Đã khôi phục.")
                            }}
                          >
                            Khôi phục
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {panel === "export" && (
                <div className="space-y-2">
                  <details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm">Định dạng Word khi tải về</summary><div className="mt-3 space-y-3"><label className="block text-xs">Phông chữ<select className="mt-1 w-full rounded-lg border p-2" value={wordFormat.font} onChange={e=>setWordFormat({...wordFormat,font:e.target.value})}>{["Times New Roman","Arial","Calibri"].map(x=><option key={x}>{x}</option>)}</select></label>{([["size","Cỡ chữ (pt)",9,24,.5],["marginCm","Lề bốn phía (cm)",1,4,.1],["line","Giãn dòng",1,2.5,.1]] as const).map(([key,label,min,max,step])=><label key={key} className="block text-xs">{label}<input className="mt-1 w-full rounded-lg border p-2" type="number" min={min} max={max} step={step} value={wordFormat[key]} onChange={e=>setWordFormat({...wordFormat,[key]:Math.min(max,Math.max(min,Number(e.target.value)||min))})}/></label>)}<p className="text-xs leading-6 text-slate-500">Khổ A4. Nếu có mẫu quy định riêng, dùng “Điền đúng mẫu Word” để giữ bố cục của mẫu.</p><a className="text-xs text-violet-600 underline" href="/studio/helpers?task=template">Dùng mẫu Word của mình</a></div></details><ToolButton icon={FileText} title="Word (.docx)" desc="Mở và chỉnh tiếp bằng Microsoft Word" onClick={() => exportAs("doc")} />
                  <ToolButton icon={FileDown} title="PDF" desc="Chọn “Lưu dưới dạng PDF” trong hộp thoại in" onClick={() => exportAs("pdf")} />
                  <ToolButton icon={FileText} title="Markdown (.md)" desc="Giữ tiêu đề, danh sách, chữ đậm" onClick={() => exportAs("md")} />
                  <ToolButton icon={FileText} title="Văn bản (.txt)" desc="Chỉ chữ, không định dạng" onClick={() => exportAs("txt")} />
                  <ToolButton
                    icon={ShieldCheck}
                    title="Kiểm tra trước khi nộp"
                    desc="Rà trích dẫn khớp danh mục, đoạn giống nguồn, văn phong"
                    onClick={() => {
                      saveNow()
                      writeLS("bloom.originality.essay", editorRef.current?.innerText ?? "")
                      router.push("/studio/originality")
                    }}
                  />
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Stat label="Từ" value={stats.words} />
                    <Stat label="Ký tự (không cách)" value={stats.charsNoSpace} />
                    <Stat label="TB từ/câu" value={stats.avgSentence} />
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4" onClick={() => setPreview(null)}>
          <Card className="max-h-[85vh] w-full max-w-2xl overflow-hidden bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">{preview.label}</div>
                <div className="text-xs text-slate-500">{formatTime(preview.at)}</div>
              </div>
              <Button size="icon" variant="ghost" icon={X} onClick={() => setPreview(null)} aria-label="Đóng" />
            </div>
            <div className="bloom-editor max-h-[70vh] overflow-y-auto px-6 py-4" dangerouslySetInnerHTML={{ __html: preview.html }} />
          </Card>
        </div>
      )}
    </div>
  )
}

function Editor({ html, editorRef, onInput }: { html: string; editorRef: React.RefObject<HTMLDivElement | null>; onInput: () => void }) {
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.innerHTML = html
    try {
      document.execCommand("defaultParagraphSeparator", false, "p")
    } catch {}
    onInput()
    // Only on mount: the editor is uncontrolled after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder="Bắt đầu viết ở đây..."
      onInput={onInput}
      onPaste={(e) => {
        e.preventDefault()
        const text = e.clipboardData.getData("text/plain")
        // Multi-line text becomes real paragraphs (no stacks of empty lines).
        if (/\n/.test(text.trim())) {
          document.execCommand("insertHTML", false, textToHtml(text))
          // Chrome wraps merged text in <span style="font-size:…"> copied from the editor; drop those.
          e.currentTarget.querySelectorAll("span[style]").forEach((sp) => {
            const st = (sp as HTMLElement).style
            if (st.length === 1 && st.fontSize) sp.replaceWith(...Array.from(sp.childNodes))
          })
        } else document.execCommand("insertText", false, text)
      }}
      className="bloom-editor mx-auto max-h-[65dvh] min-h-[40dvh] max-w-[100ch] overflow-y-auto px-5 py-5 outline-none sm:px-8 lg:max-h-none lg:min-h-[calc(100dvh-24rem)] lg:overflow-visible"
    />
  )
}

function ToolButton({
  icon: Icon,
  title,
  desc,
  onClick,
  busy,
  className,
}: {
  icon: LucideIcon
  title: string
  desc: string
  onClick: () => void
  busy?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn("flex w-full items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-left transition hover:bg-violet-50 disabled:opacity-60", className)}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-violet-600 ring-1 ring-slate-100">
        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" /> : <Icon className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-700">{title}</span>
        <span className="block truncate text-xs text-slate-500">{desc}</span>
      </span>
    </button>
  )
}
