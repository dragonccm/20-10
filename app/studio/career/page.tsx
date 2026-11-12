"use client"
import { CvCoach } from "@/components/studio/cv-coach"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Check, CircleAlert, FileUp, CircleCheck, Copy, ImagePlus, LayoutTemplate, Undo2, WandSparkles, ChevronDown, FileDown, FileText, Mail, MessageSquare, Pause, Play, Plus, RotateCcw, Save, Shuffle, Sparkles, Trash2 } from "lucide-react"
import { AiNotice, AiResult, Button, Card, Input, Label, PageHeader, Select, Tabs, Textarea } from "@/components/studio/ui"
import { TOOLS } from "@/lib/studio/tools"
import { copyText, downloadFile, escapeHtml, formatTime, printHtml, safeFileName, uid, useStored } from "@/lib/studio/storage"
import { callAi } from "@/lib/studio/ai"
import { cn } from "@/lib/utils"
import { fileToDataUrl } from "@/lib/studio/image"
import { ACCEPT, detectLang, fileKind, parseFile, unsupportedReason } from "@/lib/studio/docparse"
import { CV_BACKUP_KEY, parseCv } from "@/lib/studio/handoff"
import { CV_THEMES, CvPreview, EMPTY_CV, SAMPLE_CV, sanitizeTheme, themeOf, type CV, type CvTheme, type Edu, type Exp, type Lang, type Lng, type Proj } from "@/components/studio/cv-preview"

const tool = TOOLS.find((t) => t.slug === "career")!

/* ---------------- CV ---------------- */

const ACCENTS = ["#7c3aed", "#db2777", "#0284c7", "#059669", "#334155"]

export default function CareerPage() {
  const [tab, setTab] = useState<"cv" | "letter" | "interview">("cv")
  return (
    <div>
      <PageHeader icon={tool.icon} tint={tool.tint} title={tool.name} guide={tool.guide} desc="Chuẩn bị hồ sơ xin việc, thực tập: CV ba ngôn ngữ, thư xin việc và luyện trả lời phỏng vấn." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "cv", label: "CV", icon: FileText },
          { id: "letter", label: "Thư xin việc", icon: Mail },
          { id: "interview", label: "Luyện phỏng vấn", icon: MessageSquare },
        ]}
      />
      <div className="mt-4">
        {tab === "cv" && <CvBuilder />}
        {tab === "letter" && <CoverLetter />}
        {tab === "interview" && <Interview />}
      </div>
    </div>
  )
}

function CvBuilder() {
  const [cv, setCv, loaded] = useStored<CV>("bloom.career.cv", EMPTY_CV)
  const previewRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const [backup, setBackup] = useStored<CV | null>(CV_BACKUP_KEY, null)
  const [importing, setImporting] = useState("")
  const set = <K extends keyof CV>(k: K, v: CV[K]) => setCv((c) => ({ ...c, [k]: v }))

  function listOps<T extends { id: string }>(key: "education" | "experience" | "projects" | "languages", blank: Omit<T, "id">) {
    const list = cv[key] as unknown as T[]
    return {
      list,
      add: () => set(key, [...list, { ...blank, id: uid() }] as never),
      update: (id: string, patch: Partial<T>) => set(key, list.map((x) => (x.id === id ? { ...x, ...patch } : x)) as never),
      remove: (id: string) => set(key, list.filter((x) => x.id !== id) as never),
    }
  }
  const edu = listOps<Edu>("education", { school: "", degree: "", from: "", to: "", detail: "" })
  const exp = listOps<Exp>("experience", { org: "", role: "", from: "", to: "", bullets: "" })
  const proj = listOps<Proj>("projects", { name: "", detail: "" })
  const lng = listOps<Lng>("languages", { name: "", level: "" })

  const tips: [boolean, string][] = [
    [!!cv.name && !!cv.email && !!cv.phone, "Có họ tên, email và số điện thoại"],
    [cv.summary.trim().split(/\s+/).length >= 25 && cv.summary.trim().split(/\s+/).length <= 90, "Phần giới thiệu dài 25–90 từ"],
    [cv.education.length > 0, "Có ít nhất một mục học vấn"],
    [cv.experience.length + cv.projects.length > 0, "Có kinh nghiệm hoặc dự án (hoạt động CLB, tình nguyện cũng được)"],
    [cv.experience.every((e) => e.bullets.split("\n").filter((b) => b.trim()).length >= 2), "Mỗi kinh nghiệm có từ 2 gạch đầu dòng"],
    [/\d/.test(cv.experience.map((e) => e.bullets).join(" ")), "Có thể thêm số liệu nếu bạn có bằng chứng (số người, sự kiện…)"],
    [cv.languages.length > 0, "Ghi rõ trình độ ngoại ngữ (TOPIK, IELTS...)"],
  ]

  const exportPdf = () => {
    if (!previewRef.current) return
    printHtml(`CV ${cv.name}`, previewRef.current.innerHTML, "@page{size:A4;margin:0}body{margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}")
  }

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("theme")
    if (value !== null) {
      const theme = CV_THEMES[Number(value)]
      if (theme) setCv((current) => ({ ...current, theme, accent: theme.accent }))
    }
  }, [])

  if (!loaded) return null

  const theme = themeOf(cv)


  const setAccent = (c: string) => setCv((x) => ({ ...x, accent: c, theme: { ...themeOf(x), accent: c } }))
  const pickPhoto = async (f: File) => {
    try {
      const img = await fileToDataUrl(f, 600, 0.85)
      set("photo", img.src)
      if (theme.photo === "none") setCv((x) => ({ ...x, theme: { ...themeOf(x), photo: "circle" } }))
    } catch {
      toast.error("Không đọc được ảnh này.")
    }
  }

  const importCv = async (f: File) => {
    const kind = fileKind(f.name, f.type)
    if (!kind || kind === "pptx") return toast.error(kind ? "Hãy chọn CV dạng PDF, Word hoặc ảnh chụp." : unsupportedReason(f.name))
    setImporting("Đang đọc tệp...")
    try {
      let text: string
      if (kind === "image") {
        setImporting("AI đang đọc chữ trong ảnh...")
        const img = await fileToDataUrl(f, 2000, 0.9)
        text = (await callAi("ocr", { image: img.src })).text
      } else text = (await parseFile(f, f.name)).text
      if (!text.trim()) throw new Error("Không thấy chữ trong tệp (có thể là bản scan). Hãy thử tải ảnh chụp CV.")
      setImporting("AI đang tách các mục trong CV...")
      const parsed = await parseCv(text)
      if (!parsed.lang) parsed.lang = detectLang(text)
      if (cv.name || cv.summary || cv.education.length || cv.experience.length) setBackup(cv)
      setCv((x) => ({ ...parsed, theme: x.theme, accent: x.accent, photo: x.photo }))
      toast.success("Đã điền CV từ tệp. Hãy kiểm tra lại từng mục nhé.")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setImporting("")
    }
  }

  return (
    <div className="space-y-5">
    <Card className="flex flex-wrap items-center gap-3 p-4">
      <FileUp className="h-5 w-5 shrink-0 text-emerald-600" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800">Đã có CV sẵn?</p>
        <p className="text-xs text-slate-500">{importing || "Tải lên PDF, Word hoặc ảnh chụp CV, AI sẽ điền vào từng mục để bạn đổi sang mẫu đẹp hơn."}</p>
      </div>
      <input
        ref={importRef}
        type="file"
        accept={ACCEPT.replace(",.pptx", "")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) importCv(f)
          e.target.value = ""
        }}
      />
      {backup && !importing && (
        <Button
          variant="ghost"
          icon={Undo2}
          onClick={() => {
            setCv(backup)
            setBackup(null)
            toast.success("Đã khôi phục CV trước khi nhập.")
          }}
        >
          Khôi phục CV cũ
        </Button>
      )}
      <Button variant="outline" icon={FileUp} loading={!!importing} onClick={() => importRef.current?.click()}>
        Nhập CV có sẵn
      </Button>
    </Card>
    <ThemePicker cv={cv} setCv={setCv} />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-3">
            {cv.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cv.photo} alt="Ảnh thẻ" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-xl bg-slate-100 text-slate-400">
                <ImagePlus className="h-6 w-6" />
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) pickPhoto(f)
                  e.target.value = ""
                }}
              />
              <Button size="sm" variant="outline" icon={ImagePlus} onClick={() => photoRef.current?.click()}>
                {cv.photo ? "Đổi ảnh thẻ" : "Thêm ảnh thẻ"}
              </Button>
              {cv.photo && (
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => set("photo", undefined)}>
                  Bỏ ảnh
                </Button>
              )}
              <p className="w-full text-xs text-slate-500">Không bắt buộc. CV Hàn Quốc thường có ảnh 3×4.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <Label>Ngôn ngữ CV</Label>
              <Select value={cv.lang} onChange={(e) => set("lang", e.target.value as Lang)}>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
                <option value="ko">한국어</option>
              </Select>
            </label>
            <div>
              <Label>Màu nhấn</Label>
              <div className="flex h-10 items-center gap-2">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Màu ${c}`}
                    onClick={() => setAccent(c)}
                    className={cn("h-7 w-7 rounded-full ring-offset-2 transition", theme.accent === c && "ring-2 ring-slate-400")}
                    style={{ background: c }}
                  />
                ))}
                <input type="color" value={theme.accent} onChange={(e) => setAccent(e.target.value)} className="h-7 w-9 cursor-pointer rounded" aria-label="Màu khác" />
              </div>
            </div>
            {(
              [
                ["name", "Họ và tên"],
                ["title", "Vị trí mong muốn"],
                ["email", "Email"],
                ["phone", "Số điện thoại"],
                ["location", "Địa chỉ / Thành phố"],
                ["link", "LinkedIn / Portfolio"],
              ] as [keyof CV, string][]
            ).map(([k, l]) => (
              <label key={k}>
                <Label>{l}</Label>
                <Input value={cv[k] as string} onChange={(e) => set(k, e.target.value as never)} />
              </label>
            ))}
            <label className="sm:col-span-2">
              <Label>Giới thiệu bản thân</Label>
              <Textarea rows={4} value={cv.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Sinh viên năm 3 ngành Ngôn ngữ Hàn, TOPIK 5, có kinh nghiệm phiên dịch tại..." />
            </label>
          </div>
        </Card>

        <Section title="Học vấn" onAdd={edu.add}>
          {edu.list.map((x) => (
            <Row key={x.id} onRemove={() => edu.remove(x.id)}>
              <Input placeholder="Trường" value={x.school} onChange={(e) => edu.update(x.id, { school: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="Ngành / Bằng cấp" value={x.degree} onChange={(e) => edu.update(x.id, { degree: e.target.value })} className="sm:col-span-2" />
              <Input placeholder="Từ (2022)" value={x.from} onChange={(e) => edu.update(x.id, { from: e.target.value })} />
              <Input placeholder="Đến (2026, để trống nếu đang học)" value={x.to} onChange={(e) => edu.update(x.id, { to: e.target.value })} />
              <Input placeholder="GPA, học bổng, thành tích..." value={x.detail} onChange={(e) => edu.update(x.id, { detail: e.target.value })} className="sm:col-span-2" />
            </Row>
          ))}
        </Section>

        <Section title="Kinh nghiệm" onAdd={exp.add}>
          {exp.list.map((x) => (
            <Row key={x.id} onRemove={() => exp.remove(x.id)}>
              <Input placeholder="Tổ chức / Công ty" value={x.org} onChange={(e) => exp.update(x.id, { org: e.target.value })} />
              <Input placeholder="Vai trò" value={x.role} onChange={(e) => exp.update(x.id, { role: e.target.value })} />
              <Input placeholder="Từ" value={x.from} onChange={(e) => exp.update(x.id, { from: e.target.value })} />
              <Input placeholder="Đến" value={x.to} onChange={(e) => exp.update(x.id, { to: e.target.value })} />
              <Textarea
                rows={3}
                placeholder={"Mỗi dòng một ý, bắt đầu bằng động từ:\nPhiên dịch Hàn–Việt cho 5 buổi họp đối tác\nHỗ trợ tổ chức hội thảo 200 người"}
                value={x.bullets}
                onChange={(e) => exp.update(x.id, { bullets: e.target.value })}
                className="sm:col-span-2"
              />
            </Row>
          ))}
        </Section>

        <Section title="Dự án / Hoạt động" onAdd={proj.add}>
          {proj.list.map((x) => (
            <Row key={x.id} onRemove={() => proj.remove(x.id)}>
              <Input placeholder="Tên dự án / hoạt động" value={x.name} onChange={(e) => proj.update(x.id, { name: e.target.value })} className="sm:col-span-2" />
              <Textarea rows={2} placeholder="Mô tả ngắn và kết quả" value={x.detail} onChange={(e) => proj.update(x.id, { detail: e.target.value })} className="sm:col-span-2" />
            </Row>
          ))}
        </Section>

        <Section title="Ngoại ngữ" onAdd={lng.add}>
          {lng.list.map((x) => (
            <Row key={x.id} onRemove={() => lng.remove(x.id)}>
              <Input placeholder="Tiếng Hàn" value={x.name} onChange={(e) => lng.update(x.id, { name: e.target.value })} />
              <Input placeholder="TOPIK 5" value={x.level} onChange={(e) => lng.update(x.id, { level: e.target.value })} />
            </Row>
          ))}
        </Section>

        <Card className="grid gap-3 p-4">
          <label>
            <Label>Kỹ năng (cách nhau bằng dấu phẩy)</Label>
            <Input value={cv.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Biên phiên dịch, MS Office, Canva, Thuyết trình" />
          </label>
          <label>
            <Label>Chứng chỉ (mỗi dòng một chứng chỉ)</Label>
            <Textarea rows={2} value={cv.certificates} onChange={(e) => set("certificates", e.target.value)} />
          </label>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-0 xl:self-start">
        <div className="flex flex-wrap gap-2">
          <Button icon={FileDown} onClick={exportPdf}>
            Tải PDF
          </Button>
          <Button variant="outline" icon={Save} onClick={() => downloadFile(`${safeFileName(cv.name || "cv")}.json`, JSON.stringify(cv, null, 2), "application/json")}>
            Sao lưu dữ liệu
          </Button>
          <Button variant="ghost" icon={RotateCcw} onClick={() => confirm("Xóa toàn bộ nội dung CV?") && setCv({ ...EMPTY_CV, theme: cv.theme })}>
            Làm mới
          </Button>
          {!cv.name.trim() && (
            <Button variant="soft" icon={Sparkles} onClick={() => setCv((x) => ({ ...SAMPLE_CV, photo: undefined, lang: x.lang, theme: x.theme, accent: x.accent }))}>
              Điền dữ liệu mẫu
            </Button>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200">
          <div className="max-h-[75vh] overflow-auto bg-slate-200/60 p-3">
            <div className="origin-top-left" style={{ width: 794 * 0.62, height: 1123 * 0.62 }}>
              <div style={{ transform: "scale(0.62)", transformOrigin: "top left", width: 794 }}>
                <div ref={previewRef}>
                  <CvPreview cv={cv} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <CvCoach cv={cv} setCv={setCv}/>
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-700">Gợi ý hoàn thiện</h3>
          <ul className="space-y-1.5">
            {tips.map(([ok, t]) => (
              <li key={t} className="flex items-start gap-2 text-sm text-slate-600">
                {ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                {t}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
    </div>
  )
}

function ThemeThumb({ cv, theme, active, onClick }: { cv: CV; theme: CvTheme; active: boolean; onClick: () => void }) {
  const s = 0.175
  return (
    <button type="button" onClick={onClick} className="group min-w-0 text-left">
      <div
        className={cn("relative mx-auto overflow-hidden rounded-lg bg-white shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md", active ? "ring-2 ring-violet-500 ring-offset-2" : "ring-1 ring-slate-200")}
        style={{ width: 794 * s, height: 1123 * s }}
      >
        <div aria-hidden style={{ transform: `scale(${s})`, transformOrigin: "top left", width: 794, pointerEvents: "none" }}>
          <CvPreview cv={cv} theme={theme} />
        </div>
        {active && (
          <span className="absolute top-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-violet-600 text-white">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className={cn("mt-1.5 truncate text-center text-xs", active ? "font-medium text-violet-700" : "text-slate-600")}>{theme.name}</div>
    </button>
  )
}

const SAMPLE_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="156" viewBox="0 0 120 156"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbcfe8"/><stop offset="1" stop-color="#c4b5fd"/></linearGradient></defs><rect width="120" height="156" fill="url(#g)"/><circle cx="60" cy="58" r="26" fill="#fff" opacity=".85"/><path d="M14 156c4-34 24-50 46-50s42 16 46 50z" fill="#fff" opacity=".85"/></svg>',
  )

function ThemePicker({ cv, setCv }: { cv: CV; setCv: (fn: (c: CV) => CV) => void }) {
  const [custom, setCustom] = useStored<CvTheme[]>("bloom.career.customThemes", [])
  const [open, setOpen] = useState(true)
  const [prompt, setPrompt] = useState("")
  const [busy, setBusy] = useState<"" | "new" | "edit">("")
  const [prev, setPrev] = useState<CvTheme | null>(null)
  const current = themeOf(cv)
  const data: CV = cv.name.trim() ? { ...cv, photo: cv.photo ?? SAMPLE_PHOTO } : { ...SAMPLE_CV, lang: cv.lang, photo: SAMPLE_PHOTO }
  const same = (a: CvTheme, b: CvTheme) => JSON.stringify({ ...a, accent: "" }) === JSON.stringify({ ...b, accent: "" })

  const apply = (t: CvTheme) => {
    setPrev(current)
    setCv((c) => ({ ...c, theme: t, accent: t.accent }))
  }

  const generate = async (mode: "new" | "edit") => {
    if (!prompt.trim()) return toast.info("Hãy mô tả mẫu bạn muốn, ví dụ: tông hồng pastel, có ảnh tròn, kiểu Hàn Quốc.")
    setBusy(mode)
    try {
      const text = mode === "edit" ? `Chỉnh mẫu hiện tại theo yêu cầu: ${prompt.trim()}\nMẫu hiện tại (JSON): ${JSON.stringify(current)}` : `Tạo mẫu CV mới theo mô tả: ${prompt.trim()}`
      const res = await callAi<unknown>("cv-theme", { text })
      const t = sanitizeTheme(res, current)
      if (!t) throw new Error("AI chưa tạo được mẫu hợp lệ, thử mô tả khác nhé.")
      apply(t)
      setCustom((cs) => [t, ...cs.filter((x) => x.name !== t.name)].slice(0, 8))
      toast.success(`Đã áp dụng mẫu "${t.name}". Mẫu được lưu trong "Mẫu của bạn".`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy("")
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-medium text-slate-800">
          <LayoutTemplate className="h-4 w-4 text-violet-600" />
          Mẫu CV
          <span className="text-sm font-normal text-slate-500">· đang dùng: {current.name}</span>
        </h3>
        <div className="flex gap-2">
          {prev && (
            <Button size="sm" variant="ghost" icon={Undo2} onClick={() => (setCv((c) => ({ ...c, theme: prev, accent: prev.accent })), setPrev(null))}>
              Mẫu trước
            </Button>
          )}
          <Button size="sm" variant="ghost" icon={ChevronDown} onClick={() => setOpen((v) => !v)} className={cn(!open && "[&>svg]:-rotate-90")}>
            {open ? "Thu gọn" : "Xem mẫu"}
          </Button>
        </div>
      </div>
      {open && (
        <>
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 p-3 ring-1 ring-violet-100">
            <AiNotice />
            <div className="flex flex-col gap-2 lg:flex-row">
              <Textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 bg-white"
                placeholder="Mô tả mẫu CV bạn muốn: ví dụ tông hồng pastel nhẹ nhàng, có ảnh tròn, tiêu đề chữ có chân, bố cục cột bên trái..."
              />
              <div className="flex gap-2 lg:flex-col">
                <Button icon={WandSparkles} loading={busy === "new"} onClick={() => generate("new")} className="flex-1 px-3 whitespace-nowrap">
                  Tạo mẫu mới
                </Button>
                <Button variant="outline" icon={Sparkles} loading={busy === "edit"} onClick={() => generate("edit")} className="flex-1 px-3 whitespace-nowrap">
                  Chỉnh mẫu này
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Pastel hồng tím, nữ tính mà chuyên nghiệp", "Tối giản đen trắng, sang trọng", "Kiểu Hàn Quốc, có bảng và ảnh 3x4", "Xanh navy, cột bên, hợp ngân hàng"].map((x) => (
                <button key={x} type="button" onClick={() => setPrompt(x)} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200 hover:text-violet-700 hover:ring-violet-300">
                  {x}
                </button>
              ))}
            </div>
          </div>
          {custom.length > 0 && (
            <>
              <div className="mt-4 mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Mẫu của bạn</span>
                <button type="button" className="text-xs text-slate-400 hover:text-rose-600" onClick={() => confirm("Xóa các mẫu AI đã lưu?") && setCustom([])}>
                  Xóa hết
                </button>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 sm:gap-3">
                {custom.map((t, i) => (
                  <ThemeThumb key={t.name + i} cv={data} theme={t} active={same(t, current)} onClick={() => apply(t)} />
                ))}
              </div>
            </>
          )}
          <div className="mt-4 mb-2 text-sm font-medium text-slate-700">{CV_THEMES.length} mẫu có sẵn</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 sm:gap-3">
            {CV_THEMES.map((t) => (
              <ThemeThumb key={t.name} cv={data} theme={t} active={same(t, current)} onClick={() => apply(t)} />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">{cv.name.trim() ? "Ảnh xem trước dùng nội dung CV của bạn." : "Ảnh xem trước dùng dữ liệu mẫu. Nội dung của bạn sẽ thay vào khi bạn điền."}</p>
        </>
      )}
    </Card>
  )
}

function Section({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-slate-800">{title}</h3>
        <Button size="sm" variant="soft" icon={Plus} onClick={onAdd}>
          Thêm
        </Button>
      </div>
      <div className="space-y-3">{children}</div>
    </Card>
  )
}

function Row({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="relative rounded-xl bg-slate-50 p-3 pr-12">
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
      <Button size="icon" variant="danger" icon={Trash2} aria-label="Xóa mục" onClick={onRemove} className="absolute top-2 right-2" />
    </div>
  )
}

/* ---------------- Cover letter ---------------- */

type LetterForm = { lang: "vi" | "en"; name: string; company: string; position: string; recipient: string; source: string; why: string; highlights: string }

function buildLetter(f: LetterForm) {
  const hl = f.highlights
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
  if (f.lang === "en") {
    return [
      `Dear ${f.recipient || "Hiring Manager"},`,
      "",
      `I am writing to apply for the ${f.position || "[position]"} position at ${f.company || "[company]"}${f.source ? `, which I learned about through ${f.source}` : ""}.`,
      "",
      hl.length ? `Throughout my studies and activities, I have developed skills that match this role:\n${hl.map((h) => `- ${h}`).join("\n")}` : "[Describe 2–3 experiences relevant to the role.]",
      "",
      f.why ? `I am particularly drawn to ${f.company || "your company"} because ${f.why}.` : `[Explain why you want to work at ${f.company || "this company"}.]`,
      "",
      "Thank you for considering my application. I would welcome the opportunity to discuss how I can contribute to your team.",
      "",
      "Sincerely,",
      f.name || "[Your name]",
    ].join("\n")
  }
  return [
    `Kính gửi ${f.recipient || "Phòng Nhân sự"}${f.company ? ` ${f.company}` : ""},`,
    "",
    `Tôi là ${f.name || "[Họ tên]"}, xin ứng tuyển vị trí ${f.position || "[vị trí]"}${f.source ? ` được đăng trên ${f.source}` : ""}.`,
    "",
    hl.length ? `Trong quá trình học tập và hoạt động, tôi đã tích lũy được những kinh nghiệm phù hợp với vị trí này:\n${hl.map((h) => `- ${h}`).join("\n")}` : "[Nêu 2–3 kinh nghiệm liên quan đến vị trí.]",
    "",
    f.why ? `Tôi mong muốn được làm việc tại ${f.company || "Quý công ty"} vì ${f.why}.` : `[Lý do bạn muốn làm việc tại ${f.company || "công ty"}.]`,
    "",
    "Tôi rất mong có cơ hội được trao đổi thêm với Quý công ty. Xin chân thành cảm ơn Anh/Chị đã dành thời gian xem xét hồ sơ.",
    "",
    "Trân trọng,",
    f.name || "[Họ tên]",
  ].join("\n")
}

function CoverLetter() {
  const [f, setF] = useStored<LetterForm>("bloom.career.letterForm", { lang: "vi", name: "", company: "", position: "", recipient: "", source: "", why: "", highlights: "" })
  const [text, setText] = useStored("bloom.career.letter", "")
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState("")
  const up = (k: keyof LetterForm, v: string) => setF((x) => ({ ...x, [k]: v }))

  const polish = async () => {
    if (!text.trim()) return toast.info("Hãy tạo bản nháp trước.")
    setBusy(true)
    try {
      setAi((await callAi("cover-letter", { text })).text)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <label>
          <Label>Ngôn ngữ</Label>
          <Select value={f.lang} onChange={(e) => up("lang", e.target.value)}>
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </Select>
        </label>
        {(
          [
            ["name", "Họ tên của bạn"],
            ["company", "Công ty"],
            ["position", "Vị trí ứng tuyển"],
            ["recipient", "Người nhận (nếu biết)"],
            ["source", "Biết tin tuyển dụng qua đâu"],
          ] as [keyof LetterForm, string][]
        ).map(([k, l]) => (
          <label key={k}>
            <Label>{l}</Label>
            <Input value={f[k]} onChange={(e) => up(k, e.target.value)} />
          </label>
        ))}
        <label className="sm:col-span-2">
          <Label>Điểm nổi bật của bạn (mỗi dòng một ý)</Label>
          <Textarea rows={3} value={f.highlights} onChange={(e) => up("highlights", e.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <Label>Vì sao bạn muốn làm ở đây</Label>
          <Textarea rows={2} value={f.why} onChange={(e) => up("why", e.target.value)} />
        </label>
        <Button
          className="sm:col-span-2"
          icon={FileText}
          onClick={() => {
            if (text.trim() && !confirm("Thay bản nháp hiện tại bằng bản mới?")) return
            setText(buildLetter(f))
          }}
        >
          Tạo bản nháp
        </Button>
      </Card>
      <Card className="p-4">
        <AiNotice />
        <Textarea rows={16} value={text} onChange={(e) => setText(e.target.value)} placeholder="Bản nháp thư sẽ hiện ở đây, bạn có thể sửa trực tiếp." />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" icon={Copy} onClick={async () => (await copyText(text)) && toast.success("Đã sao chép.")}>
            Sao chép
          </Button>
          <Button
            variant="outline"
            icon={FileDown}
            onClick={() => printHtml("Thư xin việc", `<div style="white-space:pre-wrap">${escapeHtml(text)}</div>`, "body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6;max-width:680px;margin:48px auto;padding:0 24px}")}
          >
            PDF
          </Button>
          <Button icon={Sparkles} loading={busy} onClick={polish}>
            AI góp ý
          </Button>
        </div>
        {ai && <AiResult text={ai} />}
      </Card>
    </div>
  )
}

/* ---------------- Interview ---------------- */

const QUESTIONS: Record<Lang, string[]> = {
  vi: [
    "Hãy giới thiệu ngắn gọn về bản thân.",
    "Vì sao bạn chọn học ngành ngôn ngữ?",
    "Điểm mạnh và điểm yếu lớn nhất của bạn là gì?",
    "Kể về một lần bạn gặp khó khăn khi làm việc nhóm và cách bạn giải quyết.",
    "Vì sao bạn muốn ứng tuyển vào vị trí này?",
    "Bạn thấy mình ở đâu sau 5 năm nữa?",
    "Bạn xử lý thế nào khi có nhiều việc cùng hạn chót?",
  ],
  en: [
    "Tell me about yourself.",
    "Why do you want to work for our company?",
    "What are your greatest strengths and weaknesses?",
    "Describe a challenge you faced and how you overcame it.",
    "Tell me about a time you worked in a team with a conflict.",
    "Where do you see yourself in five years?",
    "Why should we hire you?",
  ],
  ko: [
    "자기소개를 해 주세요.",
    "우리 회사에 지원한 이유가 무엇입니까?",
    "본인의 장점과 단점은 무엇입니까?",
    "어려움을 극복한 경험에 대해 말해 주세요.",
    "한국어를 어떻게 공부했습니까?",
    "5년 후 자신의 모습은 어떨 것 같습니까?",
    "팀에서 갈등이 생겼을 때 어떻게 해결했습니까?",
  ],
}

type Answer = { id: string; question: string; answer: string; at: number; seconds: number }

function Interview() {
  const [lang, setLang] = useState<Lang>("vi")
  const [qi, setQi] = useState(0)
  const [answer, setAnswer] = useState("")
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [star, setStar] = useState([false, false, false, false])
  const [history, setHistory] = useStored<Answer[]>("bloom.career.answers", [])
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState("")
  const question = QUESTIONS[lang][qi % QUESTIONS[lang].length]

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  const reset = (nextQi: number) => {
    setQi(nextQi)
    setAnswer("")
    setSeconds(0)
    setRunning(false)
    setStar([false, false, false, false])
    setAi("")
  }

  const feedback = async () => {
    if (!answer.trim()) return toast.info("Hãy viết câu trả lời trước.")
    setBusy(true)
    try {
      setAi((await callAi("interview", { text: answer, question })).text)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const mm = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Select value={lang} onChange={(e) => (setLang(e.target.value as Lang), reset(0))} className="w-40">
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </Select>
          <Button variant="ghost" icon={Shuffle} onClick={() => reset(Math.floor(Math.random() * QUESTIONS[lang].length))}>
            Câu khác
          </Button>
        </div>
        <p className="mt-5 font-serif text-2xl leading-snug text-slate-800">{question}</p>
        <div className="mt-5 flex items-center gap-3">
          <span className={cn("font-mono text-2xl tabular-nums", seconds > 120 ? "text-rose-600" : "text-slate-700")}>{mm}</span>
          <Button size="sm" variant="soft" icon={running ? Pause : Play} onClick={() => setRunning((r) => !r)}>
            {running ? "Tạm dừng" : "Bấm giờ"}
          </Button>
          <span className="text-xs text-slate-500">Nên trả lời trong 1–2 phút</span>
        </div>
        <Textarea rows={8} className="mt-4" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Viết hoặc ghi chú ý chính câu trả lời của bạn..." />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["Bối cảnh (S)", "Nhiệm vụ (T)", "Hành động (A)", "Kết quả (R)"].map((l, i) => (
            <label key={l} className={cn("flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm", star[i] ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600")}>
              <input type="checkbox" checked={star[i]} onChange={(e) => setStar((s) => s.map((x, k) => (k === i ? e.target.checked : x)))} className="accent-emerald-600" />
              {l}
            </label>
          ))}
        </div>
        <div className="mt-4">
          <AiNotice />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            icon={Save}
            onClick={() => {
              if (!answer.trim()) return
              setHistory((h) => [{ id: uid(), question, answer, at: Date.now(), seconds }, ...h].slice(0, 50))
              toast.success("Đã lưu câu trả lời.")
            }}
          >
            Lưu câu trả lời
          </Button>
          <Button icon={Sparkles} loading={busy} onClick={feedback}>
            AI nhận xét
          </Button>
        </div>
        {ai && <AiResult text={ai} />}
      </Card>
      <Card className="h-fit p-4">
        <h3 className="mb-3 font-medium text-slate-800">Câu trả lời đã lưu</h3>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có câu nào.</p>
        ) : (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl bg-slate-50 p-3">
                <div className="text-sm font-medium text-slate-700">{h.question}</div>
                <div className="mt-1 line-clamp-3 text-xs text-slate-500">{h.answer}</div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatTime(h.at)}</span>
                  <button type="button" onClick={() => setHistory((x) => x.filter((y) => y.id !== h.id))} className="text-rose-500 hover:underline">
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
