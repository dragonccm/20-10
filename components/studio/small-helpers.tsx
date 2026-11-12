"use client"
import dynamic from "next/dynamic"
import { FocusTimer } from "./focus-timer"
const PhotoHelper = dynamic(
  () => import("./photo-helper").then((m) => m.PhotoHelper),
  { loading: () => <p>Đang mở góc ảnh…</p> },
)
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button, Card, Input, Label, Select, Textarea } from "./ui"
import { callAi } from "@/lib/studio/ai"
import {
  copyText,
  downloadFile,
  readLS,
  safeFileName,
} from "@/lib/studio/storage"
import { emlDraft, renamedFiles } from "@/lib/studio/file-tools"
import type { CV } from "@/lib/studio/cv-data"
import { textToHtml } from "@/lib/studio/text"
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
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("task")
    if (
      ["email", "files", "template", "focus", "photos"].includes(
        requested || "",
      )
    )
      setTab(requested!)
  }, [])
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs tracking-widest text-violet-400">
          NHỮNG VIỆC NHỎ
        </p>
        <h1 className="mt-3 font-serif text-3xl">Bạn muốn gỡ rối việc nào?</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Chọn một việc đang cần. Các công cụ chỉ chạy khi bạn chọn. File được
          xử lý trên thiết bị; email và gợi ý phong cách ảnh dùng AI theo yêu
          cầu của bạn.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {[
          ["email", "Viết email"],
          ["files", "Sắp xếp & đổi file"],
          ["template", "Điền đúng mẫu Word"],
          ["focus", "Một khoảng tập trung"],
          ["photos", "Sửa ảnh từng vùng"],
        ].map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? "primary" : "outline"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {tab === "email" ? (
        <EmailComposer />
      ) : tab === "files" ? (
        <FileHelpers />
      ) : tab === "template" ? (
        <WordTemplates />
      ) : tab === "photos" ? (
        <PhotoHelper />
      ) : (
        <FocusTimer />
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
        <h2 className="font-medium">Một email cho đúng dịp</h2>
        <label className="block">
          <Label>Mục đích</Label>
          <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
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
            placeholder="Bạn có thể kể bằng vài gạch đầu dòng. Thông tin chưa có sẽ để chỗ trống, không tự bịa."
          />
        </label>
        <label className="block">
          <Label>Giọng điệu</Label>
          <Select value={tone} onChange={(e) => setTone(e.target.value)}>
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
          onChange={(e) => setLang(e.target.value)}
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
        <h2 className="font-medium">Bạn đọc và sửa trước khi gửi</h2>
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
          Ứng dụng không gửi email và không truy cập hộp thư. Bạn tự chọn người
          nhận khi mở bản nháp trong ứng dụng mail.
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
        onChange={(e) => {
          setTask(e.target.value)
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
                onChange={(e) => setRotation(e.target.value)}
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
        <Select value={type} onChange={(e) => setType(e.target.value)}>
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
      <p className="text-xs leading-6 text-slate-500">
        Thứ tự trên là thứ tự trong file ghép. PDF scan không có lớp chữ cần
        được đọc chữ ở Tài liệu trước khi lấy TXT. Đổi tên không đổi định dạng
        nội dung.
      </p>
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
function WordTemplates() {
  const [file, setFile] = useState<File | null>(null),
    [fields, setFields] = useState<string[]>([]),
    [values, setValues] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [paragraphs, setParagraphs] = useState<{ index: number; text: string }[]>(
      [],
    ),
    [replacements, setReplacements] = useState<Record<number, string>>({}),
    [sourceValues, setSourceValues] = useState<Record<string, string>>({}),
    [search, setSearch] = useState("")
  const select = async (f: File) => {
    setBusy(true)
    try {
      const { templateFields, wordParagraphs } = await import(
        "@/lib/studio/word-template"
      )
      const data = new Uint8Array(await f.arrayBuffer()),
        keys = templateFields(data)
      setFile(f)
      setFields(keys)
      setParagraphs(wordParagraphs(data))
      setReplacements({})
      setSourceValues({})
      setValues(Object.fromEntries(keys.map((k) => [k, ""])))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const populate = (kind: "writing" | "cv") => {
    if (kind === "writing") {
      const docs = readLS<{ id: string; title: string; html: string }[]>(
          "bloom.writing.docs",
          [],
        ),
        id = readLS("bloom.writing.active", ""),
        doc = docs.find((d) => d.id === id) || docs[0]
      if (!doc) return toast.info("Chưa có bài viết được lưu.")
      const parsed = new DOMParser().parseFromString(doc.html, "text/html")
      const data = {
        title: doc.title,
        tieu_de: doc.title,
        body: parsed.body.textContent || "",
        noi_dung: parsed.body.textContent || "",
      }
      setSourceValues(data)
      setValues((v) => ({ ...v, ...data }))
      return
    }
    const cv = readLS<CV | null>("bloom.career.cv", null)
    if (!cv)
      return toast.info(
        "Chưa có hồ sơ CV. Bạn có thể điền ở CV & xin việc trước.",
      )
    const data: Record<string, string> = {
      name: cv.name,
      ho_ten: cv.name,
      title: cv.title,
      email: cv.email,
      phone: cv.phone,
      location: cv.location,
      link: cv.link,
      summary: cv.summary,
      skills: cv.skills,
      education: cv.education
        .map((e) => `${e.school} · ${e.degree}\n${e.from}–${e.to}\n${e.detail}`)
        .join("\n\n"),
      experience: cv.experience
        .map((e) => `${e.role} · ${e.org}\n${e.from}–${e.to}\n${e.bullets}`)
        .join("\n\n"),
      projects: cv.projects.map((p) => p.name + "\n" + p.detail).join("\n\n"),
      languages: cv.languages.map((l) => l.name + " · " + l.level).join("\n"),
      certificates: cv.certificates,
    }
    setSourceValues(data)
    setValues((v) => ({
      ...v,
      ...Object.fromEntries(
        Object.entries(data).filter(([k]) => fields.includes(k)),
      ),
    }))
  }
  const sample = async () => {
    const { htmlToDocx } = await import("@/lib/studio/word-template")
    downloadFile(
      "mau-bao-cao.docx",
      htmlToDocx(
        "<h1>{{title}}</h1><p>Tác giả: {{author}}</p><h2>Nội dung</h2><p>{{body}}</p>",
      ) as BlobPart,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
  }
  const exportFile = async () => {
    if (!file) return
    setBusy(true)
    try {
      const { fillWordTemplate, fillWordParagraphs } = await import(
        "@/lib/studio/word-template"
      )
      const bytes = fillWordParagraphs(
        fillWordTemplate(new Uint8Array(await file.arrayBuffer()), values),
        replacements,
      )
      downloadFile(
        "da-dien-" + file.name,
        bytes as BlobPart,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-medium">Điền nội dung, giữ bố cục của mẫu Word</h2>
      <p className="text-sm leading-7 text-slate-500">
        Trong file .docx của bạn, đặt các vùng như {"{{title}}"}, {"{{body}}"},{" "}
        {"{{name}}"}, {"{{experience}}"} ở đúng vị trí. Ứng dụng thay chữ trong
        các vùng đó và giữ nguyên các phần còn lại, gồm kiểu chữ, bảng, ảnh, lề,
        header/footer. Nội dung quá dài vẫn có thể làm Word dàn sang trang mới;
        hãy mở file để kiểm tra trước khi dùng.
      </p>
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Tải mẫu Word"
          type="file"
          accept=".docx"
          onChange={(e) => {
            if (e.target.files?.[0]) select(e.target.files[0])
          }}
        />
        <Button variant="outline" onClick={sample}>
          Tải mẫu báo cáo thử
        </Button>
      </div>
      {file && (
        <>
          <p className="text-sm">
            Mẫu: {file.name} · {fields.length} vùng điền
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => populate("writing")}>
              Lấy bài đang viết
            </Button>
            <Button variant="outline" onClick={() => populate("cv")}>
              Lấy thông tin CV đã lưu
            </Button>
          </div>
          <p className="text-xs leading-6 text-slate-500">
            CV hỗ trợ name, title, email, phone, location, link, summary,
            education, experience, projects, skills, languages, certificates.
            Các vùng khác bạn điền bên dưới. Nếu mẫu không có vùng đánh dấu, bạn
            có thể chọn các đoạn cần thay ở bên dưới; những đoạn không chọn sẽ
            được giữ nguyên.
          </p>
          <details
            open={!fields.length}
            className="rounded-xl border border-violet-100 p-4"
          >
            <summary className="cursor-pointer text-sm">
              Chọn vị trí cần thay trong mẫu ({paragraphs.length} đoạn)
            </summary>
            <p className="my-3 text-xs leading-6 text-slate-500">
              Tích vào một đoạn, chọn dữ liệu đã lấy hoặc tự viết nội dung thay
              thế. Kiểu chữ của vị trí gốc được giữ; các phần khác không bị viết
              lại.
            </p>
            <Input
              aria-label="Tìm đoạn trong mẫu Word"
              placeholder="Tìm đoạn cần thay…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="mt-3 max-h-[650px] space-y-3 overflow-y-auto">
              {paragraphs
                .filter((p) =>
                  p.text.toLowerCase().includes(search.toLowerCase()),
                )
                .map((p) => (
                  <div key={p.index} className="rounded-xl bg-slate-50 p-3">
                    <label className="flex gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={Object.hasOwn(replacements, p.index)}
                        onChange={(e) =>
                          setReplacements((prev) => {
                            const next = { ...prev }
                            if (e.target.checked) next[p.index] = p.text
                            else delete next[p.index]
                            return next
                          })
                        }
                      />
                      <span className="whitespace-pre-wrap">{p.text}</span>
                    </label>
                    {Object.hasOwn(replacements, p.index) && (
                      <div className="mt-3 space-y-2">
                        <Select
                          aria-label={`Dữ liệu thay đoạn ${p.index}`}
                          value=""
                          onChange={(e) => {
                            if (e.target.value)
                              setReplacements((prev) => ({
                                ...prev,
                                [p.index]: sourceValues[e.target.value],
                              }))
                          }}
                        >
                          <option value="">Chọn dữ liệu đã lấy (nếu có)</option>
                          {Object.keys(sourceValues).map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </Select>
                        <Textarea
                          aria-label={`Nội dung thay đoạn ${p.index}`}
                          rows={3}
                          value={replacements[p.index]}
                          onChange={(e) =>
                            setReplacements((prev) => ({
                              ...prev,
                              [p.index]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </details>
          {fields.map((key) => (
            <label key={key} className="block">
              <Label>{key}</Label>
              <Textarea
                rows={key === "body" || key === "experience" ? 8 : 3}
                value={values[key] || ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
              />
            </label>
          ))}
          <Button loading={busy} onClick={exportFile}>
            Tải Word đã điền
          </Button>
        </>
      )}
    </Card>
  )
}
