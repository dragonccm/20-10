"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { BadgeCheck, BookOpen, ChevronRight, PenLine, Copy, Download, ExternalLink, Library, Plus, Quote, Search, ShieldAlert, Trash2 } from "lucide-react"
import { Badge, Button, Card, Empty, Input, Label, PageHeader, Select, Tabs } from "@/components/studio/ui"
import { TOOLS } from "@/lib/studio/tools"
import { copyText, downloadFile, uid, useStored } from "@/lib/studio/storage"
import {
  STYLE_LABEL,
  extractDoi,
  formatRef,
  inText,
  lookupDoi,
  refText,
  searchWorks,
  similarTitle,
  sortRefs,
  toBibtex,
  toRis,
  type Author,
  type Ref,
  type Style,
} from "@/lib/studio/cite"

const tool = TOOLS.find((t) => t.slug === "research")!
type Found = Omit<Ref, "id" | "addedAt">

export default function ResearchPage() {
  const [refs, setRefs, loaded] = useStored<Ref[]>("bloom.research.refs", [])
  const [style, setStyle] = useStored<Style>("bloom.research.style", "apa")
  const [tab, setTab] = useState<"search" | "library" | "cite">("search")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Found[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [manual, setManual] = useState({ title: "", authors: "", year: "", container: "", volume: "", issue: "", pages: "", doi: "", publisher: "" })
  const [showManual, setShowManual] = useState(false)

  const inLibrary = (doi?: string) => !!doi && refs.some((r) => r.doi?.toLowerCase() === doi.toLowerCase())

  const search = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setResults(null)
    try {
      const doi = extractDoi(q)
      if (doi) {
        const w = await lookupDoi(doi)
        setResults(w ? [w] : [])
        if (!w) toast.error("DOI này không tồn tại trên Crossref. Hãy kiểm tra lại.")
      } else setResults(await searchWorks(q))
    } catch (e) {
      toast.error((e as Error).message || "Không kết nối được Crossref.")
    } finally {
      setSearching(false)
    }
  }

  const save = (w: Found) => {
    if (inLibrary(w.doi)) return toast.info("Nguồn này đã có trong thư viện.")
    setRefs((rs) => [{ ...w, id: uid(), addedAt: Date.now() }, ...rs])
    toast.success("Đã lưu vào thư viện.")
  }

  const addManual = () => {
    if (!manual.title.trim()) return toast.error("Cần có tiêu đề.")
    const authors: Author[] = manual.authors
      .split(/;|\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        if (s.includes(",")) {
          const [family, given] = s.split(",").map((x) => x.trim())
          return { family, given }
        }
        const parts = s.split(/\s+/)
        return { family: parts.pop() ?? s, given: parts.join(" ") || undefined }
      })
    const doi = manual.doi.trim() ? extractDoi(manual.doi) ?? undefined : undefined
    setRefs((rs) => [
      {
        id: uid(),
        addedAt: Date.now(),
        verified: false,
        title: manual.title.trim(),
        authors,
        year: manual.year.trim() || undefined,
        container: manual.container.trim() || undefined,
        volume: manual.volume.trim() || undefined,
        issue: manual.issue.trim() || undefined,
        pages: manual.pages.trim() || undefined,
        publisher: manual.publisher.trim() || undefined,
        doi,
      },
      ...rs,
    ])
    setManual({ title: "", authors: "", year: "", container: "", volume: "", issue: "", pages: "", doi: "", publisher: "" })
    setShowManual(false)
    toast.success("Đã thêm. Nguồn nhập tay được đánh dấu chưa xác minh.")
  }

  const verify = async (r: Ref) => {
    if (!r.doi) return toast.info("Nguồn này chưa có DOI để xác minh. Hãy thử tìm theo tiêu đề ở tab Tìm kiếm.")
    setVerifying(r.id)
    try {
      const w = await lookupDoi(r.doi)
      if (!w) {
        toast.error("DOI không tồn tại trên Crossref.")
        return
      }
      const sim = similarTitle(w.title, r.title)
      if (sim < 0.5 && !confirm(`Tiêu đề trên Crossref là:\n"${w.title}"\n\nKhác với tiêu đề bạn nhập. Vẫn cập nhật theo Crossref?`)) return
      setRefs((rs) => rs.map((x) => (x.id === r.id ? { ...x, ...w, verified: true } : x)))
      toast.success("Đã xác minh và cập nhật thông tin từ Crossref.")
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setVerifying(null)
    }
  }

  const sorted = sortRefs(refs, style)
  const bibliography = sorted.map((r, i) => refText(r, style, i + 1)).join("\n")

  if (!loaded) return null

  return (
    <div>
      <PageHeader
        icon={tool.icon}
        tint={tool.tint}
        title={tool.name} guide={tool.guide}
        desc={tool.desc}
        actions={
          <Select value={style} onChange={(e) => setStyle(e.target.value as Style)} className="w-auto" aria-label="Kiểu trích dẫn" title="Kiểu trích dẫn">
            {Object.entries(STYLE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "search", label: "1. Tìm bài báo", icon: Search },
          { id: "library", label: `2. Thư viện của bạn (${refs.length})`, icon: Library },
          { id: "cite", label: "3. Lấy danh mục", icon: Quote },
        ]}
      />

      {tab === "search" && (
        <div className="mt-4 space-y-4">
          <Card className="p-4">
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault()
                search()
              }}
            >
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nhập tiêu đề, tác giả, từ khóa hoặc DOI (vd: 10.1037/0003-066X.59.1.29)" />
              <Button type="submit" icon={Search} loading={searching} className="sm:w-36">
                Tìm
              </Button>
            </form>
            <p className="mt-2 text-xs text-slate-500">Dữ liệu lấy trực tiếp từ Crossref (kho bài báo khoa học). Web không tự tạo DOI hay nguồn nào.</p>
          </Card>

          {!results && (
            <Link href="/studio/writing?panel=cite" className="flex items-start gap-3 rounded-2xl bg-violet-50/80 p-4 ring-1 ring-violet-100 transition hover:ring-violet-300">
              <PenLine className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
              <span className="text-sm leading-relaxed text-slate-700">
                <b className="text-slate-800">Đang viết bài và chưa biết tìm nguồn gì?</b> Mở bài trong trang Viết bài, tab Trích dẫn: bấm vào đoạn văn, AI tự chỉ ra câu nào cần nguồn, tìm bài báo phù hợp và chèn trích dẫn giúp bạn.
                <span className="mt-1 flex items-center gap-1 font-medium text-violet-700">
                  Mở trang Viết bài <ChevronRight className="h-4 w-4" />
                </span>
              </span>
            </Link>
          )}

          {results && results.length === 0 && (
            <Card>
              <Empty icon={Search} title="Không tìm thấy kết quả" desc="Thử từ khóa tiếng Anh, tên tác giả hoặc kiểm tra lại DOI." />
            </Card>
          )}
          {results?.map((w, i) => (
            <Card key={(w.doi ?? "") + i} className="p-4">
              <RefView r={w} />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" icon={Plus} onClick={() => save(w)} disabled={inLibrary(w.doi)}>
                  {inLibrary(w.doi) ? "Đã lưu vào thư viện" : "Lưu vào thư viện"}
                </Button>
                {w.doi && (
                  <a
                    href={`https://doi.org/${w.doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Mở bài
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "library" && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant={showManual ? "soft" : "outline"} icon={Plus} onClick={() => setShowManual((v) => !v)}>
              Thêm thủ công
            </Button>
          </div>
          {showManual && (
            <Card className="grid gap-3 p-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <Label>Tiêu đề *</Label>
                <Input value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} />
              </label>
              <label className="sm:col-span-2">
                <Label>Tác giả (cách nhau bằng dấu ;, dạng “Họ, Tên” hoặc “Tên Họ”)</Label>
                <Input value={manual.authors} onChange={(e) => setManual({ ...manual, authors: e.target.value })} placeholder="Nguyen, Thuy Ngan; Kim, Min-ji" />
              </label>
              {(
                [
                  ["year", "Năm"],
                  ["container", "Tạp chí / Tuyển tập"],
                  ["volume", "Tập (volume)"],
                  ["issue", "Số (issue)"],
                  ["pages", "Trang"],
                  ["publisher", "Nhà xuất bản"],
                  ["doi", "DOI (nếu có)"],
                ] as [keyof typeof manual, string][]
              ).map(([k, l]) => (
                <label key={k}>
                  <Label>{l}</Label>
                  <Input value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} />
                </label>
              ))}
              <div className="flex items-end">
                <Button icon={Plus} onClick={addManual} className="w-full">
                  Thêm vào thư viện
                </Button>
              </div>
            </Card>
          )}
          {refs.length === 0 ? (
            <Card>
              <Empty icon={BookOpen} title="Thư viện còn trống" desc="Tìm kiếm và lưu nguồn từ tab Tìm kiếm, hoặc thêm thủ công." />
            </Card>
          ) : (
            refs.map((r) => (
              <Card key={r.id} className="p-4">
                <RefView r={r} />
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Trích dẫn trong bài: <span className="font-medium text-slate-800">{inText(r, style, sorted.indexOf(r) + 1)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Copy}
                    onClick={async () => (await copyText(refText(r, style, sorted.indexOf(r) + 1))) && toast.success("Đã sao chép trích dẫn.")}
                  >
                    Sao chép
                  </Button>
                  {!r.verified && (
                    <Button size="sm" variant="soft" icon={BadgeCheck} loading={verifying === r.id} onClick={() => verify(r)}>
                      Xác minh DOI
                    </Button>
                  )}
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => setRefs((rs) => rs.filter((x) => x.id !== r.id))}>
                    Xóa
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "cite" && (
        <div className="mt-4">
          {refs.length === 0 ? (
            <Card>
              <Empty icon={Quote} title="Chưa có nguồn nào" desc="Lưu nguồn vào thư viện để tạo danh mục tài liệu tham khảo." />
            </Card>
          ) : (
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-800">
                  {style === "apa" ? "References" : style === "mla" ? "Works Cited" : style === "ieee" ? "References" : "Bibliography"}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" icon={Copy} onClick={async () => (await copyText(bibliography)) && toast.success("Đã sao chép danh mục.")}>
                    Sao chép tất cả
                  </Button>
                  <Button size="sm" variant="outline" icon={Download} onClick={() => downloadFile("references.bib", toBibtex(sorted), "text/plain;charset=utf-8")}>
                    BibTeX
                  </Button>
                  <Button size="sm" variant="outline" icon={Download} onClick={() => downloadFile("references.ris", toRis(sorted), "text/plain;charset=utf-8")}>
                    RIS
                  </Button>
                </div>
              </div>
              <ol className="space-y-3">
                {sorted.map((r, i) => (
                  <li key={r.id} className="pl-8 -indent-8 font-serif text-[15px] leading-relaxed text-slate-700">
                    {formatRef(r, style, i + 1).map((s, k) => (s.i ? <i key={k}>{s.t}</i> : <span key={k}>{s.t}</span>))}
                    {!r.verified && (
                      <span className="ml-2 inline-flex translate-y-[-1px] items-center gap-1 indent-0 font-sans text-xs text-amber-600">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        chưa xác minh
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-xs text-slate-500">Hãy đối chiếu lại với hướng dẫn trích dẫn của giảng viên, đặc biệt là cách viết hoa tiêu đề.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function RefView({ r }: { r: Found }) {
  const authors = r.authors.map((a) => [a.given, a.family].filter(Boolean).join(" ")).join(", ")
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 font-medium break-words text-slate-800">{r.title}</h3>
        {r.verified ? (
          <Badge className="bg-emerald-50 text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            Đã xác minh
          </Badge>
        ) : (
          <Badge className="bg-amber-50 text-amber-700">
            <ShieldAlert className="h-3.5 w-3.5" />
            Chưa xác minh
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-600">{authors || "Không rõ tác giả"}</p>
      <p className="mt-1 text-xs text-slate-500">
        {[r.container, r.year, r.volume && `Tập ${r.volume}`, r.issue && `Số ${r.issue}`, r.pages && `tr. ${r.pages}`].filter(Boolean).join(" · ")}
      </p>
      {r.doi && <p className="mt-1 text-xs break-all text-sky-700">doi.org/{r.doi}</p>}
    </div>
  )
}
