"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, LayoutGrid } from "lucide-react"
import { BloomMark, BloomWordmark } from "./brand"
import { cn } from "@/lib/utils"
import { TOOLS } from "@/lib/studio/tools"

const items = [{ slug: "", short: "Trang chủ", name: "Trang chủ", icon: LayoutGrid }, ...TOOLS]

export function StudioNav() {
  const path = usePathname()
  const isActive = (slug: string) => (slug ? path.startsWith(`/studio/${slug}`) : path === "/studio")

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[76px] shrink-0 flex-col border-r border-white/70 bg-white/50 px-3 py-5 backdrop-blur lg:flex xl:w-60">
        <Link href="/studio" aria-label="Bloom · Một góc nhỏ của bạn" className="mb-6 flex items-center justify-center gap-2 px-1 xl:justify-start xl:px-2">
          <BloomMark size={36} />
          <span className="hidden leading-tight xl:block">
            <BloomWordmark />
            <span className="block text-xs text-slate-500">Một góc nhỏ của bạn</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((t) => (
            <Link
              key={t.slug}
              href={t.slug ? `/studio/${t.slug}` : "/studio"}
              title={t.name}
              aria-label={t.name}
              className={cn(
                "flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition xl:justify-start",
                isActive(t.slug) ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-100" : "text-slate-600 hover:bg-white/70",
              )}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              <span className="hidden truncate xl:inline">{t.name}</span>
            </Link>
          ))}
        </nav>
        <a href="/" title="Trang chọn" aria-label="Trang chọn" className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-white/70 hover:text-slate-800 xl:justify-start">
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span className="hidden xl:inline">Trang chọn</span>
        </a>
      </aside>

      {/* Mobile top bar */}
      <div className="shrink-0 border-b border-white/70 bg-white/80 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 px-4 pt-3">
          <a href="/" aria-label="Về trang chọn" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
            <ChevronLeft className="h-5 w-5" />
          </a>
          <BloomMark size={28} />
          <BloomWordmark />
          <span className="text-sm text-slate-500">Workspace</span>
        </div>
        <nav aria-label="Công cụ Studio" className="flex gap-1 overflow-x-auto px-4 py-2 sm:flex-wrap">
          {items.map((t) => (
            <Link
              key={t.slug}
              href={t.slug ? `/studio/${t.slug}` : "/studio"}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                isActive(t.slug) ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600",
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.short}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
