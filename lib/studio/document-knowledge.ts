import { z } from "zod"
export type DocumentSource = {
  id: string
  name: string
  parts: string[]
  text: string
  fileKind: string
}
export type SourceChunk = {
  id: string
  page: number
  start: number
  text: string
}
export type Evidence = { page: number; quote: string }
export type Note = { text: string; evidence: Evidence[] }
export const evidenceSchema = z
  .object({
    page: z.number().int().positive(),
    quote: z.string().min(8).max(1200),
  })
  .strict()
export const noteSchema = z
  .object({
    text: z.string().min(1).max(1600),
    evidence: z.array(evidenceSchema).min(1).max(5),
  })
  .strict()
export const extractionSchema = z
  .object({ heading: z.string().max(180), notes: z.array(noteSchema).max(12) })
  .strict()
export const answerSchema = z
  .object({
    answer: z.string().min(1).max(8000),
    evidence: z.array(evidenceSchema).max(12),
    found: z.boolean(),
  })
  .strict()
export type Extraction = z.infer<typeof extractionSchema>
export function normalizedSource(s: string) {
  return s.normalize("NFC").replace(/\s+/g, " ").trim()
}
export function sourcePages(doc: DocumentSource) {
  return doc.parts.length ? doc.parts : [doc.text]
}
/** No truncation: every character belongs to a stable, page-addressable chunk. */
export function documentChunks(
  doc: DocumentSource,
  size = 9000,
): SourceChunk[] {
  if (!Number.isInteger(size) || size < 100) throw Error("Invalid chunk size")
  return sourcePages(doc).flatMap((text, index) => {
    const out: SourceChunk[] = []
    for (let start = 0; start < text.length; ) {
      let end = Math.min(start + size, text.length)
      if (end < text.length) {
        const newline = text.lastIndexOf("\n", end)
        if (newline > start + size * 0.6) end = newline + 1
      }
      const value = text.slice(start, end)
      if (value.trim())
        out.push({
          id: `p${index + 1}-${start}`,
          page: index + 1,
          start,
          text: value,
        })
      start = end
    }
    return out
  })
}
export function verifiedEvidence(
  evidence: Evidence[],
  chunks: SourceChunk[],
): Evidence[] {
  const seen = new Set<string>()
  return evidence.filter((e) => {
    const quote = normalizedSource(e.quote),
      key = e.page + ":" + quote
    if (quote.length < 8 || seen.has(key)) return false
    const found = chunks.some(
      (c) => c.page === e.page && normalizedSource(c.text).includes(quote),
    )
    if (found) seen.add(key)
    return found
  })
}
export function verifiedNotes(notes: Note[], chunks: SourceChunk[]): Note[] {
  return notes.flatMap((note) => {
    const evidence = verifiedEvidence(note.evidence, chunks)
    return evidence.length ? [{ text: note.text, evidence }] : []
  })
}
const words = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .match(/[\p{L}\p{N}]{2,}/gu) || []
const STOP = new Set(
  "cua la va trong nhung cac cho voi tai lieu nay gi the nao hay mot toi ban what the and this that does from how".split(
    " ",
  ),
)
export function retrieveChunks(
  chunks: SourceChunk[],
  query: string,
  budget = 17000,
): SourceChunk[] {
  const terms = [...new Set(words(query).filter((w) => !STOP.has(w)))],
    frequency = new Map<string, number>()
  for (const c of chunks)
    for (const w of new Set(words(c.text)))
      if (terms.includes(w)) frequency.set(w, (frequency.get(w) || 0) + 1)
  const scored = chunks
    .map((c, index) => {
      const ws = words(c.text),
        score = terms.reduce(
          (sum, w) =>
            sum +
            (ws.filter((x) => x === w).length / (1 + ws.length / 600)) *
              Math.log(1 + chunks.length / (1 + (frequency.get(w) || 0))),
          0,
        )
      return { c, score, index }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
  const chosen: SourceChunk[] = []
  let used = 0
  for (const { c } of scored) {
    if (used + c.text.length > budget) continue
    chosen.push(c)
    used += c.text.length
    if (chosen.length >= 8) break
  }
  return chosen.sort((a, b) => a.page - b.page || a.start - b.start)
}
export function chunkContext(chunks: SourceChunk[]) {
  return chunks
    .map((c) => `[Trang ${c.page}, đoạn ${c.id}]\n${c.text}`)
    .join("\n\n")
}
export function notesText(notes: Note[], marker = "Trang") {
  return notes
    .map(
      (n, i) =>
        `${i + 1}. ${n.text}\n${n.evidence.map((e) => `[${marker} ${e.page}] “${e.quote}”`).join("\n")}`,
    )
    .join("\n\n")
}
export async function documentFingerprint(doc: DocumentSource) {
  const bytes = new TextEncoder().encode(JSON.stringify(sourcePages(doc)))
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(hash), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("")
}
