"use client"

import { callAi } from "./ai"
import { BGS, fitText, text as textEl, shape, type Design, type El } from "./design"
import { idbGet, idbSet } from "./idb"
import { readLS, uid, writeLS } from "./storage"
import { textToHtml } from "./text"
import { readPptxSlides, renderPdfPages, type FileKind } from "./docparse"
import { EMPTY_CV, type CV } from "@/components/studio/cv-preview"

/* ---------- Creative designs live in IndexedDB (they hold images); old data migrates from localStorage. ---------- */

export const DESIGNS_KEY = "bloom.creative.designs"

export async function loadDesigns(): Promise<Design[]> {
  const fromIdb = await idbGet<Design[]>(DESIGNS_KEY)
  if (fromIdb) return fromIdb
  return readLS<Design[]>(DESIGNS_KEY, [])
}

export async function storeDesigns(ds: Design[]) {
  if (await idbSet(DESIGNS_KEY, ds)) {
    try {
      localStorage.removeItem(DESIGNS_KEY)
    } catch {
      /* ignore */
    }
    return true
  }
  return writeLS(DESIGNS_KEY, ds)
}

export async function addDesigns(news: Design[]) {
  const ds = await loadDesigns()
  return storeDesigns([...news, ...ds])
}

/* ---------- Writing Studio ---------- */

export function sendToWriting(title: string, opts: { html?: string; text?: string; lang: "vi" | "en" | "ko"; kind?: "essay" | "report" | "other" }) {
  const now = Date.now()
  const doc = {
    id: uid(),
    title: title.slice(0, 120) || "Tài liệu nhập",
    kind: opts.kind ?? "essay",
    lang: opts.lang,
    wordLimit: null,
    requirements: "",
    html: opts.html ?? textToHtml(opts.text ?? ""),
    createdAt: now,
    updatedAt: now,
    versions: [],
  }
  const docs = readLS<unknown[]>("bloom.writing.docs", [])
  if (!writeLS("bloom.writing.docs", [doc, ...docs])) throw new Error("Bộ nhớ trình duyệt đã đầy, hãy xóa bớt bài viết cũ.")
  writeLS("bloom.writing.active", doc.id)
  return doc.id
}

export function sendToOriginality(text: string) {
  writeLS("bloom.originality.essay", text)
}

/* ---------- Career Studio ---------- */

const s = (v: unknown, max = 600) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object").slice(0, 12) : []) as Record<string, unknown>[]
const lines = (v: unknown) => (Array.isArray(v) ? v.map((x) => s(x, 300)).filter(Boolean).join("\n") : s(v, 2000))

/** Turns any CV text (from PDF, Word, a photo...) into the structured CV the builder edits. */
export async function parseCv(text: string): Promise<Omit<CV, "theme" | "photo" | "accent">> {
  const r = await callAi<Record<string, unknown>>("cv-parse", { text: text.slice(0, 20000) })
  const lang = r.lang === "en" || r.lang === "ko" ? r.lang : "vi"
  return {
    ...EMPTY_CV,
    lang,
    name: s(r.name, 120),
    title: s(r.title, 160),
    email: s(r.email, 120),
    phone: s(r.phone, 60),
    location: s(r.location, 120),
    link: s(r.link, 200),
    summary: s(r.summary, 1500),
    education: arr(r.education).map((e) => ({ id: uid(), school: s(e.school, 200), degree: s(e.degree, 200), from: s(e.from, 20), to: s(e.to, 20), detail: s(e.detail, 500) })),
    experience: arr(r.experience).map((e) => ({ id: uid(), org: s(e.org, 200), role: s(e.role, 200), from: s(e.from, 20), to: s(e.to, 20), bullets: lines(e.bullets) })),
    projects: arr(r.projects).map((e) => ({ id: uid(), name: s(e.name, 200), detail: s(e.detail, 800) })),
    skills: Array.isArray(r.skills) ? r.skills.map((x) => s(x, 60)).filter(Boolean).join(", ") : s(r.skills, 800),
    languages: arr(r.languages).map((e) => ({ id: uid(), name: s(e.name, 60), level: s(e.level, 120) })),
    certificates: lines(r.certificates),
  }
}

export const CV_KEY = "bloom.career.cv"
export const CV_BACKUP_KEY = "bloom.career.cvBackup"

/** Saves the parsed CV (keeping the chosen theme, colour and photo) and keeps the old one for undo. */
export function saveImportedCv(parsed: Omit<CV, "theme" | "photo" | "accent">) {
  const old = readLS<CV>(CV_KEY, EMPTY_CV)
  if (old.name || old.summary || old.education.length || old.experience.length) writeLS(CV_BACKUP_KEY, old)
  const next: CV = { ...parsed, theme: old.theme, accent: old.accent, photo: old.photo }
  writeLS(CV_KEY, next)
  return next
}

/* ---------- Korean Lab ---------- */

type Card = { id: string; front: string; back: string; example?: string; box: number; due: number; reps: number; lapses: number }

export async function makeKoreanCards(text: string) {
  const r = await callAi<{ cards?: { front?: string; back?: string; example?: string }[] }>("vocab", { text: text.slice(0, 12000) })
  const cards = (r.cards ?? []).filter((c) => c && typeof c.front === "string" && typeof c.back === "string" && c.front.trim() && c.back.trim())
  const existing = readLS<Card[]>("bloom.korean.cards", [])
  const have = new Set(existing.map((c) => c.front.trim()))
  const fresh: Card[] = cards
    .filter((c) => !have.has(c.front!.trim()))
    .map((c) => ({ id: uid(), front: c.front!.trim(), back: c.back!.trim(), example: c.example?.trim() || undefined, box: 0, due: Date.now() - 1000, reps: 0, lapses: 0 }))
  if (fresh.length) writeLS("bloom.korean.cards", [...existing, ...fresh])
  return { added: fresh.length, skipped: cards.length - fresh.length }
}

/* ---------- Creative Studio: slides / pages to editable designs ---------- */

export async function documentToDesigns(file: Blob, name: string, kind: FileKind, onProgress?: (msg: string) => void): Promise<Design[]> {
  const base = name.replace(/\.[^.]+$/, "")
  const now = Date.now()
  if (kind === "pptx") {
    const { ratio, slides } = await readPptxSlides(file, (i, n) => onProgress?.(`Đang dựng slide ${i}/${n}...`))
    const W = 1920
    const H = Math.round(W / ratio)
    return slides.map((sl, i) => {
      const els: El[] = []
      for (const e of sl.els) {
        const box = { x: Math.round(e.x * W), y: Math.round(e.y * H), w: Math.max(20, Math.round(e.w * W)), h: Math.max(20, Math.round(e.h * H)) }
        if (e.kind === "image") els.push({ id: uid(), type: "image", ...box, opacity: 1, src: e.src, nw: e.nw, nh: e.nh, cutout: e.alpha || undefined })
        else if (e.kind === "shape") els.push(shape(e.ellipse ? "circle" : "rect", { ...box, fill: e.fill, radius: 0 }))
        else
          els.push(
            textEl({
              ...box,
              text: e.text,
              fontSize: Math.max(12, Math.round(e.size * W)),
              weight: e.bold ? 700 : 400,
              color: e.color ?? (sl.bg && isDark(sl.bg) ? "#ffffff" : "#1e293b"),
              align: e.align,
              lineHeight: 1.2,
            }),
          )
      }
      const bg = sl.bg ? { from: sl.bg, to: sl.bg, angle: 135 } : BGS[0]
      const d = fitText({ name: `${base} · Slide ${i + 1}`, w: W, h: H, bg, els }, false)
      return { ...d, id: uid(), updatedAt: now - i }
    })
  }
  if (kind === "pdf") {
    const pages = await renderPdfPages(file, 1600, 30, (i, n) => onProgress?.(`Đang chuyển trang ${i}/${n}...`))
    return pages.map((p, i) => {
      const W = p.w >= p.h ? 1920 : 1240
      const H = Math.round((W * p.h) / p.w)
      return { id: uid(), name: `${base} · Trang ${i + 1}`, w: W, h: H, bg: BGS[0], els: [{ id: uid(), type: "image", x: 0, y: 0, w: W, h: H, opacity: 1, src: p.src, nw: p.w, nh: p.h }], updatedAt: now - i }
    })
  }
  throw new Error("Chỉ chuyển được PowerPoint (.pptx) hoặc PDF thành thiết kế.")
}

function isDark(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 128
}
