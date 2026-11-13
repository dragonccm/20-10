"use client"
import { memo, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  ExternalLink,
  Presentation,
  Heart,
  Image,
  Printer,
  FileText,
  Network,
  Table2,
  Code,
  Globe,
  Mail,
  Briefcase,
  ArrowUpRight,
  Download,
} from "lucide-react"
import { FORMATS, type StudioCategory } from "@/lib/studio/design-formats"
import {
  BLOOM_TEMPLATES,
  buildBloomDesign,
  buildBloomDeck,
  type BloomTemplate,
} from "@/lib/studio/bloom-templates"
import {
  WORKSPACE_NAMES,
  THEMES,
  documentTemplate,
  htmlTemplate,
  sheetTemplate,
} from "@/lib/studio/workspace-templates"
import { CV_THEMES, SAMPLE_CV } from "@/lib/studio/cv-data"
import dynamic from "next/dynamic"
const CvPreview = dynamic(
  () => import("./cv-preview").then((m) => m.CvPreview),
  { ssr: false },
)
import { sendToWriting } from "@/lib/studio/handoff"
import { bgCss, type Design } from "@/lib/studio/design"
import { downloadFile, readLS, writeLS } from "@/lib/studio/storage"
import { Button, Input } from "./ui"
import { DesignElement } from "./design-element"
import { WorkspaceThumbnail } from "./workspace-thumbnail"
const ICONS = {
  presentations: Presentation,
  social: Heart,
  photos: Image,
  print: Printer,
  docs: FileText,
  whiteboard: Network,
  sheets: Table2,
  code: Code,
  websites: Globe,
  email: Mail,
  cv: Briefcase,
}
const normalized = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
const references: Partial<Record<StudioCategory, string>> = {
  presentations: "https://www.canva.com/presentations/templates/professional/",
  cv: "https://www.canva.com/resumes/templates/",
  docs: "https://www.canva.com/reports/templates/",
}

export function TemplateHub({
  onDesign,
  onDeck,
}: {
  onDesign: (design: Design) => void
  onDeck: (designs: Design[]) => void
}) {
  const categoryNav = useRef<HTMLElement>(null)
  const [category, setCategory] = useState<StudioCategory>("presentations")
  const [query, setQuery] = useState("")
  const router = useRouter()
  const format = FORMATS.find((f) => f.id === category)!
  useLayoutEffect(() => {
    const requested =
      new URLSearchParams(window.location.search).get("library") ??
      readLS<string>("bloom.library.category", "presentations")
    if (FORMATS.some((f) => f.id === requested))
      setCategory(requested as StudioCategory)
  }, [])
  useLayoutEffect(() => {
    const nav = categoryNav.current,
      active = nav?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return
    const left = active.offsetLeft - nav.offsetLeft,
      right = left + active.offsetWidth
    if (left < nav.scrollLeft) nav.scrollLeft = left
    else if (right > nav.scrollLeft + nav.clientWidth)
      nav.scrollLeft = right - nav.clientWidth
  }, [category])
  const native = BLOOM_TEMPLATES.filter((t) => t.category === category)
  const items =
    category === "cv"
      ? CV_THEMES.map((t, index) => ({ name: t.name, index }))
      : native.length
        ? native.map((t, index) => ({ name: t.name, index, native: t }))
        : WORKSPACE_NAMES[category]!.map((name, index) => ({ name, index }))
  const results = items.filter((t) =>
    normalized(t.name).includes(normalized(query)),
  )
  const downloadCollection = () => {
    const templates = items.map((item) => {
      const meta = "native" in item ? (item.native as BloomTemplate) : undefined
      if (meta)
        return category === "presentations"
          ? buildBloomDeck(meta)
          : buildBloomDesign(meta)
      if (category === "cv") return CV_THEMES[item.index]
      if (category === "docs") return documentTemplate(item.index)
      if (category === "sheets")
        return { name: item.name, cells: sheetTemplate(item.index) }
      return {
        name: item.name,
        html: htmlTemplate(
          category as "code" | "websites" | "email",
          item.index,
        ),
      }
    })
    downloadFile(
      `bloom-${category}-20-mau.json`,
      JSON.stringify(
        {
          collection: "Bloom Original",
          category,
          license: "CC0-1.0",
          templates,
        },
        null,
        2,
      ),
      "application/json",
    )
  }
  return (
    <section className="template-hub hub-refined">
      <div className="hub-heading">
        <div>
          <span className="hub-eyebrow">MỘT KHỞI ĐẦU CHO Ý TƯỞNG</span>
          <h1>Chọn mẫu, rồi làm thành của bạn.</h1>
          <p>
            {FORMATS.length * 20} mẫu Bloom · Chỉnh từng chi tiết · Dùng tự do
          </p>
        </div>
        <div className="hub-search">
          <Search size={18} />
          <Input
            aria-label="Tìm mẫu thiết kế"
            placeholder={`Tìm mẫu ${format.short.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <nav
        ref={categoryNav}
        className="hub-categories"
        aria-label="Loại thiết kế"
      >
        {FORMATS.map((f) => {
          const Icon = ICONS[f.id]
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={category === f.id}
              onClick={() => {
                setCategory(f.id)
                writeLS("bloom.library.category", f.id)
                setQuery("")
              }}
            >
              <Icon size={16} />
              {f.short}
            </button>
          )
        })}
      </nav>
      <div className="hub-section-heading">
        <div>
          <h2>
            {format.name}
            <span>{results.length} mẫu</span>
          </h2>
          <p>{format.description}</p>
        </div>
        <div className="hub-collection-actions">
          <Button
            size="sm"
            variant="ghost"
            icon={Download}
            onClick={downloadCollection}
          >
            Tải bộ mẫu
          </Button>
          <a
            href={references[category] ?? "https://www.canva.com/templates/"}
            target="_blank"
            rel="noopener noreferrer"
          >
            Tham khảo Canva <ExternalLink size={13} />
          </a>
        </div>
      </div>
      <div
        key={category}
        className="hub-template-grid studio-panel-enter"
        data-category={category}
      >
        {results.map((item) => {
          const meta =
            "native" in item ? (item.native as BloomTemplate) : undefined
          return (
            <button
              type="button"
              aria-label={`Mở mẫu ${item.name}`}
              key={category + item.index}
              className="hub-template-card"
              onClick={() => {
                if (meta) {
                  if (category === "presentations") onDeck(buildBloomDeck(meta))
                  else onDesign(buildBloomDesign(meta))
                } else if (category === "cv")
                  router.push(`/studio/career?theme=${item.index}`)
                else if (category === "docs") {
                  const doc = documentTemplate(item.index)
                  sendToWriting(doc.title, {
                    html: doc.html,
                    lang: "vi",
                    kind: "report",
                  })
                  router.push("/studio/writing")
                } else
                  router.push(
                    `/studio/create/${category}?template=${item.index}`,
                  )
              }}
            >
              <div
                className="hub-template-art"
                style={{
                  background: meta?.paper ?? THEMES[item.index % 5].paper,
                }}
              >
                {meta ? (
                  <NativeThumbnail meta={meta} />
                ) : category === "cv" ? (
                  <CvThumbnail index={item.index} />
                ) : (
                  <WorkspaceThumbnail
                    kind={
                      category as
                        | "docs"
                        | "sheets"
                        | "code"
                        | "websites"
                        | "email"
                    }
                    index={item.index}
                  />
                )}
                <span className="hub-card-badge">
                  {category === "presentations" ? "5 trang" : format.output}
                </span>
              </div>
              <div className="hub-card-caption">
                <div>
                  <strong>{item.name}</strong>
                  <span>{meta?.caption ?? format.output}</span>
                </div>
                <ArrowUpRight size={16} />
              </div>
            </button>
          )
        })}
      </div>
      {!results.length && (
        <p className="p-8 text-center text-slate-500">
          Thử một từ khóa khác nhé.
        </p>
      )}
      <p className="hub-license">
        Thiết kế gốc của Bloom ·{" "}
        <a
          href="/templates/bloom/LICENSE.txt"
          target="_blank"
          rel="noopener noreferrer"
        >
          CC0 1.0
        </a>
        . Canva là nguồn tham khảo; mẫu Canva được sử dụng tại Canva.
      </p>
    </section>
  )
}
const NativeThumbnail = memo(function NativeThumbnail({
  meta,
}: {
  meta: BloomTemplate
}) {
  const d = useMemo(() => buildBloomDesign(meta), [meta])
  const { ref, box } = usePreviewBox(),
    scale = Math.min(box.w / d.w, box.h / d.h)
  return (
    <div ref={ref} aria-hidden="true" className="hub-preview-frame">
      <div
        className="native-template-preview"
        style={{
          width: d.w * scale,
          height: d.h * scale,
          background: bgCss(d.bg),
        }}
      >
        {d.els.map((el) => (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: el.x * scale,
              top: el.y * scale,
              width: el.w * scale,
              height: el.h * scale,
              transform: el.rot ? `rotate(${el.rot}deg)` : undefined,
            }}
          >
            <DesignElement el={el} scale={scale} />
          </div>
        ))}
      </div>
    </div>
  )
})
function usePreviewBox() {
  const ref = useRef<HTMLDivElement>(null),
    [box, setBox] = useState({ w: 240, h: 180 })
  useLayoutEffect(() => {
    const host = ref.current
    if (!host) return
    setBox({ w: host.clientWidth, h: host.clientHeight })
    const observer = new ResizeObserver(([entry]) =>
      setBox({
        w: Math.max(1, entry.contentRect.width),
        h: Math.max(1, entry.contentRect.height),
      }),
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [])
  return { ref, box }
}
const CvThumbnail = memo(function CvThumbnail({ index }: { index: number }) {
  const { ref, box } = usePreviewBox(),
    scale = Math.min(box.w / 794, box.h / 1123, 0.26)
  return (
    <div ref={ref} aria-hidden="true" className="hub-preview-frame">
      <div
        style={{
          width: 794 * scale,
          height: 1123 * scale,
          overflow: "hidden",
          background: "white",
        }}
      >
        <div
          style={{
            width: 794,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <CvPreview cv={SAMPLE_CV} theme={CV_THEMES[index]} />
        </div>
      </div>
    </div>
  )
})
