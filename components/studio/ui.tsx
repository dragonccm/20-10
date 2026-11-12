"use client"

import type { LucideIcon } from "lucide-react"
import { CircleHelp, Info, LoaderCircle, X } from "lucide-react"
import type React from "react"
import { cn } from "@/lib/utils"
import { useAiStatus } from "@/lib/studio/ai"
import { useStored } from "@/lib/studio/storage"

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "outline" | "ghost" | "danger"
  size?: "sm" | "md" | "icon"
  icon?: LucideIcon
  loading?: boolean
}

export function Button({ variant = "primary", size = "md", icon: Icon, loading, className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl font-medium leading-snug transition focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        {
          primary: "bg-violet-600 text-white shadow-sm hover:bg-violet-700",
          soft: "bg-violet-100 text-violet-700 hover:bg-violet-200",
          outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          ghost: "text-slate-600 hover:bg-slate-100",
          danger: "text-rose-600 hover:bg-rose-50",
        }[variant],
        { sm: "h-8 gap-1.5 px-3 text-xs", md: "h-10 gap-2 px-4 text-sm", icon: "h-9 w-9" }[size],
        className,
      )}
      {...p}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}

export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-white/85 shadow-sm ring-1 ring-slate-200/70", className)} {...p} />
}

const field =
  "w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none"

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-10", className)} {...p} />
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "py-2.5 leading-relaxed", className)} {...p} />
}

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(field, "h-10 pr-8", className)} {...p}>
      {children}
    </select>
  )
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("mb-1.5 block text-xs font-medium text-slate-500", className)}>{children}</span>
}

export type GuideSpec = { id: string; steps: string[]; tip?: string }

export function PageHeader({
  icon: Icon,
  title,
  desc,
  tint,
  actions,
  guide,
}: {
  icon: LucideIcon
  title: string
  desc: string
  tint: string
  actions?: React.ReactNode
  /** Optional instructions, opened on request. */
  guide?: GuideSpec
}) {
  const [open, setOpen, loaded] = useStored(`bloom.guide.${guide?.id ?? "none"}`, false)
  const showGuide = !!guide && loaded && open
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 basis-52 items-start gap-3">
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", tint)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-800 sm:text-2xl">{title}</h1>
            <p className="studio-page-description mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-500">{desc}</p>
          </div>
        </div>
        {(actions || (guide && loaded && !open)) && (
          <div className="flex flex-wrap gap-2">
            {guide && loaded && !open && (
              <Button aria-label="Cách dùng" className="max-sm:w-9 max-sm:px-0" variant="ghost" icon={CircleHelp} onClick={() => setOpen(true)}>
                <span className="hidden sm:inline">Cách dùng</span>
              </Button>
            )}
            {actions}
          </div>
        )}
      </div>
      {showGuide && (
        <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-violet-100">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CircleHelp className="h-4 w-4 text-violet-500" />
              Cách dùng
            </h2>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              Đã hiểu, ẩn đi
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ol className={cn("grid gap-3", guide!.steps.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3")}>
            {guide!.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-600 text-xs font-semibold text-white">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {guide!.tip && <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-800">{guide!.tip}</p>}
        </div>
      )}
    </div>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  compact,
}: {
  tabs: { id: T; label: string; icon?: LucideIcon }[]
  value: T
  onChange: (v: T) => void
  className?: string
  /** Equal-width tabs with the icon above the label; never scrolls. */
  compact?: boolean
}) {
  if (compact)
    return (
      <div className={cn("grid gap-1 rounded-2xl bg-slate-100/80 p-1", className)} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition sm:text-xs",
              value === t.id ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {t.icon && <t.icon className="h-4 w-4 shrink-0" />}
            <span className="w-full truncate text-center">{t.label}</span>
          </button>
        ))}
      </div>
    )
  return (
    <div className={cn("no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-slate-100/80 p-1", className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition",
            value === t.id ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {t.icon && <t.icon className="h-4 w-4" />}
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon: Icon, title, desc, children }: { icon: LucideIcon; title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-3 font-medium text-slate-700">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-sm text-slate-500">{desc}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600", className)}>
      {children}
    </span>
  )
}

export function AiNotice() {
  const configured = useAiStatus()
  if (configured !== false) return null
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>Trợ lý AI chưa được kết nối nên các nút AI tạm thời chưa dùng được. Mọi chức năng khác vẫn hoạt động đầy đủ.</span>
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-800">{value}</div>
    </div>
  )
}

export function AiResult({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl bg-violet-50/70 p-3 ring-1 ring-violet-100">
      <div className="max-h-96 overflow-y-auto text-sm leading-relaxed text-slate-700">
        <Markdown text={text} />
      </div>
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

/** Minimal, safe Markdown for AI answers: headings, bold, lists, quotes. No raw HTML. */
function inlineMd(s: string): React.ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold text-slate-800">
        {part.slice(2, -2)}
      </strong>
    ) : part.startsWith("`") && part.endsWith("`") && part.length > 2 ? (
      <code key={i} className="rounded bg-white px-1 text-[0.9em]">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  )
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n")
  return (
    <div className="space-y-1.5">
      {lines.map((raw, i) => {
        const line = raw.replace(/\s+$/, "")
        if (!line.trim()) return <div key={i} className="h-1" />
        if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) return <hr key={i} className="border-violet-100" />
        const h = line.match(/^#{1,6}\s+(.*)$/)
        if (h) return <p key={i} className="pt-1 font-semibold text-slate-800">{inlineMd(h[1])}</p>
        const q = line.match(/^>\s?(.*)$/)
        if (q) return <p key={i} className="border-l-2 border-violet-300 pl-3 text-slate-700">{inlineMd(q[1])}</p>
        const li = line.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/)
        if (li)
          return (
            <div key={i} className="flex gap-2" style={{ paddingLeft: Math.min(li[1].length, 8) * 6 }}>
              <span className="shrink-0 text-violet-500">{/\d/.test(li[2]) ? li[2] : "•"}</span>
              <span className="min-w-0">{inlineMd(li[3])}</span>
            </div>
          )
        return <p key={i}>{inlineMd(line)}</p>
      })}
    </div>
  )
}

/** Secondary explanations stay available without competing with the task. */
export function HelpDetails({summary="Cách dùng & lưu ý",children}:{summary?:string;children:React.ReactNode}){
 return <details className="studio-help"><summary>{summary}</summary><div className="studio-help-content">{children}</div></details>
}
