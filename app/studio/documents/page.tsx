"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronDown,
  BookOpenCheck,
  Briefcase,
  Check,
  CircleHelp,
  Copy,
  Download,
  FileImage,
  FileText,
  FileUp,
  FolderOpen,
  Languages,
  MessageCircle,
  Mic,
  Palette,
  PenLine,
  Presentation,
  RotateCcw,
  ScanSearch,
  ScrollText,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  AiNotice,
  AiResult,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Label,
  PageHeader,
  Select,
  Tabs,
} from "@/components/studio/ui"
import { TOOLS } from "@/lib/studio/tools"
import { callAi } from "@/lib/studio/ai"
import { copyText, formatTime, uid } from "@/lib/studio/storage"
import { idbDel, idbGet, idbSet } from "@/lib/studio/idb"
import { fileToDataUrl } from "@/lib/studio/image"
import {
  ACCEPT,
  MAX_FILE,
  aiText,
  detectLang,
  fileKind,
  guessKind,
  parseFile,
  renderPdfPages,
  unsupportedReason,
  wordCount,
  type DocKind,
  type FileKind,
} from "@/lib/studio/docparse"
import {
  addDesigns,
  documentToDesigns,
  makeKoreanCards,
  parseCv,
  saveImportedCv,
  sendToOriginality,
  sendToWriting,
} from "@/lib/studio/handoff"
import { DocumentWorkbench } from "@/components/studio/document-workbench"
import { cn } from "@/lib/utils"

const tool = TOOLS.find((t) => t.slug === "documents")!

type Lang = "vi" | "en" | "ko"
type Msg = { role: "user" | "ai"; text: string }
type Quiz = { q: string; options: string[]; answer: number; explain: string }
type DocItem = {
  id: string
  name: string
  size: number
  mime: string
  fileKind: FileKind
  kind: DocKind
  lang: Lang
  text: string
  parts: string[]
  ratio: number
  html?: string
  thumb?: string
  addedAt: number
  review?: string
  summary?: string
  script?: string
  chat?: Msg[]
  quiz?: Quiz[]
}

const INDEX = "bloom.docs.index"
const fileKey = (id: string) => `bloom.docs.file.${id}`

const KIND: Record<DocKind, { label: string; icon: LucideIcon; tint: string }> =
  {
    essay: {
      label: "Bài luận / bài viết",
      icon: ScrollText,
      tint: "bg-rose-100 text-rose-600",
    },
    cv: {
      label: "CV",
      icon: Briefcase,
      tint: "bg-emerald-100 text-emerald-600",
    },
    slides: {
      label: "Slide thuyết trình",
      icon: Presentation,
      tint: "bg-amber-100 text-amber-600",
    },
    other: {
      label: "Tài liệu khác",
      icon: FileText,
      tint: "bg-sky-100 text-sky-600",
    },
  }
const FILE_LABEL: Record<FileKind, string> = {
  pdf: "PDF",
  docx: "Word",
  pptx: "PowerPoint",
  text: "Văn bản",
  image: "Ảnh chụp",
}
const LANG_LABEL: Record<Lang, string> = {
  vi: "Tiếng Việt",
  en: "Tiếng Anh",
  ko: "Tiếng Hàn",
}

const size = (n: number) =>
  n > 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`

export default function DocumentsPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string[]>([])
  const [drag, setDrag] = useState(false)
  const [readProgress, setReadProgress] = useState("")
  const reading = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    idbGet<DocItem[]>(INDEX).then((d) => {
      setDocs(d ?? [])
      setActiveId(d?.[0]?.id ?? null)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (loaded) idbSet(INDEX, docs)
  }, [docs, loaded])

  const update = useCallback(
    (
      id: string,
      patch: Partial<DocItem> | ((d: DocItem) => Partial<DocItem>),
    ) => {
      setDocs((ds) =>
        ds.map((d) =>
          d.id === id
            ? { ...d, ...(typeof patch === "function" ? patch(d) : patch) }
            : d,
        ),
      )
    },
    [],
  )

  const addFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const fk = fileKind(file.name, file.type)
      if (!fk) {
        toast.error(`${file.name}: ${unsupportedReason(file.name)}`)
        continue
      }
      if (file.size > MAX_FILE) {
        toast.error(`${file.name} lớn hơn ${MAX_FILE / 1024 / 1024}MB.`)
        continue
      }
      setBusy((b) => [...b, file.name])
      try {
        reading.current = new AbortController()
        const p = await parseFile(file, file.name, {
          signal: reading.current.signal,
          onProgress: (i, n) =>
            setReadProgress(`Đang đọc ${file.name} · ${i}/${n} trang`),
        })
        const id = uid()
        let thumb: string | undefined
        if (fk === "image") thumb = (await fileToDataUrl(file, 900, 0.8)).src
        else if (fk === "pdf")
          thumb = (await renderPdfPages(file, 420, 1).catch(() => []))[0]?.src
        if (fk !== "image" && !p.text.trim()) {
          toast.warning(
            `${file.name}: không thấy chữ nào (có thể là bản scan). Bạn có thể chọn đọc các trang scan trong phần Cùng tài liệu.`,
          )
        }
        const item: DocItem = {
          id,
          name: file.name,
          size: file.size,
          mime: file.type,
          fileKind: fk,
          kind: guessKind(p, file.name),
          lang: detectLang(p.text),
          text: p.text,
          parts: p.parts,
          ratio: p.ratio,
          html: p.html,
          thumb,
          addedAt: Date.now(),
        }
        if (!(await idbSet(fileKey(id), file)))
          toast.warning(
            "Không lưu được tệp gốc (bộ nhớ đầy), nhưng nội dung chữ vẫn dùng được.",
          )
        setDocs((ds) => [item, ...ds])
        setActiveId(id)
        toast.success(`Đã đọc "${file.name}"`)
      } catch (e) {
        toast.error(`${file.name}: ${(e as Error).message}`)
      } finally {
        setBusy((b) => b.filter((n) => n !== file.name))
        setReadProgress("")
      }
    }
  }

  const ocr = async (item: DocItem, file?: Blob) => {
    const blob = file ?? (await idbGet<Blob>(fileKey(item.id)))
    if (!blob) return toast.error("Không tìm thấy ảnh gốc.")
    setBusy((b) => [...b, item.name])
    try {
      const img = await fileToDataUrl(
        new File([blob], item.name, { type: blob.type || "image/jpeg" }),
        2000,
        0.9,
      )
      const r = await callAi("ocr", { image: img.src })
      const text = r.text.trim()
      const p = {
        kind: "image" as const,
        text,
        parts: [text],
        ratio: img.w / img.h,
      }
      update(item.id, {
        text,
        parts: [text],
        ratio: p.ratio,
        lang: detectLang(text),
        kind: guessKind(p, item.name),
      })
      toast.success("AI đã đọc xong chữ trong ảnh.")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy((b) => b.filter((n) => n !== item.name))
    }
  }

  const remove = (d: DocItem) => {
    if (!confirm(`Xóa "${d.name}" khỏi thư viện?`)) return
    const rest = docs.filter((x) => x.id !== d.id)
    setDocs(rest)
    if (activeId === d.id) setActiveId(rest[0]?.id ?? null)
    idbDel(fileKey(d.id))
  }

  const active = docs.find((d) => d.id === activeId) ?? null

  return (
    <div className="document-library">
      {readProgress && (
        <Card className="mb-4 flex items-center justify-between gap-3 p-4">
          <span role="status" className="text-sm">
            {readProgress}
          </span>
          <Button variant="outline" onClick={() => reading.current?.abort()}>
            Dừng đọc
          </Button>
        </Card>
      )}
      <PageHeader
        icon={tool.icon}
        tint={tool.tint}
        title={tool.name}
        guide={tool.guide}
        desc="Mang tài liệu vào, cùng tìm điều bạn cần."
      />
      <AiNotice />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
        }}
        className={cn(
          "document-upload mb-5 flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition",
          drag
            ? "border-violet-400 bg-violet-50"
            : "border-slate-200 bg-white/70",
        )}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
          <Upload className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-800">Thả tài liệu vào đây</p>
          <p className="mt-0.5 text-sm text-slate-500">
            PDF, Word, slide, ảnh hoặc TXT · tối đa 40 MB.
          </p>
          {busy.length > 0 && (
            <p className="mt-1 text-sm text-violet-700">
              Đang đọc: {busy.join(", ")}...
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
        <Button
          variant="outline"
          icon={FileUp}
          loading={busy.length > 0}
          onClick={() => inputRef.current?.click()}
        >
          Chọn tệp
        </Button>
      </div>

      {loaded && !docs.length ? (
        <Card>
          <Empty
            icon={FolderOpen}
            title="Chưa có tài liệu nào"
            desc="Tệp chỉ được đọc ngay trên máy này. Chữ hoặc những trang scan bạn chọn chỉ được gửi cho AI khi bạn chủ động dùng chức năng tương ứng."
          />
        </Card>
      ) : (
        <div className="document-library-grid">
          <Card className="document-file-list h-fit p-2 lg:sticky lg:top-4">
            <div className="no-scrollbar flex gap-2 overflow-x-auto lg:max-h-[calc(100dvh-8rem)] lg:flex-col lg:overflow-y-auto">
              {docs.map((d) => {
                const K = KIND[d.kind]
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setActiveId(d.id)}
                    className={cn(
                      "flex w-52 shrink-0 items-center gap-3 rounded-xl p-2.5 text-left transition lg:w-auto",
                      d.id === activeId
                        ? "bg-violet-50 ring-1 ring-violet-200"
                        : "hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                        K.tint,
                      )}
                    >
                      <K.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {d.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {FILE_LABEL[d.fileKind]} · {size(d.size)} ·{" "}
                        {formatTime(d.addedAt)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>
          {active && (
            <DocView
              key={active.id}
              doc={active}
              update={(p) => update(active.id, p)}
              onDelete={() => remove(active)}
              onOcr={() => ocr(active)}
              ocrBusy={busy.includes(active.name)}
              router={router}
            />
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------- One document ---------------- */

function DocView({
  doc,
  update,
  onDelete,
  onOcr,
  ocrBusy,
  router,
}: {
  doc: DocItem
  update: (p: Partial<DocItem> | ((d: DocItem) => Partial<DocItem>)) => void
  onDelete: () => void
  onOcr: () => void
  ocrBusy: boolean
  router: ReturnType<typeof useRouter>
}) {
  const [tab, setTab] = useState<
    "content" | "review" | "chat" | "quiz" | "workbench"
  >("workbench")
  const [moving, setMoving] = useState("")
  const [progress, setProgress] = useState("")
  const words = wordCount(doc.text)
  const forAi = aiText(doc.text, doc.parts, doc.kind, doc.fileKind)
  const hasText = !!doc.text.trim()
  const hasKorean = /[가-힣]{2,}/.test(doc.text)
  const title = doc.name.replace(/\.[^.]+$/, "")

  const original = async () => (await idbGet<Blob>(fileKey(doc.id))) ?? null

  const download = async () => {
    const b = await original()
    if (!b) return toast.error("Không tìm thấy tệp gốc.")
    const url = URL.createObjectURL(b)
    const a = document.createElement("a")
    a.href = url
    a.download = doc.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const go = async (what: string, fn: () => Promise<string | void>) => {
    setMoving(what)
    try {
      const href = await fn()
      if (href) router.push(href)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setMoving("")
      setProgress("")
    }
  }

  const actions: {
    id: string
    icon: LucideIcon
    label: string
    desc: string
    show: boolean
    primary?: boolean
    run: () => Promise<string | void>
  }[] = [
    {
      id: "writing",
      icon: PenLine,
      label: "Sửa trong trang Viết bài",
      desc: "Mở thành bài viết để AI sửa lỗi, tìm trích dẫn, xuất Word/PDF",
      show: hasText && doc.kind !== "slides",
      primary: doc.kind === "essay" || doc.kind === "other",
      run: async () => {
        sendToWriting(title, {
          html: doc.html,
          text: doc.text,
          lang: doc.lang,
          kind: doc.kind === "essay" ? "essay" : "other",
        })
        toast.success("Đã tạo bài viết mới trong trang Viết bài.")
        return "/studio/writing"
      },
    },
    {
      id: "cv",
      icon: Briefcase,
      label: "Nhập vào trình tạo CV",
      desc: "AI tách các mục rồi điền sẵn, bạn chọn mẫu đẹp và xuất PDF",
      show: hasText && doc.kind === "cv",
      primary: true,
      run: async () => {
        setProgress("AI đang đọc CV...")
        const cv = saveImportedCv(await parseCv(doc.text))
        toast.success(
          `Đã nhập CV của ${cv.name || "bạn"}. CV cũ được giữ lại để khôi phục nếu cần.`,
        )
        return "/studio/career"
      },
    },
    {
      id: "creative",
      icon: Palette,
      label: "Mở trong Thiết kế",
      desc:
        doc.fileKind === "pptx"
          ? "Mỗi slide thành một thiết kế sửa được: chữ, ảnh, màu"
          : "Mỗi trang thành một thiết kế để thêm chữ, sticker, xuất ảnh",
      show: doc.fileKind === "pptx" || doc.fileKind === "pdf",
      primary: doc.kind === "slides",
      run: async () => {
        const b = await original()
        if (!b) throw new Error("Không tìm thấy tệp gốc, hãy tải lại tệp.")
        const designs = await documentToDesigns(
          b,
          doc.name,
          doc.fileKind,
          setProgress,
        )
        if (!designs.length) throw new Error("Không có trang nào để chuyển.")
        if (!(await addDesigns(designs)))
          throw new Error("Bộ nhớ trình duyệt đã đầy, hãy xóa bớt thiết kế cũ.")
        toast.success(`Đã tạo ${designs.length} thiết kế trong trang Thiết kế.`)
        return "/studio/creative"
      },
    },
    {
      id: "originality",
      icon: ScanSearch,
      label: "Rà soát trích dẫn",
      desc: "Đối chiếu trích dẫn trong bài với danh mục tài liệu",
      show: hasText && doc.kind === "essay",
      run: async () => {
        sendToOriginality(doc.text)
        return "/studio/originality"
      },
    },
    {
      id: "korean",
      icon: Languages,
      label: "Tạo thẻ từ vựng tiếng Hàn",
      desc: "AI chọn từ đáng học trong tài liệu và thêm vào Học tiếng Hàn",
      show: hasKorean,
      run: async () => {
        setProgress("AI đang chọn từ vựng...")
        const r = await makeKoreanCards(doc.text)
        if (!r.added) {
          toast.info(
            r.skipped
              ? "Các từ này đã có trong bộ thẻ rồi."
              : "Không tìm thấy từ tiếng Hàn phù hợp.",
          )
          return
        }
        toast.success(`Đã thêm ${r.added} thẻ từ vựng.`)
        return "/studio/korean"
      },
    },
  ]
  const visible = actions
    .filter((a) => a.show)
    .sort((a, b) => Number(!!b.primary) - Number(!!a.primary))

  return (
    <div className="document-detail min-w-0 space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              className="line-clamp-2 break-words text-base font-semibold text-slate-800"
              title={doc.name}
            >
              {doc.name}
            </h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge>{FILE_LABEL[doc.fileKind]}</Badge>
              <Badge>{words.toLocaleString("vi-VN")} từ</Badge>
              {doc.parts.length > 1 && (
                <Badge>
                  {doc.parts.length}{" "}
                  {doc.fileKind === "pptx" || doc.kind === "slides"
                    ? "slide"
                    : "trang"}
                </Badge>
              )}
              <Badge>{size(doc.size)}</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Tải tệp gốc"
              title="Tải tệp gốc"
              icon={Download}
              onClick={download}
            />
            <Button
              size="icon"
              variant="danger"
              aria-label="Xóa tài liệu"
              title="Xóa tài liệu"
              icon={Trash2}
              onClick={onDelete}
            />
          </div>
        </div>
        <details className="document-settings">
          <summary>
            Thông tin tài liệu <ChevronDown size={14} />
          </summary>{" "}
          <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2">
            <label>
              <Label>Đây là</Label>
              <Select
                value={doc.kind}
                onValueChange={(value) => update({ kind: value as DocKind })}
                aria-label="Loại tài liệu"
              >
                {(Object.keys(KIND) as DocKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND[k].label}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <Label>Ngôn ngữ chính</Label>
              <Select
                value={doc.lang}
                onValueChange={(value) => update({ lang: value as Lang })}
                aria-label="Ngôn ngữ"
              >
                {(Object.keys(LANG_LABEL) as Lang[]).map((k) => (
                  <option key={k} value={k}>
                    {LANG_LABEL[k]}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </details>

        {visible.length > 0 && (
          <div className="document-handoff">
            {visible.map((a) => (
              <Button
                key={a.id}
                size="sm"
                variant="outline"
                icon={a.icon}
                title={a.desc}
                disabled={!!moving}
                onClick={() => go(a.id, a.run)}
              >
                {moving === a.id
                  ? progress || "Đang xử lý…"
                  : a.id === "writing"
                    ? "Mở bài viết"
                    : a.id === "originality"
                      ? "Xem trích dẫn"
                      : a.label}
              </Button>
            ))}
          </div>
        )}
      </Card>

      <Tabs
        className="document-main-tabs w-fit max-w-full"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "workbench", label: "Cùng tài liệu", icon: BookOpenCheck },
          { id: "content", label: "Nội dung gốc", icon: FileText },
          { id: "review", label: "AI nhận xét", icon: Sparkles },
        ]}
      />

      {tab === "workbench" && (
        <DocumentWorkbench doc={doc} update={(patch) => update(patch)} />
      )}
      {tab === "content" && (
        <Content doc={doc} onOcr={onOcr} ocrBusy={ocrBusy} />
      )}
      {tab !== "content" && tab !== "workbench" && !hasText && (
        <Card>
          <Empty
            icon={FileImage}
            title="Chưa có chữ để AI đọc"
            desc={
              doc.fileKind === "image"
                ? "Bấm “Đọc chữ trong ảnh” ở tab Nội dung trước nhé."
                : "Tệp này không có lớp chữ (có thể là bản scan). Hãy chụp ảnh từng trang rồi tải lên."
            }
          />
        </Card>
      )}
      {tab === "review" && hasText && forAi.length >= 23000 && (
        <p className="text-xs text-amber-700">
          Nhận xét nhanh chỉ đọc phần đầu. Để xử lý toàn bộ tài liệu, dùng “Cùng
          tài liệu”.
        </p>
      )}
      {tab === "review" && hasText && (
        <Review doc={doc} forAi={forAi} update={update} />
      )}
      {tab === "chat" && hasText && (
        <Chat doc={doc} forAi={forAi} update={update} />
      )}
      {tab === "quiz" && hasText && (
        <QuizView doc={doc} forAi={forAi} update={update} />
      )}
    </div>
  )
}

function Content({
  doc,
  onOcr,
  ocrBusy,
}: {
  doc: DocItem
  onOcr: () => void
  ocrBusy: boolean
}) {
  const label =
    doc.fileKind === "pptx" || doc.kind === "slides" ? "Slide" : "Trang"
  return (
    <Card className="p-4">
      {doc.thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={doc.thumb}
          alt="Trang đầu"
          className="mx-auto mb-4 max-h-80 rounded-xl object-contain ring-1 ring-slate-200"
        />
      )}
      {doc.fileKind === "image" && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={doc.text ? "outline" : "primary"}
            icon={doc.text ? RotateCcw : ScanSearch}
            loading={ocrBusy}
            onClick={onOcr}
          >
            {ocrBusy
              ? "AI đang đọc chữ..."
              : doc.text
                ? "Đọc lại chữ trong ảnh"
                : "Đọc chữ trong ảnh"}
          </Button>
          <span className="text-xs text-slate-500">
            AI chép lại chữ trong ảnh để các công cụ khác dùng được.
          </span>
        </div>
      )}
      {doc.text && (
        <div className="mb-2 flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            icon={Copy}
            onClick={() =>
              copyText(doc.text).then(() => toast.success("Đã chép nội dung."))
            }
          >
            Chép chữ
          </Button>
        </div>
      )}
      {doc.parts.length > 1 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {doc.parts.map((p, i) => (
            <div
              key={i}
              className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100"
            >
              <div className="mb-1 text-xs font-semibold text-violet-600">
                {label} {i + 1}
              </div>
              <p className="max-h-60 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                {p || <span className="text-slate-400">(không có chữ)</span>}
              </p>
            </div>
          ))}
        </div>
      ) : doc.text ? (
        <p className="max-h-[60dvh] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
          {doc.text}
        </p>
      ) : (
        doc.fileKind !== "image" && (
          <p className="text-sm text-slate-500">
            Không tìm thấy chữ trong tệp này.
          </p>
        )
      )}
    </Card>
  )
}

function Review({
  doc,
  forAi,
  update,
}: {
  doc: DocItem
  forAi: string
  update: (p: Partial<DocItem>) => void
}) {
  const [busy, setBusy] = useState<"" | "review" | "summary" | "script">("")
  const [minutes, setMinutes] = useState(5)
  const [lang, setLang] = useState<Lang>(doc.lang)

  const run = async (what: "review" | "summary" | "script") => {
    setBusy(what)
    try {
      const r =
        what === "review"
          ? await callAi("doc-review", { text: forAi, kind: doc.kind })
          : what === "summary"
            ? await callAi("summarize", { text: forAi })
            : await callAi("slide-script", { text: forAi, minutes, lang })
      update({ [what]: r.text })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy("")
    }
  }

  const label = {
    essay: "Nhận xét bài luận",
    cv: "Nhận xét CV như nhà tuyển dụng",
    slides: "Nhận xét bài thuyết trình",
    other: "Phân tích tài liệu",
  }[doc.kind]
  const block = (key: "review" | "summary" | "script", heading: string) =>
    doc[key] && (
      <div>
        <h3 className="mt-4 text-sm font-semibold text-slate-700">{heading}</h3>
        <AiResult text={doc[key]!}>
          <Button
            size="sm"
            variant="outline"
            icon={Copy}
            onClick={() =>
              copyText(doc[key]!).then(() => toast.success("Đã chép."))
            }
          >
            Chép
          </Button>
          {key === "script" && (
            <Button
              size="sm"
              variant="outline"
              icon={PenLine}
              onClick={() => {
                sendToWriting(`Kịch bản: ${doc.name.replace(/\.[^.]+$/, "")}`, {
                  text: doc.script!,
                  lang,
                  kind: "other",
                })
                toast.success(
                  "Đã lưu kịch bản thành bài viết trong trang Viết bài.",
                )
              }}
            >
              Lưu thành bài viết
            </Button>
          )}
        </AiResult>
      </div>
    )

  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-2">
        <Button
          icon={Sparkles}
          loading={busy === "review"}
          onClick={() => run("review")}
        >
          {label}
        </Button>
        <Button
          variant="soft"
          icon={ScrollText}
          loading={busy === "summary"}
          onClick={() => run("summary")}
        >
          Tóm tắt
        </Button>
      </div>
      {doc.kind === "slides" && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-amber-50/60 p-3 ring-1 ring-amber-100">
          <label className="w-28">
            <Label>Thời lượng (phút)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={minutes}
              onChange={(e) =>
                setMinutes(
                  Math.min(30, Math.max(1, Number(e.target.value) || 5)),
                )
              }
            />
          </label>
          <label className="w-36">
            <Label>Nói bằng</Label>
            <Select
              value={lang}
              onValueChange={(value) => setLang(value as Lang)}
              aria-label="Ngôn ngữ kịch bản"
            >
              {(Object.keys(LANG_LABEL) as Lang[]).map((k) => (
                <option key={k} value={k}>
                  {LANG_LABEL[k]}
                </option>
              ))}
            </Select>
          </label>
          <Button
            variant="outline"
            icon={Mic}
            loading={busy === "script"}
            onClick={() => run("script")}
          >
            Viết kịch bản thuyết trình
          </Button>
        </div>
      )}
      {forAi.length >= 23000 && (
        <p className="mt-2 text-xs text-amber-700">
          Tài liệu dài, AI chỉ đọc khoảng 23.000 ký tự đầu.
        </p>
      )}
      {block("review", label)}
      {block("summary", "Tóm tắt")}
      {block("script", "Kịch bản thuyết trình")}
      {!doc.review && !doc.summary && !doc.script && (
        <p className="mt-3 text-sm text-slate-500">
          Kết quả được lưu lại cùng tài liệu để xem sau.
        </p>
      )}
    </Card>
  )
}

const CHIPS: Record<DocKind, string[]> = {
  essay: [
    "Luận điểm chính của bài là gì?",
    "Đoạn nào lập luận còn yếu?",
    "Gợi ý một câu kết mạnh hơn",
  ],
  cv: [
    "CV này hợp với vị trí nào?",
    "Phần kinh nghiệm nên viết lại thế nào?",
    "Nhà tuyển dụng có thể hỏi gì khi phỏng vấn?",
  ],
  slides: [
    "Slide nào nhiều chữ quá?",
    "Mở đầu thế nào để thu hút hơn?",
    "Thầy cô có thể hỏi những câu gì?",
  ],
  other: [
    "Tóm tắt trong 3 câu",
    "Giải thích các thuật ngữ khó",
    "Những ý nào cần nhớ cho bài kiểm tra?",
  ],
}

function Chat({
  doc,
  forAi,
  update,
}: {
  doc: DocItem
  forAi: string
  update: (p: Partial<DocItem> | ((d: DocItem) => Partial<DocItem>)) => void
}) {
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const chat = doc.chat ?? []
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" })
  }, [chat.length, busy])

  const ask = async (question: string) => {
    const text = question.trim()
    if (!text || busy) return
    setQ("")
    update((d) => ({ chat: [...(d.chat ?? []), { role: "user", text }] }))
    setBusy(true)
    try {
      const history = chat
        .slice(-6)
        .map((m) => `${m.role === "user" ? "Người học" : "Trợ lý"}: ${m.text}`)
        .join("\n")
        .slice(-5000)
      const r = await callAi("doc-chat", {
        text: forAi,
        question: text,
        history,
      })
      update((d) => ({
        chat: [...(d.chat ?? []), { role: "ai", text: r.text }],
      }))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col p-4">
      <div className="max-h-[55dvh] min-h-40 space-y-3 overflow-y-auto pr-1">
        {!chat.length && (
          <div className="text-sm text-slate-500">
            <p className="mb-2">
              Hỏi bất cứ điều gì về tài liệu này, AI sẽ trả lời dựa trên nội
              dung và chỉ ra vị trí.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CHIPS[doc.kind].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => ask(c)}
                  className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200 hover:text-violet-700 hover:ring-violet-300"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-3.5 py-2 text-sm whitespace-pre-wrap text-white"
            >
              {m.text}
            </div>
          ) : (
            <div key={i} className="max-w-[92%]">
              <AiResult text={m.text} />
            </div>
          ),
        )}
        {busy && (
          <p className="text-sm text-violet-700">AI đang đọc tài liệu...</p>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          ask(q)
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Đặt câu hỏi về tài liệu..."
          aria-label="Câu hỏi"
        />
        <Button
          type="submit"
          icon={Send}
          loading={busy}
          aria-label="Gửi câu hỏi"
          disabled={!q.trim()}
        />
        {chat.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            icon={X}
            aria-label="Xóa hội thoại"
            title="Xóa hội thoại"
            onClick={() => update({ chat: [] })}
          />
        )}
      </form>
    </Card>
  )
}

function QuizView({
  doc,
  forAi,
  update,
}: {
  doc: DocItem
  forAi: string
  update: (p: Partial<DocItem>) => void
}) {
  const [count, setCount] = useState(8)
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<Record<number, number>>({})
  const quiz = doc.quiz ?? []
  const done = Object.keys(picked).length
  const score = quiz.reduce(
    (s, q, i) => s + (picked[i] === q.answer ? 1 : 0),
    0,
  )

  const make = async () => {
    setBusy(true)
    try {
      const r = await callAi<{ questions?: Quiz[] }>("doc-quiz", {
        text: forAi,
        count,
      })
      const qs = (r.questions ?? []).filter(
        (q) =>
          q &&
          typeof q.q === "string" &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          Number.isInteger(q.answer) &&
          q.answer >= 0 &&
          q.answer < q.options.length,
      )
      if (!qs.length) throw new Error("AI chưa tạo được câu hỏi, thử lại nhé.")
      update({
        quiz: qs.map((q) => ({
          q: q.q,
          options: q.options.map(String).slice(0, 6),
          answer: q.answer,
          explain: String(q.explain ?? ""),
        })),
      })
      setPicked({})
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="w-32">
          <Label>Số câu hỏi</Label>
          <Select
            value={count}
            onValueChange={(value) => setCount(Number(value))}
            aria-label="Số câu hỏi"
          >
            {[5, 8, 10, 15].map((n) => (
              <option key={n} value={n}>
                {n} câu
              </option>
            ))}
          </Select>
        </label>
        <Button
          icon={quiz.length ? RotateCcw : CircleHelp}
          loading={busy}
          onClick={make}
        >
          {busy
            ? "Đang soạn câu hỏi..."
            : quiz.length
              ? "Tạo bộ câu mới"
              : "Tạo câu hỏi ôn tập"}
        </Button>
        {quiz.length > 0 && done > 0 && (
          <Button
            variant="ghost"
            icon={RotateCcw}
            onClick={() => setPicked({})}
          >
            Làm lại
          </Button>
        )}
        {quiz.length > 0 && (
          <span className="ml-auto text-sm font-medium text-slate-700">
            Đúng {score}/{quiz.length}
            {done === quiz.length &&
              (score / quiz.length >= 0.8
                ? " · Rất tốt!"
                : score / quiz.length >= 0.5
                  ? " · Khá ổn, xem lại các câu sai nhé"
                  : " · Đọc lại tài liệu rồi thử lại nhé")}
          </span>
        )}
      </div>
      {!quiz.length && !busy && (
        <p className="mt-3 text-sm text-slate-500">
          AI soạn câu hỏi trắc nghiệm từ chính tài liệu để bạn tự kiểm tra mức
          độ hiểu bài.
        </p>
      )}
      <ol className="mt-4 space-y-4">
        {quiz.map((q, i) => {
          const p = picked[i]
          const answered = p !== undefined
          return (
            <li
              key={i}
              className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100"
            >
              <p className="text-sm font-medium text-slate-800">
                {i + 1}. {q.q}
              </p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {q.options.map((o, j) => (
                  <button
                    key={j}
                    type="button"
                    disabled={answered}
                    onClick={() => setPicked((x) => ({ ...x, [i]: j }))}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-3 py-2 text-left text-sm ring-1 transition",
                      !answered &&
                        "bg-white ring-slate-200 hover:ring-violet-300",
                      answered &&
                        j === q.answer &&
                        "bg-emerald-50 text-emerald-800 ring-emerald-300",
                      answered &&
                        j === p &&
                        j !== q.answer &&
                        "bg-rose-50 text-rose-700 ring-rose-300",
                      answered &&
                        j !== p &&
                        j !== q.answer &&
                        "bg-white text-slate-400 ring-slate-100",
                    )}
                  >
                    <span className="font-semibold">
                      {String.fromCharCode(65 + j)}.
                    </span>
                    <span className="flex-1">{o}</span>
                    {answered && j === q.answer && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              {answered && q.explain && (
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {q.explain}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
