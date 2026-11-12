"use client"
import { useRef, useState, useEffect } from "react"
import { toast } from "sonner"
import { HelpDetails, Button, Card, Label, Textarea } from "./ui"
import { callAi } from "@/lib/studio/ai"
import type { CV } from "@/lib/studio/cv-data"
export function CvCoach({
  cv,
  setCv,
}: {
  cv: CV
  setCv: (fn: (cv: CV) => CV) => void
}) {
  const [job, setJob] = useState(""),
    [busy, setBusy] = useState(false),
    [proposal, setProposal] = useState<{
      summary: string
      explanations: string[]
      questions: string[]
      experience: { id: string; bullets: string }[]
      source: string
    } | null>(null),
    [before, setBefore] = useState<CV | null>(null),
    [applied, setApplied] = useState("")
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])
  const context = JSON.stringify({
    summary: cv.summary,
    experience: cv.experience,
    education: cv.education,
    projects: cv.projects,
    skills: cv.skills,
    title: cv.title,
  })
  const ask = async () => {
    abort.current = new AbortController()
    setBusy(true)
    try {
      const result = await callAi<Omit<NonNullable<typeof proposal>, "source">>(
        "cv-coach",
        { text: JSON.stringify({ cv: JSON.parse(context), job }) },
        abort.current.signal,
      )
      if (
        typeof result.summary !== "string" ||
        !Array.isArray(result.experience) ||
        result.experience.some(
          (e) =>
            !cv.experience.some((x) => x.id === e.id) ||
            typeof e.bullets !== "string",
        ) ||
        !Array.isArray(result.explanations) ||
        !Array.isArray(result.questions)
      )
        throw Error("Gợi ý chưa hợp lệ.")
      setProposal({ ...result, source: context })
    } catch (e) {
      if (!abort.current.signal.aborted) toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="space-y-3 p-4">
      <h3 className="font-medium">Kể rõ hơn những điều bạn đã làm</h3>
      <p className="text-xs leading-relaxed text-slate-500">
        AI gợi ý cách viết; bạn kiểm tra dữ kiện trước khi giữ.
      </p>
      <HelpDetails summary="AI xem phần nào của CV?">
        <p>
          Gợi ý dùng nội dung hồ sơ và mô tả công việc bạn đưa vào. Không gửi
          ảnh hay thông tin liên hệ. Hãy đối chiếu công việc, số liệu và kỹ năng
          trong bản đề xuất.
        </p>
      </HelpDetails>
      <Label>Vị trí muốn ứng tuyển / yêu cầu công việc (nếu có)</Label>
      <Textarea
        rows={4}
        value={job}
        onChange={(e) => setJob(e.target.value)}
        placeholder="Bạn có thể dán một đoạn mô tả công việc để đối chiếu."
      />
      <div className="flex gap-2">
        <Button loading={busy} onClick={ask}>
          Gợi ý cho hồ sơ này
        </Button>
        {busy && (
          <Button variant="outline" onClick={() => abort.current?.abort()}>
            Dừng
          </Button>
        )}
      </div>
      {proposal && (
        <>
          <h4 className="text-sm font-medium">Phần giới thiệu được đề xuất</h4>
          <Textarea
            rows={5}
            value={proposal.summary}
            onChange={(e) =>
              setProposal({ ...proposal, summary: e.target.value })
            }
          />
          {proposal.experience.map((e) => (
            <label className="block" key={e.id}>
              <Label>{cv.experience.find((x) => x.id === e.id)?.role}</Label>
              <Textarea
                rows={5}
                value={e.bullets}
                onChange={(event) =>
                  setProposal({
                    ...proposal,
                    experience: proposal.experience.map((x) =>
                      x.id === e.id ? { ...x, bullets: event.target.value } : x,
                    ),
                  })
                }
              />
            </label>
          ))}
          <ul className="list-disc space-y-2 pl-5 text-xs leading-6 text-slate-500">
            {proposal.explanations.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
          {proposal.questions.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs leading-6">
              Thông tin bạn có thể bổ sung nếu đúng với trải nghiệm của mình:
              {proposal.questions.map((q, i) => (
                <p key={i}>• {q}</p>
              ))}
            </div>
          )}
          <Button
            onClick={() => {
              if (context !== proposal.source)
                return toast.info(
                  "Hồ sơ đã thay đổi; hãy tạo gợi ý mới để không ghi đè chỉnh sửa của bạn.",
                )
              setBefore(cv)
              setApplied(
                JSON.stringify({
                  summary: proposal.summary,
                  bullets: cv.experience.map((e) => [
                    e.id,
                    proposal.experience.find((x) => x.id === e.id)?.bullets ??
                      e.bullets,
                  ]),
                }),
              )
              setCv((current) => ({
                ...current,
                summary: proposal.summary,
                experience: current.experience.map((e) => ({
                  ...e,
                  bullets:
                    proposal.experience.find((x) => x.id === e.id)?.bullets ??
                    e.bullets,
                })),
              }))
              setProposal(null)
            }}
          >
            Mình đã đọc · Áp dụng cách diễn đạt
          </Button>
        </>
      )}
      {before && (
        <Button
          variant="ghost"
          onClick={() => {
            if (
              JSON.stringify({
                summary: cv.summary,
                bullets: cv.experience.map((e) => [e.id, e.bullets]),
              }) !== applied
            )
              return toast.info(
                "Hồ sơ đã có chỉnh sửa mới, mình giữ lại để tránh ghi đè.",
              )
            setCv((current) => ({
              ...current,
              summary: before.summary,
              experience: current.experience.map((e) => ({
                ...e,
                bullets:
                  before.experience.find((x) => x.id === e.id)?.bullets ??
                  e.bullets,
              })),
            }))
            setBefore(null)
          }}
        >
          Hoàn tác lần áp dụng vừa rồi
        </Button>
      )}
      <a
        href="/studio/helpers?task=template"
        className="block text-xs text-violet-600 underline"
      >
        Dùng thông tin này với mẫu Word của riêng bạn
      </a>
    </Card>
  )
}
