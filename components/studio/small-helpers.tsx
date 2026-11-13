"use client"
import dynamic from "next/dynamic"
import { FocusTimer } from "./focus-timer"
const TemplateFiller = dynamic(
  () => import("./template-filler").then((m) => m.TemplateFiller),
  { loading: () => <p>Đang mở công cụ điền mẫu…</p> },
)
const PhotoHelper = dynamic(
  () => import("./photo-helper").then((m) => m.PhotoHelper),
  { loading: () => <p>Đang mở góc ảnh…</p> },
)
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { HelpDetails, Button, Card, Input, Label, Select, Textarea } from "./ui"
import { callAi } from "@/lib/studio/ai"
import { copyText, downloadFile, safeFileName } from "@/lib/studio/storage"
import { emlDraft, renamedFiles } from "@/lib/studio/file-tools"
const EMAILS = [
  "Xin thông tin",
  "Xin lịch hẹn",
  "Xin nghỉ / đổi lịch",
  "Gửi bài / gửi tài liệu",
  "Cảm ơn",
  "Xin lỗi",
  "Nhờ hỗ trợ",
  "Ứng tuyển",
  "Theo dõi sau ứng tuyển",
  "Phản hồi lời mời",
  "Từ chối lịch sự",
  "Khiếu nại / góp ý",
  "Đề xuất hợp tác",
  "Xin gia hạn",
  "Chúc mừng",
  "Trao đổi với giảng viên",
]
export function SmallHelpers() {
  const [tab, setTab] = useState("email")
  const [templateOpened, setTemplateOpened] = useState(false)
  useLayoutEffect(() => {
    const requested = new URLSearchParams(location.search).get("task")
    if (
      ["email", "files", "template", "focus", "photos"].includes(
        requested || "",
      )
    ) {
      setTab(requested!)
      if (requested === "template") setTemplateOpened(true)
    }
  }, [])
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs tracking-widest text-violet-400">
          NHỮNG VIỆC NHỎ
        </p>
        <h1 className="mt-2 font-semibold text-2xl">Bạn cần giúp việc gì?</h1>
        <p className="mt-2 text-sm text-slate-500">
          Viết email, sửa file hay chỉnh một tấm ảnh.
        </p>
      </header>
      <div
        aria-label="Chọn việc cần giúp"
        className="studio-task-tabs flex flex-wrap gap-2"
      >
        {[
          ["email", "Viết email"],
          ["files", "Sửa file"],
          ["template", "Điền mẫu"],
          ["focus", "Tập trung"],
          ["photos", "Chỉnh ảnh"],
        ].map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? "primary" : "outline"}
            onClick={() => {
              setTab(id)
              if (id === "template") setTemplateOpened(true)
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {tab === "email" ? (
        <EmailComposer />
      ) : tab === "files" ? (
        <FileHelpers />
      ) : tab === "template" ? null : tab === "photos" ? (
        <PhotoHelper />
      ) : (
        <FocusTimer />
      )}
      {templateOpened && (
        <div hidden={tab !== "template"}>
          <TemplateFiller />
        </div>
      )}
    </div>
  )
}
function EmailComposer() {
  const [purpose, setPurpose] = useState(EMAILS[0]),
    [to, setTo] = useState(""),
    [facts, setFacts] = useState(""),
    [tone, setTone] = useState("Lịch sự, tự nhiên"),
    [lang, setLang] = useState("vi"),
    [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [past, setPast] = useState<{ subject: string; body: string } | null>(null)
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])
  const draft = async () => {
    if (!facts.trim())
      return toast.info("Bạn có thể kể ngắn điều muốn nói trước nhé.")
    abort.current = new AbortController()
    setBusy(true)
    try {
      const value = await callAi<{ subject: string; body: string }>(
        "email-compose",
        { text: JSON.stringify({ purpose, to, facts, tone, lang }) },
        abort.current.signal,
      )
      if (typeof value.subject !== "string" || typeof value.body !== "string")
        throw Error("Chưa nhận được email hợp lệ.")
      setPast({ subject, body })
      setSubject(value.subject)
      setBody(value.body)
    } catch (e) {
      if (!abort.current.signal.aborted) toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-4 p-5">
        <h2 className="font-medium">Bạn muốn nói điều gì?</h2>
        <label className="block">
          <Label>Mục đích</Label>
          <Select value={purpose} onValueChange={(value) => setPurpose(value)}>
            {EMAILS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </label>
        <label className="block">
          <Label>Người nhận / cách xưng hô</Label>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Ví dụ: cô hướng dẫn, bộ phận tuyển dụng…"
          />
        </label>
        <label className="block">
          <Label>Điều bạn muốn nói, dữ kiện cần giữ</Label>
          <Textarea
            rows={7}
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            placeholder="Kể vài ý chính, mình giúp bạn viết."
          />
        </label>
        <label className="block">
          <Label>Giọng điệu</Label>
          <Select value={tone} onValueChange={(value) => setTone(value)}>
            {[
              "Lịch sự, tự nhiên",
              "Trang trọng",
              "Thân thiện",
              "Ngắn gọn",
              "Kiên định nhưng tôn trọng",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </label>
        <Select
          aria-label="Ngôn ngữ email"
          value={lang}
          onValueChange={(value) => setLang(value)}
        >
          <option value="vi">Tiếng Việt</option>
          <option value="en">Tiếng Anh</option>
          <option value="ko">Tiếng Hàn</option>
        </Select>
        <div className="flex gap-2">
          <Button loading={busy} onClick={draft}>
            Soạn bản nháp
          </Button>
          {busy && (
            <Button variant="outline" onClick={() => abort.current?.abort()}>
              Dừng
            </Button>
          )}
        </div>
      </Card>
      <Card className="space-y-4 p-5">
        <h2 className="font-medium">Bản nháp của bạn</h2>
        <label className="block">
          <Label>Tiêu đề email</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <Textarea
          rows={16}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Nội dung email"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!body}
            onClick={() =>
              copyText(`Tiêu đề: ${subject}\n\n${body}`).then(() =>
                toast.success("Đã sao chép bản nháp."),
              )
            }
          >
            Sao chép
          </Button>
          <Button
            disabled={!body}
            variant="outline"
            onClick={() =>
              downloadFile(
                `${safeFileName(subject)}.eml`,
                emlDraft("", subject, body),
                "message/rfc822",
              )
            }
          >
            Tải bản nháp .eml
          </Button>
          <Button
            disabled={!past}
            variant="ghost"
            onClick={() => {
              if (past) {
                setSubject(past.subject)
                setBody(past.body)
                setPast(null)
              }
            }}
          >
            Hoàn tác đề xuất
          </Button>
        </div>
        <p className="text-xs leading-6 text-slate-500">
          Chỉ tạo bản nháp; bạn tự gửi từ ứng dụng mail.
        </p>
      </Card>
    </div>
  )
}
function FileHelpers() {
  const [files, setFiles] = useState<File[]>([]),
    [task, setTask] = useState("rename"),
    [prefix, setPrefix] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [range, setRange] = useState(""),
    [rotation, setRotation] = useState("0"),
    [type, setType] = useState("image/jpeg"),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("")
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])
  const names = renamedFiles(
    files.map((f) => f.name),
    prefix,
    1,
    from,
    to,
  )
  const pick = (list: FileList | null) => {
    if (!list) return
    const selected = Array.from(list)
    if (selected.reduce((n, f) => n + f.size, 0) > 100 * 1024 * 1024)
      return toast.error("Mỗi lượt tối đa 100 MB để tránh quá tải thiết bị.")
    setFiles(selected)
  }
  const run = async () => {
    abort.current = new AbortController()
    const signal = abort.current.signal
    const exportDownload: typeof downloadFile = (...args) => {
      signal.throwIfAborted()
      downloadFile(...args)
    }
    setBusy(true)
    try {
      const tools = await import("@/lib/studio/file-tools")
      if (task === "rename") {
        exportDownload(
          "cac-file-da-doi-ten.zip",
          (await tools.renameZip(files, names, signal)) as BlobPart,
          "application/zip",
        )
      } else if (task === "pdf") {
        if (files.some((f) => !f.name.toLowerCase().endsWith(".pdf")))
          throw Error("Chọn các file PDF cho thao tác này.")
        exportDownload(
          "tai-lieu.pdf",
          (await tools.pdfTools(
            files,
            range,
            Number(rotation),
            signal,
          )) as BlobPart,
          "application/pdf",
        )
      } else if (task === "imagepdf") {
        if (files.some((f) => !f.type.startsWith("image/")))
          throw Error("Chọn các ảnh để ghép thành PDF.")
        exportDownload(
          "bo-anh.pdf",
          (await tools.imagesToPdf(files, signal)) as BlobPart,
          "application/pdf",
        )
      } else if (task === "extract") {
        const { parseFile } = await import("@/lib/studio/docparse")
        const { zipSync, strToU8 } = await import("fflate")
        const data: Record<string, Uint8Array> = Object.create(null)
        for (let i = 0; i < files.length; i++) {
          setStatus(`Đang đọc ${i + 1}/${files.length}: ${files[i].name}`)
          const parsed = await parseFile(files[i], files[i].name, { signal })
          data[`${i + 1}-${safeFileName(files[i].name)}.txt`] = strToU8(
            parsed.parts.map((p, j) => `[Phần ${j + 1}]\n${p}`).join("\n\n"),
          )
        }
        exportDownload(
          "chu-trong-tai-lieu.zip",
          zipSync(data) as BlobPart,
          "application/zip",
        )
      } else if (task === "pdfimages") {
        const { renderPdfPages, pdfPageCount } = await import(
            "@/lib/studio/docparse"
          ),
          { zipSync } = await import("fflate")
        const data: Record<string, Uint8Array> = Object.create(null)
        let bytes = 0
        for (let i = 0; i < files.length; i++) {
          if (!files[i].name.toLowerCase().endsWith(".pdf"))
            throw Error("Chọn file PDF.")
          const total = await pdfPageCount(files[i]),
            pages = tools.pageSelection(range, total)
          if (pages.length > 150)
            throw Error(
              "Mỗi lượt xuất tối đa 150 trang ảnh. Chọn một khoảng trang rồi xuất tiếp phần còn lại.",
            )
          for (const p of pages) {
            signal.throwIfAborted()
            setStatus(`Đang dựng trang ${p + 1}/${total}`)
            const [page] = await renderPdfPages(
              files[i],
              1600,
              1,
              undefined,
              p + 1,
            )
            const image = new Uint8Array(
              await (await fetch(page.src)).arrayBuffer(),
            )
            bytes += image.byteLength
            if (bytes > 100 * 1024 * 1024)
              throw Error(
                "Ảnh đầu ra vượt 100 MB; bạn chọn ít trang hơn để xuất nhé.",
              )
            data[`${i + 1}-${safeFileName(files[i].name)}-trang-${p + 1}.jpg`] =
              image
          }
        }
        signal.throwIfAborted()
        exportDownload(
          "anh-cac-trang.zip",
          zipSync(data, { level: 0 }) as BlobPart,
          "application/zip",
        )
      } else {
        const { zipSync } = await import("fflate")
        const data: Record<string, Uint8Array> = Object.create(null)
        for (let i = 0; i < files.length; i++) {
          signal.throwIfAborted()
          const img = new Image(),
            url = URL.createObjectURL(files[i])
          try {
            img.src = url
            await img.decode()
            const canvas = document.createElement("canvas")
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext("2d")!
            if (type === "image/jpeg") {
              ctx.fillStyle = "white"
              ctx.fillRect(0, 0, canvas.width, canvas.height)
            }
            ctx.drawImage(img, 0, 0)
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, type, 0.88),
            )
            if (!blob || blob.type !== type)
              throw Error("Trình duyệt chưa hỗ trợ định dạng ảnh này.")
            data[
              `${i + 1}-${safeFileName(files[i].name.replace(/\.[^.]+$/, ""))}.${type.split("/")[1].replace("jpeg", "jpg")}`
            ] = new Uint8Array(await blob.arrayBuffer())
          } finally {
            URL.revokeObjectURL(url)
          }
        }
        exportDownload(
          "anh-da-doi-dinh-dang.zip",
          zipSync(data, { level: 0 }) as BlobPart,
          "application/zip",
        )
      }
      signal.throwIfAborted()
      toast.success("Đã chuẩn bị bản tải về; file gốc vẫn giữ nguyên.")
    } catch (e) {
      if (!signal.aborted) toast.error((e as Error).message)
    } finally {
      setBusy(false)
      setStatus("")
    }
  }
  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-medium">Giữ nguyên file gốc, tải một bản mới</h2>
      <Select
        aria-label="Thao tác với file"
        value={task}
        onValueChange={(value) => {
          setTask(value)
          setFiles([])
        }}
      >
        <option value="rename">Đổi tên hàng loạt → ZIP</option>
        <option value="pdf">Gộp / chọn trang / xoay PDF</option>
        <option value="imagepdf">Ghép ảnh thành PDF</option>
        <option value="image">Đổi ảnh PNG / JPG / WebP</option>
        <option value="pdfimages">PDF thành ảnh từng trang</option>
        <option value="extract">Lấy chữ từ PDF / Word / slide → TXT</option>
      </Select>
      <input
        aria-label="Chọn file cần xử lý"
        type="file"
        multiple
        accept={
          task === "pdf" || task === "pdfimages"
            ? ".pdf"
            : task === "imagepdf" || task === "image"
              ? "image/png,image/jpeg,image/webp"
              : undefined
        }
        onChange={(e) => pick(e.target.files)}
      />
      {task === "rename" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <Label>Tên chung + số thứ tự</Label>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Để trống nếu chỉ thay chữ"
            />
          </label>
          <label>
            <Label>Thay chữ này</Label>
            <Input value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <Label>Thành chữ này</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      )}
      {(task === "pdf" || task === "pdfimages") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <Label>Trang muốn lấy ở mỗi file (trống = tất cả)</Label>
            <Input
              value={range}
              onChange={(e) => setRange(e.target.value)}
              placeholder="1,3-5"
            />
          </label>
          {task === "pdf" && (
            <label>
              <Label>Xoay thêm</Label>
              <Select
                value={rotation}
                onValueChange={(value) => setRotation(value)}
              >
                {["0", "90", "180", "270"].map((x) => (
                  <option key={x} value={x}>
                    {x}°
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
      )}
      {task === "image" && (
        <Select value={type} onValueChange={(value) => setType(value)}>
          <option value="image/jpeg">JPG · nền trắng khi ảnh trong suốt</option>
          <option value="image/png">PNG · giữ nền trong suốt</option>
          <option value="image/webp">WebP</option>
        </Select>
      )}
      <div className="space-y-2">
        {files.map((f, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs"
          >
            <span className="flex-1 break-all">
              {f.name}
              {task === "rename" && (
                <strong className="mt-1 block text-violet-600">
                  → {names[i]}
                </strong>
              )}
            </span>
            <button
              disabled={busy || i === 0}
              onClick={() =>
                setFiles((prev) => {
                  const next = [...prev]
                  ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                  return next
                })
              }
            >
              Lên
            </button>
            <button
              disabled={busy || i === files.length - 1}
              onClick={() =>
                setFiles((prev) => {
                  const next = [...prev]
                  ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
                  return next
                })
              }
            >
              Xuống
            </button>
            <button
              disabled={busy}
              onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
            >
              Bỏ chọn
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">File gốc được giữ nguyên.</p>
      <HelpDetails summary="Trước khi chuyển file">
        <p>
          Thứ tự trên là thứ tự ghép. PDF scan cần đọc chữ ở Tài liệu trước khi
          lấy TXT. Đổi tên không thay định dạng nội dung.
        </p>
      </HelpDetails>
      <Button loading={busy} disabled={!files.length} onClick={run}>
        Tạo bản tải về
      </Button>
      {busy && (
        <Button variant="outline" onClick={() => abort.current?.abort()}>
          Dừng
        </Button>
      )}
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
    </Card>
  )
}
