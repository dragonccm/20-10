"use client"
import { DocumentCards } from "./document-cards"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HelpDetails, Button, Card, Input, Label, Textarea, Select } from "./ui"
import { callAi } from "@/lib/studio/ai"
import { idbGet } from "@/lib/studio/idb"
import { parseFile, renderPdfPages } from "@/lib/studio/docparse"
import {
  documentChunks,
  sourcePages,
  retrieveChunks,
  chunkContext,
  verifiedEvidence,
  answerSchema,
  notesText,
  type DocumentSource,
  type Note,
  type Evidence,
} from "@/lib/studio/document-knowledge"
import {
  analyzeDocument,
  condenseDocument,
  loadKnowledge,
  type Knowledge,
} from "@/lib/studio/knowledge-client"
import { sendToWriting, addDesigns } from "@/lib/studio/handoff"
import { notesToSlides, notesToMindmaps } from "@/lib/studio/knowledge-design"
import { downloadFile, safeFileName } from "@/lib/studio/storage"

type Doc = DocumentSource & { mime?: string }
type Props = {
  doc: Doc
  update: (patch: { text: string; parts: string[] }) => void
}
export function DocumentWorkbench({ doc, update }: Props) {
  const router = useRouter(),
    [state, setState] = useState<Knowledge | null>(null),
    [busy, setBusy] = useState(""),
    [progress, setProgress] = useState(""),
    [page, setPage] = useState(1),
    [pageText, setPageText] = useState(""),
    [image, setImage] = useState(""),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<{
      answer: string
      evidence: Evidence[]
      found: boolean
    } | null>(null),
    [view, setView] = useState("notes"),
    [minutes, setMinutes] = useState(25),
    [ocrPages, setOcrPages] = useState<{ page: number; text: string }[]>([]),
    [scanStart, setScanStart] = useState(1),
    [scanEnd, setScanEnd] = useState(5)
  const controller = useRef<AbortController | null>(null),
    generation = useRef(0)
  const pages = sourcePages(doc),
    chunks = documentChunks(doc),
    allNotes = Object.values(state?.sections || {}).flatMap((s) => s.notes),
    done = chunks.filter((c) => state?.sections[c.id]).length,
    complete = chunks.length > 0 && done === chunks.length
  const marker =
    doc.fileKind === "pdf"
      ? "Trang"
      : doc.fileKind === "pptx"
        ? "Slide"
        : "Phần"
  useEffect(() => {
    let active = true
    generation.current++
    controller.current?.abort()
    setState(null)
    setBusy("")
    setAnswer(null)
    loadKnowledge(doc).then((s) => {
      if (active) setState(s)
    })
    return () => {
      active = false
      controller.current?.abort()
    }
  }, [doc.id, doc.text, doc.parts])
  useEffect(() => {
    setPage((p) => Math.max(1, Math.min(p, pages.length)))
  }, [pages.length])
  useEffect(() => {
    setPageText(pages[page - 1] || "")
    setImage("")
    let active = true
    if (doc.fileKind === "pdf")
      idbGet<Blob>(`bloom.docs.file.${doc.id}`)
        .then(async (b) => {
          if (!b) return
          const rendered = await renderPdfPages(b, 900, 1, undefined, page)
          if (active) setImage(rendered[0]?.src || "")
        })
        .catch(() => {})
    return () => {
      active = false
    }
  }, [doc.id, doc.fileKind, page, doc.parts, doc.text])
  const savePage = (p: number, text: string) => {
    const parts = [...sourcePages(doc)]
    parts[p - 1] = text
    update({ parts, text: parts.filter(Boolean).join("\n\n") })
  }
  const run = async (
    name: string,
    fn: (signal: AbortSignal) => Promise<void>,
  ) => {
    if (busy) return
    const token = ++generation.current
    controller.current = new AbortController()
    setBusy(name)
    try {
      await fn(controller.current.signal)
    } catch (e) {
      if (!controller.current.signal.aborted) toast.error((e as Error).message)
    } finally {
      if (token === generation.current) {
        setBusy("")
        setProgress("")
      }
    }
  }
  const ensure = async (signal: AbortSignal) => {
    if (complete && state) return state
    return analyzeDocument(doc, signal, (done, total, s) => {
      setState(s)
      setProgress(
        `Đang đọc phần ${done}/${total} · Bạn có thể dừng rồi tiếp tục sau`,
      )
    })
  }
  const summarize = () =>
    run("summary", async (signal) => {
      const s = await ensure(signal)
      setState(s)
      const brief = await condenseDocument(doc, s, signal, setProgress)
      setState({ ...s, brief })
      setView("brief")
    })
  const ask = () =>
    run("answer", async (signal) => {
      const selected = retrieveChunks(chunks, question)
      if (!selected.length) {
        setAnswer({
          answer:
            "Mình chưa tìm thấy đoạn phù hợp với câu hỏi. Bạn có thể thử nêu từ khóa cụ thể hơn hoặc mở bản ý chính để tìm phần liên quan.",
          found: false,
          evidence: [],
        })
        return
      }
      setProgress(
        `Đối chiếu ${selected.length}/${chunks.length} đoạn phù hợp; đây là tìm kiếm đoạn nguồn, không phải đọc lại toàn bộ tệp.`,
      )
      const value = answerSchema.parse(
        await callAi(
          "document-answer",
          { text: `Câu hỏi: ${question}\n\nNguồn:\n${chunkContext(selected)}` },
          signal,
        ),
      )
      signal.throwIfAborted()
      const evidence = verifiedEvidence(value.evidence, selected)
      if (value.found && !evidence.length)
        throw Error(
          "Chưa đối chiếu được bằng chứng cho câu trả lời. Bạn có thể thử lại với câu hỏi cụ thể hơn.",
        )
      setAnswer({
        ...value,
        evidence,
        found: value.found && evidence.length > 0,
      })
    })
  const product = (kind: "report" | "slides") =>
    run(kind, async (signal) => {
      const s = await ensure(signal),
        brief = await condenseDocument(doc, s, signal, setProgress)
      setState({ ...s, brief })
      if (kind === "slides") {
        signal.throwIfAborted()
        if (!(await addDesigns(notesToSlides(doc.name, brief))))
          throw Error("Chưa lưu được slide; bộ nhớ thiết bị có thể đã đầy.")
        router.push("/studio/creative")
        return
      }
      setProgress("Đang sắp xếp thành bản nháp báo cáo có dẫn nguồn")
      const result = await callAi<{ text: string }>(
        "document-transform",
        {
          text: `Viết báo cáo bằng tiếng Việt từ các ý chính sau, ghi tên tài liệu ${doc.name}. Phần kết nêu giới hạn vì đây là bản tổng hợp từ tài liệu, không tự xác minh bên ngoài.\n${notesText(brief, marker)}`,
        },
        signal,
      )
      signal.throwIfAborted()
      sendToWriting(`Báo cáo · ${doc.name}`, {
        text: result.text,
        lang: "vi",
        kind: "report",
      })
      router.push("/studio/writing")
    })
  const scan = () =>
    run("ocr", async (signal) => {
      const blob = await idbGet<Blob>(`bloom.docs.file.${doc.id}`)
      if (!blob) throw Error("Không tìm thấy tệp gốc. Bạn có thể tải lại tệp.")
      const start = Math.max(1, Math.min(pages.length, scanStart)),
        end = Math.max(start, Math.min(pages.length, scanEnd))
      if (end - start >= 10)
        throw Error(
          "Mỗi lượt đọc tối đa 10 trang để bạn có thể kiểm tra lần lượt.",
        )
      for (let p = start; p <= end; p++) {
        signal.throwIfAborted()
        setProgress(
          `Đang đọc chữ ${marker.toLowerCase()} ${p}/${end}. Kết quả chờ bạn xem trước khi lưu.`,
        )
        const images = await renderPdfPages(blob, 1800, 1, undefined, p)
        const value = await callAi<{ text: string }>(
          "ocr",
          {
            text: "Đọc nguyên văn trang này. Giữ thứ tự tiêu đề, đoạn và bảng. Chỗ không đọc rõ ghi [không rõ], không đoán và không thêm nội dung.",
            image: images[0].src,
          },
          signal,
        )
        signal.throwIfAborted()
        setOcrPages((prev) => [
          ...prev.filter((x) => x.page !== p),
          { page: p, text: value.text },
        ])
        setPage(p)
      }
    })
  const reread = () =>
    run("read", async (signal) => {
      const blob = await idbGet<Blob>(`bloom.docs.file.${doc.id}`)
      if (!blob) throw Error("Không tìm thấy tệp gốc.")
      const parsed = await parseFile(blob, doc.name, {
        signal,
        onProgress: (i, n) => setProgress(`Đang đọc ${i}/${n} trang`),
      })
      signal.throwIfAborted()
      update({ parts: parsed.parts, text: parsed.text })
      toast.success(
        "Đã đọc lại toàn bộ lớp chữ của tệp. Trang scan vẫn cần đọc chữ từ ảnh.",
      )
    })
  const openSource = (p: number) => {
    setPage(p)
    document
      .getElementById("bloom-source-panel")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  const evidence = (items: Evidence[]) => (
    <div className="mt-2 space-y-2">
      {items.map((e, i) => (
        <button
          key={i}
          className="block w-full rounded-xl bg-violet-50 p-3 text-left text-xs leading-6 text-slate-600"
          onClick={() => openSource(e.page)}
        >
          <b>
            {marker} {e.page}
          </b>{" "}
          · “{e.quote}”
          <span className="block text-violet-600">Mở vị trí nguồn</span>
        </button>
      ))}
    </div>
  )
  const notes = view === "brief" ? state?.brief || [] : allNotes
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-sm leading-7 text-slate-600">
          Đọc được chữ ở{" "}
          <b>
            {pages.filter((p) => p.trim()).length}/{pages.length}
          </b>{" "}
          {marker.toLowerCase()} · Ghi chú đã đối chiếu{" "}
          <b>
            {done}/{chunks.length}
          </b>{" "}
          đoạn.
        </p>
        {pages.some((p) => !p.trim()) && (
          <p className="text-xs leading-6 text-amber-700">
            Có phần chưa có chữ. Hãy đọc chữ từ bản scan hoặc bổ sung nội dung
            trước khi coi đây là bản tổng hợp đầy đủ.
          </p>
        )}
        {!["pdf", "pptx"].includes(doc.fileKind) && (
          <p className="text-xs text-slate-500">
            Số phần là vị trí nội dung được nhập, không phải số trang in của
            Word.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            disabled={!!busy || !chunks.length}
            onClick={() =>
              run("analyze", async (signal) => {
                setState(await ensure(signal))
                setView("notes")
              })
            }
          >
            Lấy ý chính
          </Button>
          <Button
            disabled={!!busy || !chunks.length}
            variant="outline"
            onClick={summarize}
          >
            Bản tối lược
          </Button>
          <Button
            disabled={!!busy || !chunks.length}
            variant="outline"
            onClick={() => product("report")}
          >
            Tạo báo cáo
          </Button>
          <Button
            disabled={!!busy || !chunks.length}
            variant="outline"
            onClick={() => product("slides")}
          >
            Tạo slide
          </Button>
        </div>
        <HelpDetails summary="Cách đọc & kiểm tra nguồn">
          <p>
            AI lần lượt đọc {chunks.length} đoạn có chữ và giữ các ghi chú đã
            xong. Bạn có thể dừng rồi tiếp tục. Hãy đối chiếu số liệu và chữ
            nhận diện từ bản scan.
          </p>
          <Button
            className="mt-2"
            disabled={!!busy}
            variant="ghost"
            onClick={reread}
          >
            Đọc lại tệp gốc
          </Button>
        </HelpDetails>
        {busy && (
          <div
            className="mt-3 flex items-center justify-between gap-3 text-sm"
            role="status"
          >
            <span>{progress || "Đang chuẩn bị…"}</span>
            <Button
              variant="outline"
              onClick={() => {
                controller.current?.abort()
                generation.current++
                setBusy("")
                setProgress("")
              }}
            >
              Dừng
            </Button>
          </div>
        )}
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 font-medium">Hỏi về tài liệu</h3>
            <Textarea
              aria-label="Câu hỏi về tài liệu"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ví dụ: tác giả kết luận gì về…?"
            />
            <Button
              className="mt-3"
              disabled={!!busy || !question.trim()}
              onClick={ask}
            >
              Tìm câu trả lời
            </Button>
            {answer && (
              <div className="mt-4 whitespace-pre-wrap text-sm leading-7">
                <p>{answer.answer}</p>
                {evidence(answer.evidence)}
              </div>
            )}
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                variant={view === "notes" ? "primary" : "ghost"}
                onClick={() => setView("notes")}
              >
                Ghi chú
              </Button>
              <Button
                variant={view === "brief" ? "primary" : "ghost"}
                onClick={() => setView("brief")}
              >
                Tối lược
              </Button>
              <Button
                variant={view === "map" ? "primary" : "ghost"}
                onClick={() => setView("map")}
              >
                Sơ đồ ý
              </Button>
              <Button
                variant={view === "cards" ? "primary" : "ghost"}
                onClick={() => setView("cards")}
              >
                Thẻ ôn tập
              </Button>
              <Button
                variant={view === "plan" ? "primary" : "ghost"}
                onClick={() => setView("plan")}
              >
                Chia buổi học
              </Button>
            </div>
            {["notes", "brief"].includes(view) ? (
              <>
                {notes.length ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        downloadFile(
                          `${safeFileName(doc.name)}-ghi-chu.txt`,
                          notesText(notes, marker),
                          "text/plain;charset=utf-8",
                        )
                      }
                    >
                      Tải ghi chú có nguồn
                    </Button>
                    {notes.map((n, i) => (
                      <article
                        key={i}
                        className="mt-4 border-t border-slate-100 pt-4"
                      >
                        <p className="text-sm leading-7">{n.text}</p>
                        {evidence(n.evidence)}
                      </article>
                    ))}
                  </>
                ) : (
                  <p className="text-sm leading-7 text-slate-500">
                    Chọn “Lấy ý chính” khi bạn muốn bắt đầu. Bản tối lược sẽ gom
                    ý từ các phần đã đọc, không bỏ phần cuối để vừa một lượt AI.
                  </p>
                )}
              </>
            ) : (
              <KnowledgeActivities
                key={`${doc.id}-${state?.fingerprint}`}
                notes={allNotes}
                sections={state?.sections || {}}
                view={view}
                minutes={minutes}
                setMinutes={setMinutes}
                onEvidence={(e) => openSource(e.page)}
                title={doc.name}
              />
            )}
          </Card>
        </section>
        <section id="bloom-source-panel" className="space-y-4 scroll-mt-4">
          <Card className="p-4">
            <div className="mb-3 flex items-end gap-3">
              <label className="w-28">
                <Label>{marker}</Label>
                <Input
                  aria-label="Vị trí nguồn"
                  type="number"
                  min={1}
                  max={pages.length}
                  value={page}
                  onChange={(e) =>
                    setPage(
                      Math.max(
                        1,
                        Math.min(pages.length, Number(e.target.value) || 1),
                      ),
                    )
                  }
                />
              </label>
              <span className="pb-3 text-xs text-slate-500">
                /{pages.length} · Đối chiếu và sửa chữ đã nhận diện
              </span>
            </div>
            {image && (
              <img
                src={image}
                alt={`${marker} ${page} bản gốc`}
                className="mb-4 max-h-[500px] w-full rounded-xl object-contain"
              />
            )}
            <Textarea
              aria-label="Chữ ở vị trí nguồn"
              rows={14}
              value={pageText}
              onChange={(e) => setPageText(e.target.value)}
            />
            <Button
              className="mt-3"
              variant="outline"
              disabled={!!busy || pageText === (pages[page - 1] || "")}
              onClick={() => savePage(page, pageText)}
            >
              Lưu phần chữ đã sửa
            </Button>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Sửa chữ sẽ tạo phiên bản ghi chú mới; ghi chú cũ không được dùng
              lại cho nguồn đã thay đổi.
            </p>
          </Card>
          {doc.fileKind === "pdf" && (
            <Card className="p-4">
              <h3 className="font-medium">Đọc chữ từ bản scan</h3>
              <p className="my-2 text-xs leading-6 text-slate-500">
                Chỉ những trang bạn chọn được gửi dưới dạng ảnh tới AI. Kết quả
                chờ bạn đối chiếu và xác nhận, chưa thay nội dung đang lưu.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="w-24">
                  <Label>Từ trang</Label>
                  <Input
                    type="number"
                    min={1}
                    max={pages.length}
                    value={scanStart}
                    onChange={(e) => setScanStart(Number(e.target.value) || 1)}
                  />
                </label>
                <label className="w-24">
                  <Label>Đến trang</Label>
                  <Input
                    type="number"
                    min={scanStart}
                    max={pages.length}
                    value={scanEnd}
                    onChange={(e) => setScanEnd(Number(e.target.value) || 1)}
                  />
                </label>
                <Button disabled={!!busy} onClick={scan}>
                  Đọc các trang này
                </Button>
              </div>
              {ocrPages.map((result) => (
                <div key={result.page} className="mt-4 border-t pt-3">
                  <button
                    className="text-sm text-violet-600"
                    onClick={() => setPage(result.page)}
                  >
                    Xem bản gốc trang {result.page}
                  </button>
                  <Textarea
                    className="mt-2"
                    rows={8}
                    value={result.text}
                    onChange={(e) =>
                      setOcrPages((prev) =>
                        prev.map((p) =>
                          p.page === result.page
                            ? { ...p, text: e.target.value }
                            : p,
                        ),
                      )
                    }
                  />
                  <Button
                    className="mt-2"
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => {
                      savePage(result.page, result.text)
                      setOcrPages((prev) =>
                        prev.filter((p) => p.page !== result.page),
                      )
                    }}
                  >
                    Đã đối chiếu · Lưu chữ trang này
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
function KnowledgeActivities({
  notes,
  sections,
  view,
  minutes,
  setMinutes,
  onEvidence,
  title,
}: {
  notes: Note[]
  sections: Knowledge["sections"]
  view: string
  minutes: number
  setMinutes: (n: number) => void
  onEvidence: (e: Evidence) => void
  title: string
}) {
  const [flipped, setFlipped] = useState<number | null>(null)
  if (!notes.length)
    return (
      <p className="text-sm text-slate-500">
        Khi bạn chọn đọc ý chính, mình sẽ có nội dung để cùng làm phần này.
      </p>
    )
  const groups = Object.values(sections).filter((s) => s.notes.length)
  if (view === "map")
    return (
      <div>
        <Button
          variant="outline"
          onClick={async () => {
            if (!(await addDesigns(notesToMindmaps(title, groups)))) {
              toast.error("Chưa lưu được sơ đồ trên thiết bị.")
              return
            }
            window.location.assign("/studio/creative")
          }}
        >
          Mở sơ đồ kéo thả
        </Button>
        <h3 className="rounded-xl bg-violet-100 p-4 font-medium">{title}</h3>
        <p className="my-3 text-xs text-slate-500">
          Sơ đồ theo phần, mở một nhánh để xem ý và nguồn. Mọi ghi chú đều được
          giữ trong nhánh tương ứng.
        </p>
        {groups.map((g, i) => (
          <details
            key={i}
            className="ml-4 border-l-2 border-violet-200 py-3 pl-4"
          >
            <summary className="cursor-pointer text-sm font-medium">
              {g.heading || `Phần ${i + 1}`}
            </summary>
            {g.notes.map((n, j) => (
              <button
                key={j}
                className="mt-3 block rounded-xl bg-slate-50 p-3 text-left text-sm leading-7"
                onClick={() => onEvidence(n.evidence[0])}
              >
                {n.text}
                <span className="block text-xs text-violet-600">
                  Mở nguồn {n.evidence[0].page}
                </span>
              </button>
            ))}
          </details>
        ))}
        <Button
          className="mt-4"
          variant="outline"
          onClick={() =>
            downloadFile(
              "so-do-y.json",
              JSON.stringify({ title, branches: groups }, null, 2),
              "application/json",
            )
          }
        >
          Tải sơ đồ và nguồn
        </Button>
      </div>
    )
  if (view === "cards") return <DocumentCards notes={notes} />
  return (
    <div>
      <Label>Khoảng thời gian bạn muốn dành cho một buổi (phút)</Label>
      <Input
        type="number"
        min={5}
        max={120}
        value={minutes}
        onChange={(e) =>
          setMinutes(Math.max(5, Math.min(120, Number(e.target.value) || 25)))
        }
      />
      <p className="my-3 text-xs leading-6 text-slate-500">
        Đây là cách chia nội dung để bạn lựa chọn, không đặt hạn hay nhắc quay
        lại. Bạn có thể bỏ qua hoặc đổi thứ tự.
      </p>
      {groups.map((g, i) => (
        <article key={i} className="mt-3 rounded-xl bg-slate-50 p-4">
          <h3 className="text-sm font-medium">
            Một buổi với: {g.heading || `phần ${i + 1}`}
          </h3>
          <p className="mt-2 text-sm leading-7">
            Đọc nguồn khoảng {Math.round(minutes * 0.4)} phút · Tự kể lại ý
            chính khoảng {Math.round(minutes * 0.35)} phút · Đối chiếu và hỏi
            điều còn chưa rõ trong thời gian còn lại.
          </p>
          <button
            className="mt-2 text-xs text-violet-600"
            onClick={() => onEvidence(g.notes[0].evidence[0])}
          >
            Mở phần này khi bạn muốn
          </button>
        </article>
      ))}
      <Button
        variant="outline"
        className="mt-4"
        onClick={() =>
          downloadFile(
            "goi-y-buoi-hoc.txt",
            groups
              .map(
                (g, i) =>
                  `${i + 1}. ${g.heading}\n${minutes} phút: đọc, tự nhớ lại, đối chiếu nguồn.\nNguồn ${g.notes[0].evidence[0].page}`,
              )
              .join("\n\n"),
            "text/plain;charset=utf-8",
          )
        }
      >
        Giữ bản gợi ý
      </Button>
    </div>
  )
}
