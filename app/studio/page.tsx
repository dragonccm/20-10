"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { BookOpenCheck, ChevronRight, FileUp, GraduationCap, Languages, Palette, PenLine, ShieldCheck, Briefcase, Clock, type LucideIcon } from "lucide-react"
import { TOOLS } from "@/lib/studio/tools"
import { readLS } from "@/lib/studio/storage"
import { idbGet } from "@/lib/studio/idb"

type Task = { href: string; icon: LucideIcon; title: string; desc: string; tint: string }

const TASKS: Task[] = [
  { href: "/studio/writing", icon: PenLine, title: "Viết hoặc sửa bài luận", desc: "AI chỉ ra từng lỗi kèm giải thích", tint: "bg-rose-100 text-rose-600" },
  { href: "/studio/writing?panel=cite", icon: GraduationCap, title: "Tìm nguồn trích dẫn cho bài", desc: "Chọn đoạn văn, AI tìm bài báo thật", tint: "bg-sky-100 text-sky-600" },
  { href: "/studio/documents", icon: FileUp, title: "Tải tài liệu lên cho AI đọc", desc: "Essay, slide, CV, PDF, ảnh chụp", tint: "bg-indigo-100 text-indigo-600" },
  { href: "/studio/korean", icon: Languages, title: "Ôn từ vựng tiếng Hàn", desc: "Thẻ lật, nghe phát âm, sửa câu", tint: "bg-violet-100 text-violet-600" },
  { href: "/studio/career", icon: Briefcase, title: "Làm CV, luyện phỏng vấn", desc: "Nhiều mẫu đẹp, xuất PDF", tint: "bg-emerald-100 text-emerald-600" },
  { href: "/studio/creative", icon: Palette, title: "Làm poster, slide, thiệp", desc: "Từ mẫu có sẵn hoặc nhờ AI", tint: "bg-pink-100 text-pink-600" },
]

type Resume = { href: string; icon: LucideIcon; label: string; detail: string }

export default function StudioPage() {
  const [resume, setResume] = useState<Resume[]>([])

  useEffect(() => {
    const out: Resume[] = []
    const docs = readLS<{ id: string; title: string; updatedAt: number }[]>("bloom.writing.docs", [])
    const last = [...docs].sort((a, b) => b.updatedAt - a.updatedAt)[0]
    if (last) out.push({ href: "/studio/writing", icon: PenLine, label: "Viết tiếp", detail: last.title || "Bài chưa đặt tên" })
    const cards = readLS<{ due: number }[]>("bloom.korean.cards", [])
    const due = cards.filter((c) => c.due <= Date.now()).length
    if (due) out.push({ href: "/studio/korean", icon: BookOpenCheck, label: "Ôn tiếng Hàn", detail: `${due} thẻ đến hạn hôm nay` })
    setResume(out)
    idbGet<{ name: string }[]>("bloom.docs.index").then((d) => {
      if (d?.[0]) setResume((r) => [...r.filter((x) => x.href !== "/studio/documents"), { href: "/studio/documents", icon: Clock, label: "Tài liệu mới nhất", detail: d[0].name }])
    })
  }, [])

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.25em] text-violet-400 uppercase">A little something for your journey</p>
        <h1 className="mt-3 font-serif text-3xl leading-snug text-slate-800 sm:text-4xl">Chúc bạn luôn có những ngày thật dịu dàng.</h1>
        <p className="mt-3 leading-relaxed text-slate-600">Có những bài tập khó và những ngày bận rộn. Mong góc nhỏ này giúp mọi thứ dễ dàng hơn một chút.</p>
      </header>

      {resume.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Tiếp tục</h2>
          <div className="flex flex-wrap gap-2">
            {resume.map((r) => (
              <Link key={r.href} href={r.href} className="group flex max-w-full items-center gap-3 rounded-2xl bg-white/90 py-2.5 pr-4 pl-3 shadow-sm ring-1 ring-white transition hover:ring-violet-200">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
                  <r.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-slate-500">{r.label}</span>
                  <span className="block max-w-[16rem] truncate text-sm font-medium text-slate-800">{r.detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Hôm nay bạn muốn làm gì?</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {TASKS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group flex items-center gap-4 rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-white transition hover:-translate-y-0.5 hover:shadow-md hover:ring-violet-100"
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${t.tint}`}>
                <t.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800">{t.title}</span>
                <span className="block text-sm text-slate-500">{t.desc}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
            </Link>
          ))}
        </div>
      </section>

      <details className="mt-10 rounded-2xl bg-white/50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-600">Xem tất cả công cụ</summary>
      <section className="mt-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Tất cả công cụ</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TOOLS.map((t) => (
            <Link key={t.slug} href={`/studio/${t.slug}`} className="group rounded-2xl bg-white/70 p-4 ring-1 ring-white transition hover:bg-white hover:ring-violet-100">
              <span className="flex items-center gap-2.5">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${t.tint}`}>
                  <t.icon className="h-4 w-4" />
                </span>
                <span className="font-medium text-slate-800">{t.name}</span>
              </span>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>
      </details>

      <div className="mt-10 flex items-start gap-3 rounded-2xl bg-white/60 p-4 text-sm leading-relaxed text-slate-600 ring-1 ring-white">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <p>
          Bài viết, CV, tài liệu và thẻ học chỉ được lưu trong trình duyệt trên máy này. Nội dung chỉ được gửi tới trợ lý AI khi bạn bấm vào một nút AI, và không dùng để huấn luyện.
        </p>
      </div>

      <footer className="mt-12 pb-4 text-center text-xs text-slate-400">Bloom Workspace · A little space to learn, create and grow.</footer>
    </div>
  )
}
