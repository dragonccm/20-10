"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Download,
  FileUp,
  FileText,
  Plus,
  Sparkles,
  Undo2,
  X,
  Check,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import {
  AiNotice,
  Button,
  Card,
  HelpDetails,
  Input,
  Label,
  Textarea,
} from "./ui"
import { callAi } from "@/lib/studio/ai"
import { downloadFile, readLS } from "@/lib/studio/storage"
import { runTemplateTask } from "@/lib/studio/template-fill-client"
import {
  applyTemplate,
  groundedValues,
  sourceChunks,
  suggestedSlots,
  templateBatches,
  type TemplateModel,
  type TemplateSlot,
} from "@/lib/studio/template-fill"

type Proposal = { id: string; value: string; quote: string }
type Session = {
  file: File | null
  bytes: Uint8Array | null
  model: TemplateModel | null
  slots: TemplateSlot[]
  values: Record<string, string>
  source: string
  sourceName: string
}
let templateSession: Session | null = null
export function TemplateFiller() {
  const [file, setFile] = useState<File | null>(
      () => templateSession?.file ?? null,
    ),
    [bytes, setBytes] = useState<Uint8Array | null>(
      () => templateSession?.bytes ?? null,
    ),
    [model, setModel] = useState<TemplateModel | null>(
      () => templateSession?.model ?? null,
    )
  const [slots, setSlots] = useState<TemplateSlot[]>(
      () => templateSession?.slots ?? [],
    ),
    [values, setValues] = useState<Record<string, string>>(
      () => templateSession?.values ?? {},
    ),
    [source, setSource] = useState(() => templateSession?.source ?? "")
  const [busy, setBusy] = useState(""),
    [status, setStatus] = useState(""),
    [query, setQuery] = useState(""),
    [proposal, setProposal] = useState<Proposal[]>([]),
    [past, setPast] = useState<Record<string, string> | null>(null)
  const [sourceName, setSourceName] = useState(
      () => templateSession?.sourceName ?? "",
    ),
    [showBlocks, setShowBlocks] = useState(false),
    [audit, setAudit] = useState<
      ReturnType<typeof applyTemplate>["audit"] | null
    >(null)
  const input = useRef<HTMLInputElement>(null),
    contentInput = useRef<HTMLInputElement>(null),
    abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => {
    templateSession = { file, bytes, model, slots, values, source, sourceName }
  }, [file, bytes, model, slots, values, source, sourceName])
  const edits = useMemo(
    () =>
      slots.filter(
        (s) => Object.hasOwn(values, s.id) && values[s.id] !== s.original,
      ),
    [slots, values],
  )
  const detect = async (next: TemplateModel, base: TemplateSlot[] = slots) => {
    const controller = new AbortController()
    abort.current = controller
    setBusy("detect")
    setStatus("Đang phân tích chỗ cần thay…")
    let combined = [...base]
    try {
      const inputs = next.blocks
        .filter((b) => !b.protected)
        .flatMap((b) =>
          sourceChunks(b.text, 6000).map((text) => ({ blockId: b.id, text })),
        )
      const batches = templateBatches(inputs)
      for (let i = 0; i < batches.length; i++) {
        setStatus(`Đang xem mẫu · ${i + 1}/${batches.length}`)
        const value = await callAi<{
          fields: { blockId: string; quote: string; label: string }[]
        }>(
          "template-detect",
          { text: JSON.stringify({ blocks: batches[i] }) },
          controller.signal,
        )
        combined = [
          ...combined,
          ...suggestedSlots(next, value.fields, combined),
        ]
      }
      if (!controller.signal.aborted) {
        setSlots(combined)
        setStatus(
          combined.length
            ? `Đã tìm ${combined.length} vùng có thể điền.`
            : "Bạn có thể chọn đoạn cần thay ở bên dưới.",
        )
        if (!combined.length) setShowBlocks(true)
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        setStatus("Bạn vẫn có thể chọn đoạn và điền trực tiếp.")
        setShowBlocks(!combined.length)
        toast.info((e as Error).message)
      }
    } finally {
      if (abort.current === controller) {
        setBusy("")
        abort.current = null
      }
    }
  }
  const selectFile = async (f: File) => {
    if (!/\.(docx|pptx)$/i.test(f.name))
      return toast.info("Chọn mẫu Word .docx hoặc PowerPoint .pptx nhé.")
    if (f.size > 40 * 1024 * 1024) return toast.info("Chọn mẫu dưới 40 MB.")
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setBusy("open")
    setProposal([])
    setAudit(null)
    try {
      const data = new Uint8Array(await f.arrayBuffer()),
        next = await runTemplateTask(
          "scan",
          data,
          undefined,
          undefined,
          controller.signal,
        )
      if ((next.kind === "docx") !== /\.docx$/i.test(f.name))
        throw Error("Phần mở rộng không khớp cấu trúc của file mẫu.")
      setFile(f)
      setBytes(data)
      setModel(next)
      setSlots(next.slots)
      setValues({})
      setPast(null)
      setSource("")
      setSourceName("")
      setQuery("")
      setStatus(
        `Đã đọc ${next.blocks.length} đoạn · ${next.slots.length} vùng đánh dấu.`,
      )
      await detect(next, next.slots)
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error((e as Error).message)
    } finally {
      if (abort.current === controller) abort.current = null
      if (!abort.current) setBusy("")
    }
  }
  const loadContent = async (f: File) => {
    if (f.size > 40 * 1024 * 1024)
      return toast.info("Chọn file nội dung dưới 40 MB.")
    setBusy("content")
    try {
      const { parseFile } = await import("@/lib/studio/docparse"),
        parsed = await parseFile(f, f.name)
      if (!parsed.text.trim())
        throw Error(
          "Chưa đọc được chữ. Nếu là bản scan, hãy đọc chữ ở Tài liệu rồi dán vào đây.",
        )
      setSource(parsed.text)
      setSourceName(f.name)
      setProposal([])
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy("")
    }
  }
  const fill = async () => {
    if (!source.trim() || !slots.length) return
    const controller = new AbortController()
    abort.current = controller
    setBusy("fill")
    setProposal([])
    try {
      const groups = templateBatches(
          slots.map((s) => ({
            id: s.id,
            label: s.label,
            original: s.original.slice(0, 1500),
          })),
          6500,
        ),
        chunks = sourceChunks(source)
      const found: Proposal[] = []
      let done = 0
      for (const fields of groups)
        for (const content of chunks) {
          setStatus(
            `Đang ghép nội dung · ${++done}/${groups.length * chunks.length}`,
          )
          const result = await callAi<{ values: Proposal[] }>(
            "template-fill",
            { text: JSON.stringify({ fields, content }) },
            controller.signal,
          )
          for (const value of groundedValues(result.values, slots, content)) {
            if (!fields.some((f) => f.id === value.id)) continue
            if (
              !found.some((p) => p.id === value.id && p.value === value.value)
            )
              found.push(value)
          }
        }
      if (!controller.signal.aborted) {
        setProposal(found)
        setStatus(
          found.length
            ? "Đề xuất đã sẵn sàng. Bạn chọn nội dung muốn áp dụng."
            : "Chưa tìm thấy thông tin khớp. Bạn vẫn có thể điền trực tiếp.",
        )
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        toast.error((e as Error).message)
        setStatus("Chưa ghép được. Bạn có thể điền trực tiếp.")
      }
    } finally {
      if (abort.current === controller) {
        setBusy("")
        abort.current = null
      }
    }
  }
  const setValue = (id: string, value: string) => {
    const target = slots.find((s) => s.id === id)
    setValues((v) => {
      const next = { ...v, [id]: value }
      if (target?.source === "marker" && target.original.startsWith("{{")) {
        for (const s of slots)
          if (
            s.source === "marker" &&
            s.original.replace(/\s+/g, "") ===
              target.original.replace(/\s+/g, "")
          )
            next[s.id] = value
      }
      return next
    })
    setAudit(null)
  }
  const manual = (blockId: string) => {
    const block = model?.blocks.find((b) => b.id === blockId)
    if (!block || block.protected) return
    const slot: TemplateSlot = {
      id: `${block.id}@manual`,
      blockId,
      label: block.emptyHint || block.text.slice(0, 65),
      original: block.text,
      start: 0,
      end: block.text.length,
      source: "manual",
    }
    setSlots((old) => [...old.filter((s) => s.blockId !== blockId), slot])
    setProposal((old) =>
      old.filter(
        (p) => !slots.some((s) => s.blockId === blockId && s.id === p.id),
      ),
    )
    setValues((v) => {
      const next = { ...v }
      for (const s of slots.filter((s) => s.blockId === blockId))
        delete next[s.id]
      return next
    })
    setAudit(null)
  }
  const exportFile = async () => {
    if (!file || !bytes || !model) return
    const controller = new AbortController()
    abort.current = controller
    setBusy("export")
    setStatus("Đang điền vào file gốc…")
    try {
      const result = await runTemplateTask(
        "apply",
        bytes,
        slots,
        values,
        controller.signal,
      )
      if (controller.signal.aborted) return
      setAudit(result.audit)
      downloadFile(
        `da-dien-${file.name}`,
        result.bytes as BlobPart,
        model.kind === "docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      )
      setStatus("Bản đã điền đã sẵn sàng.")
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error((e as Error).message)
        setStatus("Chưa xuất được. Mẫu gốc vẫn được giữ.")
      }
    } finally {
      if (abort.current === controller) {
        abort.current = null
        setBusy("")
      }
    }
  }
  const fromWriting = () => {
    const docs = readLS<{ id: string; title: string; html: string }[]>(
        "bloom.writing.docs",
        [],
      ),
      id = readLS("bloom.writing.active", ""),
      doc = docs.find((d) => d.id === id) || docs[0]
    if (!doc) return toast.info("Chưa có bài viết được lưu.")
    const dom = new DOMParser().parseFromString(doc.html, "text/html")
    dom.querySelectorAll("p,h1,h2,h3,li").forEach((e) => e.append("\n\n"))
    setSource(dom.body.textContent || "")
    setSourceName(doc.title)
    setProposal([])
  }
  const fromCv = () => {
    const cv = readLS<Record<string, unknown> | null>("bloom.career.cv", null)
    if (!cv) return toast.info("Chưa có CV được lưu.")
    setSource(
      Object.entries(cv)
        .filter(([k]) => !["theme", "photo", "accent"].includes(k))
        .map(
          ([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`,
        )
        .join("\n"),
    )
    setSourceName("CV đã lưu")
    setProposal([])
  }
  return (
    <section className="template-filler">
      <input
        ref={input}
        className="hidden"
        type="file"
        aria-label="Chọn file mẫu Word hoặc PowerPoint"
        accept=".docx,.pptx"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) selectFile(f)
        }}
      />
      <input
        ref={contentInput}
        className="hidden"
        type="file"
        aria-label="Chọn file nội dung"
        accept=".docx,.pptx,.pdf,.txt,.md"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) loadContent(f)
        }}
      />
      <div className="template-fill-heading">
        <div>
          {!file && <span className="studio-eyebrow">GIỮ MẪU CỦA BẠN</span>}
          <h2>
            {file ? "Điền mẫu của bạn" : "Điền nội dung, giữ cách trình bày."}
          </h2>
          {!file && <p>Word hoặc PowerPoint · Không dựng lại thiết kế</p>}
        </div>
        {file && (
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            icon={FileUp}
            onClick={() => input.current?.click()}
          >
            Đổi mẫu
          </Button>
        )}
      </div>
      {!file ? (
        <Card
          className="template-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files[0]
            if (f) selectFile(f)
          }}
        >
          <span className="photo-upload-icon">
            <FileText size={28} />
          </span>
          <h3>Mang file mẫu của bạn vào đây</h3>
          <p>Giữ kiểu chữ, lề, bảng và hình ảnh của file gốc.</p>
          <Button
            icon={FileUp}
            disabled={!!busy}
            onClick={() => input.current?.click()}
          >
            Chọn file mẫu
          </Button>
          <small>.docx · .pptx · tối đa 40 MB</small>
          <p className="studio-caption">
            Phần chữ được gửi AI khi phân tích hoặc gợi ý điền. File gốc được xử
            lý trên thiết bị.
          </p>
        </Card>
      ) : (
        <>
          <div className="template-file-strip">
            <span className="cv-theme-icon">
              <FileText size={19} />
            </span>
            <div>
              <strong>{file.name}</strong>
              <p>
                {model?.kind.toUpperCase()} · {slots.length} vùng điền ·{" "}
                {edits.length} thay đổi
              </p>
            </div>
            <Button
              size="sm"
              icon={Download}
              disabled={!!busy || !edits.length}
              onClick={exportFile}
            >
              Tải bản đã điền
            </Button>
          </div>
          <div className="template-fill-layout">
            <div className="space-y-4">
              <Card className="p-5">
                <div className="template-section-head">
                  <h3>Nội dung của bạn</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={FileUp}
                    disabled={!!busy}
                    onClick={() => contentInput.current?.click()}
                  >
                    Tải nội dung
                  </Button>
                </div>
                <Textarea
                  aria-label="Nội dung để điền mẫu"
                  rows={8}
                  value={source}
                  disabled={!!busy}
                  placeholder="Dán nội dung ở đây, hoặc tải Word, PDF, slide hay TXT…"
                  onChange={(e) => {
                    setSource(e.target.value)
                    setSourceName("")
                    setProposal([])
                  }}
                />
                {sourceName && (
                  <p className="studio-caption mt-2">Từ: {sourceName}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!busy}
                    onClick={fromWriting}
                  >
                    Lấy bài đang viết
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!busy}
                    onClick={fromCv}
                  >
                    Lấy CV đã lưu
                  </Button>
                </div>
                <AiNotice />
                <Button
                  className="mt-3 w-full"
                  icon={Sparkles}
                  loading={busy === "fill"}
                  disabled={!!busy || !source.trim() || !slots.length}
                  onClick={fill}
                >
                  Gợi ý điền từ nội dung
                </Button>
              </Card>
              {proposal.length > 0 && (
                <Card className="p-5">
                  <div className="template-section-head">
                    <h3>Gợi ý chờ bạn chọn</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={X}
                      aria-label="Bỏ gợi ý"
                      onClick={() => setProposal([])}
                    />
                  </div>
                  <div className="template-proposals">
                    {proposal.map((p, i) => (
                      <div key={p.id + i}>
                        <strong>
                          {slots.find((s) => s.id === p.id)?.label}
                        </strong>
                        <p>{p.value}</p>
                        <details>
                          <summary>Đoạn nguồn</summary>
                          <blockquote>{p.quote}</blockquote>
                        </details>
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Check}
                          onClick={() => {
                            setPast(values)
                            setValue(p.id, p.value)
                            setProposal((old) =>
                              old.filter((v) => v.id !== p.id),
                            )
                          }}
                        >
                          Dùng nội dung này
                        </Button>
                      </div>
                    ))}
                  </div>
                  {new Set(proposal.map((p) => p.id)).size <
                    proposal.length && (
                    <p className="studio-caption">
                      Mỗi vùng sẽ dùng gợi ý đầu tiên; bạn có thể chọn riêng ở
                      trên.
                    </p>
                  )}
                  <Button
                    className="w-full mt-3"
                    variant="outline"
                    onClick={() => {
                      setPast(values)
                      const first: Record<string, string> = {}
                      for (const p of proposal)
                        if (!Object.hasOwn(first, p.id)) first[p.id] = p.value
                      setValues((v) => ({ ...v, ...first }))
                      setProposal([])
                      setAudit(null)
                    }}
                  >
                    Điền các vùng này
                  </Button>
                </Card>
              )}
              <HelpDetails summary="Mẫu được giữ như thế nào?">
                <p>
                  Chỉ thay chữ ở vùng bạn đã điền. File giữ nguyên các phần kiểu
                  chữ, trang, bảng, ảnh và slide master. Chữ mới nhận kiểu của
                  chữ đầu vùng. Nội dung dài có thể đổi ngắt dòng, sang trang
                  hoặc tràn ô; hãy mở bản xuất bằng Word/PowerPoint để kiểm tra.
                  Nếu thay chữ có liên kết, hãy kiểm tra lại đích liên kết trong
                  bản xuất. Bản đối chiếu ở đây là nội dung, không phải bản
                  render chính xác của Office. Bản đang làm được giữ trong phiên
                  trình duyệt; bạn nên tải xuống trước khi đóng hoặc tải lại
                  trang.
                </p>
              </HelpDetails>
            </div>
            <div className="space-y-4">
              <Card className="p-5">
                <div className="template-section-head">
                  <h3>Những chỗ cần thay</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Sparkles}
                    disabled={!!busy}
                    onClick={() => model && detect(model)}
                  >
                    Phân tích mẫu
                  </Button>
                </div>
                <Input
                  aria-label="Tìm vùng trong mẫu"
                  placeholder="Tìm vùng điền…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="template-slot-list">
                  {slots
                    .filter((s) =>
                      (s.label + " " + s.original)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((slot) => (
                      <article key={slot.id}>
                        <div className="template-slot-label">
                          <label htmlFor={`slot-${slot.id}`}>
                            {slot.label}
                          </label>
                          <Button
                            size="icon"
                            variant="ghost"
                            icon={X}
                            aria-label={`Bỏ vùng ${slot.label}`}
                            disabled={!!busy}
                            onClick={() => {
                              setSlots((old) =>
                                old.filter((s) => s.id !== slot.id),
                              )
                              setAudit(null)
                            }}
                          />
                        </div>
                        <div className="template-original">
                          <span>
                            {
                              model?.blocks.find((b) => b.id === slot.blockId)
                                ?.location
                            }
                          </span>
                          <p>{slot.original}</p>
                        </div>
                        <Textarea
                          id={`slot-${slot.id}`}
                          aria-label={`Nội dung mới: ${slot.label}`}
                          rows={3}
                          disabled={!!busy}
                          value={values[slot.id] ?? ""}
                          placeholder="Nhập nội dung mới…"
                          onChange={(e) => setValue(slot.id, e.target.value)}
                        />
                        {!Object.hasOwn(values, slot.id) && (
                          <div className="template-slot-footer">
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() => setValue(slot.id, "")}
                            >
                              Để trống vùng này
                            </button>
                          </div>
                        )}
                        {Object.hasOwn(values, slot.id) && (
                          <div className="template-slot-footer">
                            <small>
                              {values[slot.id].length} ký tự · mẫu{" "}
                              {slot.original.length}
                            </small>
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() => {
                                setValues((v) => {
                                  const next = { ...v }
                                  delete next[slot.id]
                                  return next
                                })
                                setAudit(null)
                              }}
                            >
                              Giữ chữ gốc
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  {!slots.length && (
                    <p className="studio-caption py-4">
                      Phân tích bằng AI hoặc chọn đoạn ở bên dưới để bắt đầu.
                    </p>
                  )}
                </div>
              </Card>
              <details
                open={showBlocks}
                className="template-manual"
                onToggle={(e) => setShowBlocks(e.currentTarget.open)}
              >
                <summary>
                  Chọn thêm đoạn trong mẫu <Plus size={14} />
                </summary>
                <div className="template-block-list">
                  {model?.blocks
                    .filter(
                      (b) =>
                        !b.protected &&
                        b.text.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((block) => (
                      <div key={block.id}>
                        <span>{block.location}</span>
                        <p>{block.text || "(Ô trống trong bảng)"}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!busy}
                          onClick={() => manual(block.id)}
                        >
                          Thay cả đoạn này
                        </Button>
                      </div>
                    ))}
                </div>
              </details>
            </div>
          </div>
          <Card className="template-review p-5">
            <div className="template-section-head">
              <h3>Đối chiếu trước khi tải</h3>
              {past && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Undo2}
                  disabled={!!busy}
                  onClick={() => {
                    setValues(past)
                    setPast(null)
                    setAudit(null)
                  }}
                >
                  Hoàn tác gợi ý
                </Button>
              )}
            </div>
            {edits.length ? (
              <div className="template-review-list">
                {edits.map((s) => (
                  <div key={s.id}>
                    <strong>{s.label}</strong>
                    <p>{s.original}</p>
                    <ArrowRight size={15} />
                    <p>{values[s.id] || "(Xóa chữ ở vùng này)"}</p>
                    {values[s.id].length >
                      Math.max(
                        s.original.length * 1.4,
                        s.original.length + 50,
                      ) && <small>Kiểm tra ngắt dòng trong bản xuất.</small>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="studio-caption">
                Các vùng chưa điền được giữ nguyên.
              </p>
            )}
            <Button
              className="mt-4"
              icon={Download}
              disabled={!!busy || !edits.length}
              onClick={exportFile}
            >
              Tải {model?.kind === "docx" ? "Word" : "PowerPoint"} đã điền
            </Button>
            {audit && (
              <div className="template-audit" role="status">
                <p>Đã điền {audit.replacements} vùng vào file gốc.</p>
                {audit.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
      {(status || busy) && (
        <div className="template-status" role="status">
          <span>{status || "Đang mở tệp…"}</span>
          {busy && abort.current && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                abort.current?.abort()
                setStatus("Đã dừng. Bạn có thể điền trực tiếp.")
              }}
            >
              Dừng
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
