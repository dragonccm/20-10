"use client"
import { callAi } from "./ai"
import { idbGet, idbSet } from "./idb"
import {
  documentChunks,
  documentFingerprint,
  chunkContext,
  notesText,
  verifiedNotes,
  extractionSchema,
  type DocumentSource,
  type Extraction,
  type Note,
} from "./document-knowledge"
export type Knowledge = {
  version: 1
  fingerprint: string
  sections: Record<string, Extraction>
  brief?: Note[]
}
export async function loadKnowledge(doc: DocumentSource) {
  const fingerprint = await documentFingerprint(doc)
  return (
    (await idbGet<Knowledge>(`bloom.knowledge.${doc.id}.${fingerprint}`)) ?? {
      version: 1 as const,
      fingerprint,
      sections: {},
    }
  )
}
export async function analyzeDocument(
  doc: DocumentSource,
  signal: AbortSignal,
  onProgress: (done: number, total: number, state: Knowledge) => void,
) {
  const chunks = documentChunks(doc),
    state = await loadKnowledge(doc)
  for (let i = 0; i < chunks.length; i++) {
    signal.throwIfAborted()
    const chunk = chunks[i]
    if (!state.sections[chunk.id]) {
      const raw = extractionSchema.parse(
        await callAi(
          "document-extract",
          { text: chunkContext([chunk]) },
          signal,
        ),
      )
      const notes = verifiedNotes(raw.notes, [chunk])
      if (raw.notes.length && !notes.length)
        throw Error(
          `Phần ${chunk.id}: chưa đối chiếu được trích đoạn. Bạn có thể thử lại; các phần đã xong vẫn được giữ.`,
        )
      state.sections[chunk.id] = { ...raw, notes }
      if (
        !(await idbSet(`bloom.knowledge.${doc.id}.${state.fingerprint}`, state))
      )
        throw Error(
          "Chưa lưu được ghi chú. Hãy tải bản sao hoặc kiểm tra dung lượng trình duyệt.",
        )
    }
    signal.throwIfAborted()
    onProgress(i + 1, chunks.length, {
      ...state,
      sections: { ...state.sections },
    })
  }
  return state
}
/** Hierarchical reduction: every note is visited, never sliced off to fit a prompt. */
export async function condenseDocument(
  doc: DocumentSource,
  state: Knowledge,
  signal: AbortSignal,
  onProgress: (message: string) => void,
): Promise<Note[]> {
  if (state.brief?.length) return state.brief
  const original = documentChunks(doc)
  let level = Object.values(state.sections).flatMap((s) => s.notes),
    round = 0
  if (!level.length) throw Error("Chưa có ghi chú được đối chiếu nguồn.")
  while (level.length > 8 || notesText(level).length > 13000) {
    if (++round > 8)
      throw Error(
        "Bản rút gọn chưa đủ ngắn. Ghi chú theo phần vẫn còn nguyên để bạn sử dụng.",
      )
    const groups: Note[][] = []
    let group: Note[] = [],
      size = 0
    for (const n of level) {
      const len = notesText([n]).length
      if (size + len > 11000 && group.length) {
        groups.push(group)
        group = []
        size = 0
      }
      group.push(n)
      size += len
    }
    if (group.length) groups.push(group)
    const next: Note[] = []
    for (let i = 0; i < groups.length; i++) {
      signal.throwIfAborted()
      onProgress(
        `Đang gom ý chính · lượt ${round}, phần ${i + 1}/${groups.length}`,
      )
      const raw = extractionSchema.parse(
        await callAi(
          "document-extract",
          {
            text:
              "Gộp các ghi chú dưới đây thành tối đa 4 ý quan trọng, không lặp, giữ nguyên quote nguồn gốc và trang. Không dùng câu diễn giải làm quote.\n" +
              notesText(groups[i]),
          },
          signal,
        ),
      )
      const notes = verifiedNotes(raw.notes, original)
      if (!notes.length)
        throw Error(
          "Chưa đối chiếu được nguồn cho bản rút gọn. Các ghi chú chi tiết vẫn được giữ.",
        )
      next.push(...notes)
    }
    if (
      notesText(next).length >= notesText(level).length &&
      next.length >= level.length
    )
      throw Error(
        "Chưa rút ngắn được thêm; bạn vẫn có thể xem đầy đủ ghi chú theo phần.",
      )
    level = next
  }
  state.brief = level
  await idbSet(`bloom.knowledge.${doc.id}.${state.fingerprint}`, state)
  return level
}
