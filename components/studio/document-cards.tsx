"use client"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button, Textarea } from "./ui"
import { callAi } from "@/lib/studio/ai"
import { downloadFile } from "@/lib/studio/storage"
import { notesText, type Note } from "@/lib/studio/document-knowledge"
export function DocumentCards({ notes }: { notes: Note[] }) {
  const [questions, setQuestions] = useState<Record<number, string>>({}),
    [open, setOpen] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState("")
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])
  const make = async () => {
    abort.current = new AbortController()
    const signal = abort.current.signal
    setBusy(true)
    try {
      for (let i = 0; i < notes.length; i += 8) {
        signal.throwIfAborted()
        setProgress(
          `Đang soạn câu hỏi ${i + 1}–${Math.min(i + 8, notes.length)}/${notes.length}`,
        )
        const result = await callAi<{
          questions: { id: number; question: string }[]
        }>(
          "document-cards",
          {
            text: JSON.stringify(
              notes
                .slice(i, i + 8)
                .map((n, j) => ({ id: i + j, text: n.text })),
            ),
          },
          signal,
        )
        signal.throwIfAborted()
        const next: Record<number, string> = {}
        for (const q of result.questions) {
          if (
            !Number.isInteger(q.id) ||
            q.id < i ||
            q.id >= Math.min(i + 8, notes.length) ||
            typeof q.question !== "string" ||
            !q.question.trim()
          )
            throw Error(
              "Một câu hỏi chưa gắn đúng ghi chú. Những thẻ đã soạn vẫn được giữ.",
            )
          next[q.id] = q.question
        }
        if (Object.keys(next).length !== Math.min(8, notes.length - i))
          throw Error("Chưa có đủ câu hỏi cho phần này. Bạn có thể thử lại.")
        setQuestions((prev) => ({ ...prev, ...next }))
      }
    } catch (e) {
      if (!signal.aborted) toast.error((e as Error).message)
    } finally {
      setBusy(false)
      setProgress("")
    }
  }
  const question = (i: number) =>
    questions[i] ||
    `Bạn nhớ ý chính thứ ${i + 1} từ trang/phần ${notes[i].evidence[0].page} như thế nào?`
  return (
    <div className="space-y-3">
      <p className="text-xs leading-6 text-slate-500">
        Tự nhớ trước khi lật. Đáp án giữ nguyên ý chính đã đối chiếu nguồn; AI
        chỉ giúp đặt câu hỏi. Bạn có thể sửa câu hỏi hoặc dừng tùy ý.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button loading={busy} onClick={make}>
          Soạn câu hỏi từ các ý chính
        </Button>
        {busy && (
          <Button variant="outline" onClick={() => abort.current?.abort()}>
            Dừng
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() =>
            downloadFile(
              "the-on-tap.txt",
              notes
                .map(
                  (n, i) =>
                    `Hỏi: ${question(i)}\nĐáp: ${n.text}\n${notesText([n], "Nguồn")}`,
                )
                .join("\n\n"),
              "text/plain;charset=utf-8",
            )
          }
        >
          Tải bộ thẻ có nguồn
        </Button>
      </div>
      {progress && (
        <p role="status" className="text-xs">
          {progress}
        </p>
      )}
      {notes.map((n, i) => (
        <article
          key={i}
          className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4"
        >
          <small className="text-violet-600">
            Thẻ {i + 1} · Nguồn {n.evidence.map((e) => e.page).join(", ")}
          </small>
          <Textarea
            className="mt-3"
            aria-label={`Câu hỏi thẻ ${i + 1}`}
            rows={2}
            value={question(i)}
            onChange={(e) =>
              setQuestions((prev) => ({ ...prev, [i]: e.target.value }))
            }
          />
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => setOpen(open === i ? null : i)}
          >
            {open === i ? "Úp thẻ lại" : "Mình thử nhớ rồi · Lật thẻ"}
          </Button>
          {open === i && (
            <div className="mt-3 text-sm leading-7">
              <p>{n.text}</p>
              {n.evidence.map((e, j) => (
                <blockquote key={j} className="mt-2 border-l-2 pl-3 text-xs">
                  [Nguồn {e.page}] “{e.quote}”
                </blockquote>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
