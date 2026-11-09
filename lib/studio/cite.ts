import { escapeHtml } from "./storage"

export type Author = { given?: string; family: string }
export type Ref = {
  id: string
  doi?: string
  title: string
  authors: Author[]
  year?: string
  container?: string
  volume?: string
  issue?: string
  pages?: string
  publisher?: string
  url?: string
  type?: string
  verified: boolean
  addedAt: number
  note?: string
  abstract?: string
}
export type Style = "apa" | "mla" | "chicago" | "ieee"

export const STYLE_LABEL: Record<Style, string> = { apa: "APA 7", mla: "MLA 9", chicago: "Chicago (tác giả–năm)", ieee: "IEEE" }

export const DOI_RE = /10\.\d{4,9}\/[^\s"<>]+/i

export function extractDoi(s: string) {
  const m = s.match(DOI_RE)
  return m ? m[0].replace(/[.,;)\]]+$/, "") : null
}

const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromCrossref(w: any): Omit<Ref, "id" | "addedAt"> {
  return {
    doi: w.DOI,
    title: strip(w.title?.[0] ?? "(Không có tiêu đề)"),
    authors: (w.author ?? [])
      .map((a: { given?: string; family?: string; name?: string }) => ({ given: a.given, family: a.family ?? a.name ?? "" }))
      .filter((a: Author) => a.family),
    year: String(w.issued?.["date-parts"]?.[0]?.[0] ?? w.published?.["date-parts"]?.[0]?.[0] ?? "") || undefined,
    container: strip(w["container-title"]?.[0] ?? "") || undefined,
    volume: w.volume,
    issue: w.issue,
    pages: w.page,
    publisher: w.publisher,
    url: w.URL,
    type: w.type,
    verified: true,
    abstract: w.abstract ? strip(w.abstract.replace(/<jats:title>[^<]*<\/jats:title>/gi, " ")).slice(0, 1200) || undefined : undefined,
  }
}

const CR = "https://api.crossref.org/works"
const FIELDS = "DOI,title,author,issued,published,container-title,volume,issue,page,publisher,URL,type"

export async function lookupDoi(doi: string) {
  const res = await fetch(`${CR}/${encodeURIComponent(doi)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Crossref đang bận, thử lại sau.")
  const data = await res.json()
  return fromCrossref(data.message)
}

export async function searchWorks(query: string, rows = 12, withAbstract = false) {
  const res = await fetch(`${CR}?query.bibliographic=${encodeURIComponent(query)}&rows=${rows}&select=${FIELDS}${withAbstract ? ",abstract" : ""}`)
  if (!res.ok) throw new Error("Crossref đang bận, thử lại sau.")
  const data = await res.json()
  return (data.message?.items ?? []).map(fromCrossref) as Omit<Ref, "id" | "addedAt">[]
}

const initials = (given?: string) =>
  (given ?? "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((g) => g[0].toUpperCase() + ".")
    .join(" ")

function apaAuthors(a: Author[]) {
  const f = a.map((x) => (x.given ? `${x.family}, ${initials(x.given)}` : x.family))
  if (f.length === 0) return ""
  if (f.length === 1) return f[0]
  if (f.length <= 20) return f.slice(0, -1).join(", ") + ", & " + f[f.length - 1]
  return f.slice(0, 19).join(", ") + ", ... " + f[f.length - 1]
}

function mlaAuthors(a: Author[]) {
  if (a.length === 0) return ""
  const first = a[0].given ? `${a[0].family}, ${a[0].given}` : a[0].family
  if (a.length === 1) return first
  if (a.length === 2) return `${first}, and ${[a[1].given, a[1].family].filter(Boolean).join(" ")}`
  return `${first}, et al.`
}

function chicagoAuthors(a: Author[]) {
  if (a.length === 0) return ""
  const rest = a.slice(1).map((x) => [x.given, x.family].filter(Boolean).join(" "))
  const first = a[0].given ? `${a[0].family}, ${a[0].given}` : a[0].family
  if (a.length > 10) return `${first}, et al.`
  if (!rest.length) return first
  return [first, ...rest.slice(0, -1)].join(", ") + ", and " + rest[rest.length - 1]
}

function ieeeAuthors(a: Author[]) {
  const f = a.map((x) => [initials(x.given), x.family].filter(Boolean).join(" "))
  if (f.length > 6) return `${f[0]} et al.`
  if (f.length <= 2) return f.join(" and ")
  return f.slice(0, -1).join(", ") + ", and " + f[f.length - 1]
}

const end = (s: string) => (/[.?!]$/.test(s) ? s : s + ".")

/** Returns segments; `i` marks italic text. */
export function formatRef(r: Ref, style: Style, n = 1): { t: string; i?: boolean }[] {
  const doi = r.doi ? `https://doi.org/${r.doi}` : r.url ?? ""
  const year = r.year ?? "n.d."
  const out: { t: string; i?: boolean }[] = []
  const push = (t: string, i?: boolean) => t && out.push({ t, i })

  if (style === "apa") {
    push(apaAuthors(r.authors) ? `${end(apaAuthors(r.authors))} ` : "")
    push(`(${year}). `)
    if (r.container) {
      push(`${end(r.title)} `)
      push(r.container, true)
      if (r.volume) {
        push(", ")
        push(r.volume, true)
      }
      push(r.issue ? `(${r.issue})` : "")
      push(r.pages ? `, ${r.pages}` : "")
      push(". ")
    } else {
      push(end(r.title), true)
      push(r.publisher ? ` ${end(r.publisher)}` : "")
      push(" ")
    }
    push(doi)
  } else if (style === "mla") {
    push(mlaAuthors(r.authors) ? `${end(mlaAuthors(r.authors))} ` : "")
    if (r.container) {
      push(`“${end(r.title)}” `)
      push(r.container, true)
      push([r.volume && `, vol. ${r.volume}`, r.issue && `, no. ${r.issue}`, `, ${year}`, r.pages && `, pp. ${r.pages}`].filter(Boolean).join("") + ". ")
    } else {
      push(end(r.title), true)
      push(` ${[r.publisher, year].filter(Boolean).join(", ")}. `)
    }
    push(doi.replace(/^https?:\/\//, ""))
  } else if (style === "chicago") {
    push(chicagoAuthors(r.authors) ? `${end(chicagoAuthors(r.authors))} ` : "")
    push(`${year}. `)
    if (r.container) {
      push(`“${end(r.title)}” `)
      push(r.container, true)
      push(`${r.volume ? ` ${r.volume}` : ""}${r.issue ? ` (${r.issue})` : ""}${r.pages ? `: ${r.pages}` : ""}. `)
    } else {
      push(end(r.title), true)
      push(r.publisher ? ` ${end(r.publisher)} ` : " ")
    }
    push(doi)
  } else {
    push(`[${n}] `)
    push(ieeeAuthors(r.authors) ? `${ieeeAuthors(r.authors)}, ` : "")
    if (r.container) {
      push(`“${r.title},” `)
      push(r.container, true)
      push([r.volume && `, vol. ${r.volume}`, r.issue && `, no. ${r.issue}`, r.pages && `, pp. ${r.pages}`, `, ${year}`].filter(Boolean).join(""))
    } else {
      push(r.title, true)
      push(`${r.publisher ? `. ${r.publisher}` : ""}, ${year}`)
    }
    push(r.doi ? `, doi: ${r.doi}.` : ".")
  }
  return out
}

export const refText = (r: Ref, s: Style, n?: number) => formatRef(r, s, n).map((x) => x.t).join("").trim()
export const refHtml = (r: Ref, s: Style, n?: number) =>
  formatRef(r, s, n)
    .map((x) => (x.i ? `<i>${escapeHtml(x.t)}</i>` : escapeHtml(x.t)))
    .join("")
    .trim()

export function inText(r: Ref, style: Style, n = 1) {
  const a = r.authors
  const year = r.year ?? "n.d."
  if (style === "ieee") return `[${n}]`
  const name =
    a.length === 0 ? `“${r.title.split(" ").slice(0, 4).join(" ")}”` : a.length === 1 ? a[0].family : a.length === 2 ? `${a[0].family} ${style === "apa" ? "&" : "and"} ${a[1].family}` : `${a[0].family} et al.`
  return style === "mla" ? `(${name})` : `(${name}, ${year})`
}

export function sortRefs(refs: Ref[], style: Style) {
  if (style === "ieee") return refs
  return [...refs].sort((x, y) => (x.authors[0]?.family ?? x.title).localeCompare(y.authors[0]?.family ?? y.title))
}

export function toBibtex(refs: Ref[]) {
  return refs
    .map((r, i) => {
      const key = `${(r.authors[0]?.family ?? "ref").replace(/[^\p{L}\p{N}]/gu, "")}${r.year ?? ""}${i}`
      const fields = [
        ["title", r.title],
        ["author", r.authors.map((a) => [a.family, a.given].filter(Boolean).join(", ")).join(" and ")],
        ["year", r.year],
        [r.container ? "journal" : "publisher", r.container ?? r.publisher],
        ["volume", r.volume],
        ["number", r.issue],
        ["pages", r.pages?.replace("-", "--")],
        ["doi", r.doi],
      ].filter(([, v]) => v)
      return `@${r.container ? "article" : "book"}{${key},\n${fields.map(([k, v]) => `  ${k} = {${v}}`).join(",\n")}\n}`
    })
    .join("\n\n")
}

export function toRis(refs: Ref[]) {
  return refs
    .map((r) =>
      [
        `TY  - ${r.container ? "JOUR" : "BOOK"}`,
        `TI  - ${r.title}`,
        ...r.authors.map((a) => `AU  - ${[a.family, a.given].filter(Boolean).join(", ")}`),
        r.year && `PY  - ${r.year}`,
        r.container && `JO  - ${r.container}`,
        r.volume && `VL  - ${r.volume}`,
        r.issue && `IS  - ${r.issue}`,
        r.pages && `SP  - ${r.pages}`,
        r.doi && `DO  - ${r.doi}`,
        "ER  - ",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n")
}

export function similarTitle(a: string, b: string) {
  const tok = (s: string) => new Set(s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2))
  const A = tok(a)
  const B = tok(b)
  if (!A.size || !B.size) return 0
  let common = 0
  A.forEach((w) => B.has(w) && common++)
  return common / Math.max(A.size, B.size)
}
