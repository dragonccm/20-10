import { ChevronRight, Flower2, Heart, Sprout } from "lucide-react"

const choices = [
  {
    href: "/tiny.html",
    icon: Heart,
    iconTint: "bg-white/70 text-rose-500",
    title: "Lời nhắn nhủ",
    desc: "Một câu chuyện nhỏ cùng Tiny, gửi đến bạn nhân ngày 20/10.",
    accent: "from-pink-200/80 to-rose-100/80",
    ring: "hover:ring-pink-300",
  },
  {
    href: "/studio",
    icon: Sprout,
    iconTint: "bg-white/70 text-violet-600",
    title: "Góc Studio",
    desc: "Bloom Workspace — một góc nhỏ để học, sáng tạo và lớn lên mỗi ngày.",
    accent: "from-violet-200/80 to-sky-100/80",
    ring: "hover:ring-violet-300",
  },
]

export default function Home() {
  return (
    <main className="fixed inset-0 overflow-y-auto bg-gradient-to-br from-rose-50 via-violet-50 to-sky-50 text-slate-700">
      <div
        className="bloom-fade-in mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-4 py-12"
      >
        <p className="mb-3 inline-flex items-center gap-2 text-sm tracking-[0.25em] text-rose-400 uppercase">
          <Flower2 className="h-4 w-4" />
          Chào Ngân
        </p>
        <h1 className="text-center font-serif text-3xl leading-snug text-slate-800 sm:text-4xl">
          Hôm nay bạn muốn ghé đâu trước?
        </h1>
        <p className="mt-3 max-w-md text-center text-slate-500">
          Một lời nhắn dành cho bạn, cùng góc học tập để viết báo cáo, học tiếng Hàn và sáng tạo thiết kế.
        </p>

        <div className="mt-10 grid w-full gap-5 sm:grid-cols-2">
          {choices.map((c) => (
            <a
              key={c.href}
              href={c.href}
              className={`group rounded-3xl bg-gradient-to-br ${c.accent} p-6 shadow-sm ring-1 ring-white/70 backdrop-blur transition hover:-translate-y-1 hover:shadow-lg hover:ring-2 ${c.ring} focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400`}
            >
              <span className={`grid h-12 w-12 place-items-center rounded-2xl transition-transform group-hover:scale-105 ${c.iconTint}`}>
                <c.icon className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-xl font-semibold text-slate-800">{c.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.desc}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                Vào xem
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </a>
          ))}
        </div>

        <p className="mt-12 text-xs text-slate-400">Được tạo nên bằng sự quan tâm và những dòng code.</p>
      </div>
    </main>
  )
}
