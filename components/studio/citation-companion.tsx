"use client"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { HelpDetails, Button, Card, Input, Label, Select, Textarea } from "./ui"
import { callAi } from "@/lib/studio/ai"
import {
  lookupDoi,
  extractDoi,
  searchWorks,
  refText,
  inText,
  STYLE_LABEL,
  type Ref,
  type Style,
} from "@/lib/studio/cite"
import { readLS, writeLS, uid, copyText } from "@/lib/studio/storage"
import {
  documentChunks,
  retrieveChunks,
  chunkContext,
  normalizedSource,
  verifiedEvidence,
  type DocumentSource,
} from "@/lib/studio/document-knowledge"
import { parseFile } from "@/lib/studio/docparse"

type Claim = {
  id: string
  text: string
  query: string
  why: string
  refs: Ref[]
  error?: string
}
type Verdict = {
  status: "supports" | "partial" | "contradicts" | "insufficient"
  explanation: string
  evidence: { page: number; quote: string }[]
  scope: string
}
export function CitationCompanion({
  essay,
  onInsert,
}: {
  essay: string
  onInsert?: (claim: string, ref: Ref, style: Style) => string | void
}) {
  const [claims, setClaims] = useState<Claim[]>([]),
    [busy, setBusy] = useState(""),
    [progress, setProgress] = useState(""),
    [source, setSource] = useState<DocumentSource | null>(null),
    [sourceText, setSourceText] = useState(""),
    [confirmed, setConfirmed] = useState<Record<string, boolean>>({}),
    [verdicts, setVerdicts] = useState<Record<string, Verdict>>({}),
    [style, setStyle] = useState<Style>("apa"),
    [manual, setManual] = useState(""),
    [snapshot, setSnapshot] = useState("")
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])
  const run = async (
    id: string,
    fn: (signal: AbortSignal) => Promise<void>,
  ) => {
    if (busy) return
    abort.current = new AbortController()
    setBusy(id)
    try {
      await fn(abort.current.signal)
    } catch (e) {
      if (!abort.current.signal.aborted) toast.error((e as Error).message)
    } finally {
      setBusy("")
      setProgress("")
    }
  }
  const analyze = () =>
    run("read", async (signal) => {
      const chunks = documentChunks(
          {
            id: "essay",
            name: "Bài viết",
            fileKind: "text",
            parts: [essay],
            text: essay,
          },
          10000,
        ),
        found: Claim[] = []
      setClaims([])
      setVerdicts({})
      setSnapshot(essay)
      for (let i = 0; i < chunks.length; i++) {
        setProgress(`Đang đọc phần ${i + 1}/${chunks.length} của bài`)
        const value = await callAi<{
          claims: { text: string; query: string; why: string }[]
        }>("citation-claims", { text: chunks[i].text }, signal)
        if (!Array.isArray(value.claims))
          throw Error("Chưa nhận được các ý cần nguồn.")
        for (const c of value.claims) {
          if (
            typeof c.text !== "string" ||
            typeof c.query !== "string" ||
            !chunks[i].text.includes(c.text) ||
            found.some((x) => x.text === c.text)
          )
            continue
          const claim: Claim = { ...c, id: uid(), refs: [] }
          found.push(claim)
          setClaims([...found])
          setProgress(`Đang tìm bài có thật cho ý ${found.length}`)
          try {
            claim.refs = (await searchWorks(c.query, 4, true, signal)).map(
              (r) => ({ ...r, id: uid(), addedAt: Date.now() }),
            )
          } catch (e) {
            if (signal.aborted) throw e
            claim.error =
              "Chưa kết nối được Crossref. Bạn có thể thử tìm lại cho ý này."
          }
          setClaims([...found])
        }
      }
      if (!found.length)
        toast.info(
          "Chưa thấy ý rõ ràng cần nguồn. Bạn có thể kiểm tra một câu cụ thể ở phần dưới.",
        )
    })
  const check = async (claim: Claim, ref: Ref, full: boolean) =>
    run(claim.id + ref.id, async (signal) => {
      const key = claim.id + ref.id,
        raw = full
          ? source || {
              id: "pasted",
              name: "Đoạn nguồn bạn dán",
              fileKind: "text",
              parts: [sourceText],
              text: sourceText,
            }
          : {
              id: "abstract",
              name: ref.title,
              fileKind: "text",
              parts: [ref.abstract || ""],
              text: ref.abstract || "",
            }
      if (full && !confirmed[key])
        throw Error("Bạn xác nhận tệp/đoạn dán thuộc đúng nguồn này trước nhé.")
      const chunks = documentChunks(raw),
        selected = retrieveChunks(chunks, claim.text + " " + claim.query, 16000)
      if (!selected.length)
        throw Error(
          "Chưa tìm được đoạn phù hợp trong nguồn. Bạn có thể dán đoạn liên quan cụ thể hơn.",
        )
      setProgress(
        `Đối chiếu ${selected.length}/${chunks.length} đoạn nguồn phù hợp`,
      )
      const value = await callAi<Verdict>(
        "citation-evidence",
        {
          text: `Ý trong bài: ${claim.text}\nPhạm vi nguồn: ${full ? raw.name : "Chỉ đoạn tóm tắt Crossref cung cấp, chưa phải toàn văn"}\n${chunkContext(selected)}`,
        },
        signal,
      )
      if (
        !["supports", "partial", "contradicts", "insufficient"].includes(
          value.status,
        ) ||
        typeof value.explanation !== "string" ||
        !Array.isArray(value.evidence)
      )
        throw Error("Kết quả đối chiếu chưa hợp lệ.")
      const evidence = verifiedEvidence(
        value.evidence.filter(
          (e) => Number.isInteger(e.page) && typeof e.quote === "string",
        ),
        selected,
      )
      if (value.status !== "insufficient" && !evidence.length)
        throw Error(
          "Chưa xác nhận được trích đoạn nguyên văn; mình không đánh dấu nguồn hỗ trợ ý này.",
        )
      setVerdicts((prev) => ({
        ...prev,
        [key]: {
          ...value,
          evidence,
          scope: full
            ? `Tệp/đoạn bạn cung cấp · đã tìm ${selected.length}/${chunks.length} đoạn`
            : "Chỉ đoạn tóm tắt từ Crossref · chưa kiểm tra toàn văn",
        },
      }))
    })
  const addManual = () =>
    run("manual", async (signal) => {
      const doi = extractDoi(manual)
      if (!doi) throw Error("Bạn dán DOI hợp lệ, ví dụ 10.xxxx/… nhé.")
      const result = await lookupDoi(doi, signal)
      if (!result) throw Error("Chưa tìm thấy DOI trên Crossref.")
      const ref = { ...result, id: uid(), addedAt: Date.now() }
      setClaims((prev) => [
        ...(snapshot && snapshot !== essay ? [] : prev),
        {
          id: uid(),
          text: essay.trim(),
          query: manual,
          why: "Nguồn bạn chọn để đối chiếu với đoạn/bài đang mở.",
          refs: [ref],
        },
      ])
      setSnapshot(essay)
    })
  const save = (ref: Ref) => {
    const refs = readLS<Ref[]>("bloom.research.refs", [])
    if (refs.some((r) => r.doi && r.doi === ref.doi)) return
    if (!writeLS("bloom.research.refs", [ref, ...refs]))
      throw Error("Chưa lưu được nguồn trên thiết bị.")
  }
  const upload = async (file: File) => {
    try {
      const parsed = await parseFile(file, file.name)
      if (!parsed.text.trim())
        throw Error(
          "Tệp chưa có lớp chữ. Bạn có thể đọc scan ở Tài liệu rồi dùng phần chữ đã kiểm tra.",
        )
      setSource({
        id: file.name,
        name: file.name,
        fileKind: parsed.kind,
        text: parsed.text,
        parts: parsed.parts,
      })
      setConfirmed({})
      setVerdicts({})
    } catch (e) {
      toast.error((e as Error).message)
    }
  }
  const stale = snapshot && essay !== snapshot
  return (
    <Card className="citation-companion space-y-4 p-5">
      <h3 className="font-medium">Cùng xem bài và nguồn</h3>
      <p className="text-xs leading-relaxed text-slate-500">
        Đọc bài, tìm nguồn rồi đối chiếu bằng chứng.
      </p>
      <HelpDetails summary="Nguồn được kiểm tra thế nào?">
        <p>
          DOI xác nhận thông tin thư mục, không chứng minh nguồn hỗ trợ ý đang
          viết. Hãy đối chiếu tóm tắt hoặc toàn văn trước khi chèn. AI đọc bài
          khi bạn chọn bắt đầu; từ khóa tìm được gửi tới Crossref.
        </p>
      </HelpDetails>
      <div className="citation-style-control">
        <Label>Kiểu trích dẫn</Label>{" "}
        <Select
          aria-label="Kiểu trích dẫn"
          value={style}
          onValueChange={(value) => setStyle(value as Style)}
        >
          {Object.entries(STYLE_LABEL).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <Button
        loading={busy === "read"}
        disabled={!!busy || !essay.trim()}
        onClick={analyze}
      >
        Đọc bài và gợi ý nguồn
      </Button>
      {busy && (
        <div
          className="flex items-center justify-between gap-2 text-xs"
          role="status"
        >
          <span>{progress || "Đang đối chiếu…"}</span>
          <Button variant="ghost" onClick={() => abort.current?.abort()}>
            Dừng
          </Button>
        </div>
      )}
      {stale && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs leading-6">
          Bài đã thay đổi sau lần kiểm tra. Hãy đọc lại trước khi chèn trích dẫn
          để tránh gắn nhầm ý.
        </p>
      )}

      <details className="rounded-xl border border-violet-100 p-3">
        <summary className="cursor-pointer text-xs text-violet-600">
          Mình đã có nguồn
        </summary>
        <input
          className="mt-3 max-w-full text-xs"
          type="file"
          accept=".pdf,.docx,.pptx,.txt,.md"
          onChange={(e) => {
            if (e.target.files?.[0]) upload(e.target.files[0])
          }}
        />
        {source && (
          <p className="my-2 text-xs">
            Nguồn đang dùng: {source.name} · {source.parts.length} trang/phần{" "}
            <button
              onClick={() => {
                setSource(null)
                setConfirmed({})
                setVerdicts({})
              }}
            >
              Bỏ tệp này
            </button>
          </p>
        )}
        <Textarea
          className="mt-3"
          rows={6}
          value={sourceText}
          onChange={(e) => {
            setSourceText(e.target.value)
            setSource(null)
            setConfirmed({})
            setVerdicts({})
          }}
          placeholder="Hoặc dán đoạn nguồn nguyên văn tại đây."
        />
        <Label className="mt-3">
          DOI của nguồn (nếu muốn lấy thông tin trích dẫn)
        </Label>
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="10.xxxx/…"
        />
        <Button
          className="mt-2"
          variant="outline"
          disabled={!!busy || !essay.trim() || !manual.trim()}
          onClick={addManual}
        >
          Tra DOI và đối chiếu ý đang viết
        </Button>
      </details>
      {claims.map((claim, index) => (
        <article
          key={claim.id}
          className="space-y-3 rounded-xl border border-violet-100 p-3"
        >
          <small className="text-violet-500">Ý {index + 1} cần xem nguồn</small>
          <p className="text-sm leading-7">“{claim.text}”</p>
          <p className="text-xs leading-6 text-slate-500">{claim.why}</p>
          {claim.error && (
            <p className="text-xs text-amber-700">{claim.error}</p>
          )}
          <details>
            <summary className="cursor-pointer text-xs">
              Điều chỉnh từ khóa tìm
            </summary>
            <Input
              className="mt-2"
              value={claim.query}
              onChange={(e) =>
                setClaims((prev) =>
                  prev.map((c) =>
                    c.id === claim.id ? { ...c, query: e.target.value } : c,
                  ),
                )
              }
            />
            <Button
              className="mt-2"
              variant="outline"
              disabled={!!busy}
              onClick={() =>
                run(claim.id, async (signal) => {
                  const refs = (
                    await searchWorks(claim.query, 4, true, signal)
                  ).map((r) => ({ ...r, id: uid(), addedAt: Date.now() }))
                  setClaims((prev) =>
                    prev.map((c) =>
                      c.id === claim.id ? { ...c, refs, error: undefined } : c,
                    ),
                  )
                })
              }
            >
              Tìm lại nguồn
            </Button>
          </details>
          {claim.refs.map((ref) => {
            const key = claim.id + ref.id,
              v = verdicts[key]
            return (
              <div key={ref.id} className="rounded-xl bg-slate-50 p-3">
                <a
                  className="text-sm font-medium text-violet-700 underline"
                  href={
                    ref.doi
                      ? `https://doi.org/${encodeURIComponent(ref.doi)}`
                      : ref.url
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {ref.title}
                </a>
                <p className="my-2 text-xs text-slate-500">
                  {ref.authors[0]?.family || "Chưa rõ tác giả"}
                  {ref.authors.length > 1 ? " và cộng sự" : ""} ·{" "}
                  {ref.year || "Chưa rõ năm"}
                </p>
                <HelpDetails summary="Thông tin trích dẫn">
                  <p>{refText(ref, style)}</p>
                  <p>
                    Metadata từ Crossref; cần đọc nội dung để đánh giá độ phù
                    hợp.
                  </p>
                </HelpDetails>
                {ref.abstract && (
                  <details className="mt-2 text-xs leading-6">
                    <summary>Đọc đoạn tóm tắt có sẵn</summary>
                    <p>{ref.abstract}</p>
                  </details>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {ref.abstract && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!!busy}
                      onClick={() => check(claim, ref, false)}
                    >
                      Đối chiếu tóm tắt
                    </Button>
                  )}
                  {(source || sourceText.trim()) && (
                    <>
                      <label className="flex w-full gap-2 text-xs leading-6">
                        <input
                          type="checkbox"
                          checked={!!confirmed[key]}
                          onChange={(e) =>
                            setConfirmed((prev) => ({
                              ...prev,
                              [key]: e.target.checked,
                            }))
                          }
                        />{" "}
                        Tệp/đoạn mình cung cấp thuộc đúng nguồn này
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!busy || !confirmed[key]}
                        onClick={() => check(claim, ref, true)}
                      >
                        Đối chiếu với nội dung nguồn
                      </Button>
                    </>
                  )}
                </div>
                {v && (
                  <div className="mt-3 border-t pt-3">
                    <strong className="text-xs">
                      {
                        {
                          supports: "Có bằng chứng hỗ trợ trong phần đã đọc",
                          partial: "Chỉ hỗ trợ một phần",
                          contradicts: "Có nội dung trái với ý trong bài",
                          insufficient: "Chưa đủ bằng chứng",
                        }[v.status]
                      }
                    </strong>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-6">
                      {v.explanation}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {v.scope} · Nhận xét AI để bạn kiểm tra, không phải kết
                      luận chắc chắn
                    </p>
                    {v.evidence.map((e, i) => (
                      <blockquote
                        key={i}
                        className="mt-2 border-l-2 border-violet-200 pl-3 text-xs leading-6"
                      >
                        [Trang/phần {e.page}] “{e.quote}”
                      </blockquote>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      save(ref)
                      toast.success("Đã giữ nguồn để bạn xem lại.")
                    }}
                  >
                    Giữ nguồn
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyText(inText(ref, style) + "\n" + refText(ref, style))
                    }
                  >
                    Sao chép trích dẫn
                  </Button>
                  {onInsert && (
                    <Button
                      size="sm"
                      disabled={
                        !!stale ||
                        !v ||
                        !["supports", "partial"].includes(v.status)
                      }
                      onClick={() => {
                        save(ref)
                        const next = onInsert(claim.text, ref, style)
                        if (next) setSnapshot(next)
                      }}
                    >
                      Mình đã đọc · Chèn vào bài
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </article>
      ))}
      {claims.length > 0 && (
        <p className="text-xs leading-6 text-slate-500">
          Nếu nguồn chỉ hỗ trợ một phần hoặc phản bác ý đang viết, nên điều
          chỉnh câu theo bằng chứng. Mình không tự chèn nguồn để làm cho một
          nhận định có vẻ đúng.
        </p>
      )}
    </Card>
  )
}
