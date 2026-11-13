import { strFromU8, strToU8, zipSync } from "fflate"
import { checkedUnzip } from "./word-template"

export type TemplateKind = "docx" | "pptx"
type Segment = {
  from: number
  text: string
  start: number
  end: number
  open?: string
  close?: string
  runOpen?: string
  runPrefix?: string
}
export type TemplateBlock = {
  id: string
  part: string
  index: number
  location: string
  text: string
  protected: boolean
  linked: boolean
  emptyHint?: string
  insertAt?: number
  insertPrefix?: string
  insertRun?: boolean
  selfParagraph?: string
  emptyStyle?: string
  object?: boolean
  segments: Segment[]
}
export type TemplateSlot = {
  id: string
  blockId: string
  label: string
  original: string
  start: number
  end: number
  source: "marker" | "suggested" | "manual"
}
export type TemplateModel = {
  kind: TemplateKind
  blocks: TemplateBlock[]
  slots: TemplateSlot[]
}
const WORD = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
const DRAW = "http://schemas.openxmlformats.org/drawingml/2006/main"
const decode = (s: string) =>
  s.replace(
    /<!\[CDATA\[([\s\S]*?)\]\]>|&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (_, cdata: string | undefined, v: string) => {
      if (cdata !== undefined) return cdata
      if (v[0] !== "#")
        return (
          (
            { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<
              string,
              string
            >
          )[v] ?? _
        )
      const n =
        v[1].toLowerCase() === "x"
          ? parseInt(v.slice(2), 16)
          : Number(v.slice(1))
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
        ? String.fromCodePoint(n)
        : ""
    },
  )
const escape = (s: string) =>
  s
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
function paragraphs(
  xml: string,
  part: string,
  kind: TemplateKind,
): TemplateBlock[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw Error("Mẫu có cấu trúc XML không được hỗ trợ.")
  if (
    typeof DOMParser !== "undefined" &&
    new DOMParser()
      .parseFromString(xml, "application/xml")
      .querySelector("parsererror")
  )
    throw Error("Tệp mẫu có XML không hợp lệ.")
  const ns = kind === "docx" ? WORD : DRAW
  const prefixes = [...xml.matchAll(/xmlns(?::([\w.-]+))?=["']([^"']+)["']/g)]
    .filter((m) => m[2] === ns)
    .map((m) => (m[1] ? m[1] + ":" : ""))
  const names = (local: string) => prefixes.map((p) => p + local)
  const pNames = names("p"),
    tNames = names("t"),
    rNames = names("r"),
    breaks = [...names("br"), ...names("tab"), ...names("cr")]
  const blocks: TemplateBlock[] = [],
    stack: TemplateBlock[] = [],
    runs: { name: string; open: string; end: number }[] = []
  const xmlStack: string[] = [],
    rows: string[] = [],
    cells: { blocks: TemplateBlock[] }[] = []
  let active: {
      name: string
      block: TemplateBlock
      start: number
      content: number
      open: string
      runOpen?: string
      runPrefix?: string
    } | null = null,
    index = 0
  const location =
    kind === "pptx"
      ? `Slide ${part.match(/slide(\d+)/)?.[1] ?? ""}`
      : part.includes("header")
        ? "Đầu trang"
        : part.includes("footer")
          ? "Chân trang"
          : part.includes("footnotes")
            ? "Chú thích"
            : "Nội dung"
  for (const token of xml.matchAll(
    /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<(?:[^>"']|"[^"]*"|'[^']*')*>/g,
  )) {
    const raw = token[0],
      start = token.index!,
      end = start + raw.length,
      m = raw.match(/^<(\/?)([\w:.-]+)/)
    if (!m) continue
    const closing = !!m[1],
      name = m[2],
      self = /\/\s*>$/.test(raw)
    if (closing) {
      if (xmlStack.pop() !== name) throw Error("Mẫu có XML đóng/mở không khớp.")
    } else if (!self) xmlStack.push(name)
    if (names("tr").includes(name)) {
      if (closing) rows.pop()
      else if (!self) rows.push("")
    }
    if (names("tc").includes(name)) {
      if (!closing && !self) cells.push({ blocks: [] })
      else if (closing) {
        const cell = cells.pop()
        if (cell) {
          const label = cell.blocks
            .map((b) => b.text)
            .join(" ")
            .trim()
          if (label && rows.length) rows[rows.length - 1] = label.slice(0, 80)
          else
            for (const b of cell.blocks)
              if (!b.object) b.emptyHint = rows.at(-1) || "Ô trống"
        }
      }
    }
    if (active && closing && name === active.name) {
      const value = decode(xml.slice(active.content, start)),
        block = active.block
      block.segments.push({
        from: block.text.length,
        text: value,
        start: active.start,
        end,
        open: active.open,
        close: raw,
        runOpen: active.runOpen,
        runPrefix: active.runPrefix,
      })
      block.text += value
      active = null
      continue
    }
    if (pNames.includes(name)) {
      if (closing) {
        const b = stack.pop()
        if (b && b.insertAt === undefined) {
          b.insertAt = start
          b.insertPrefix = name.includes(":") ? name.split(":")[0] + ":" : ""
          b.insertRun = true
        }
        continue
      }
      const block: TemplateBlock = {
        id: `${part}:${index}`,
        part,
        index: index++,
        location: kind === "docx" ? `${location} · đoạn ${index}` : location,
        text: "",
        protected: false,
        linked: false,
        segments: [],
      }
      if (self) {
        block.insertAt = start
        block.insertPrefix = name.includes(":") ? name.split(":")[0] + ":" : ""
        block.insertRun = true
        block.selfParagraph = raw
      }
      blocks.push(block)
      cells.at(-1)?.blocks.push(block)
      if (!self) stack.push(block)
    }
    const block = stack.at(-1)
    if (!block) continue
    if (rNames.includes(name)) {
      if (closing) {
        const run = runs.pop()
        if (run && !block.text.trim() && block.insertAt === undefined) {
          block.insertAt = start
          block.insertPrefix = name.includes(":")
            ? name.split(":")[0] + ":"
            : ""
          block.insertRun = false
        }
      } else if (!self) runs.push({ name, open: raw, end })
      continue
    }
    if (!closing && names("rPr").includes(name) && !block.text.trim()) {
      const last = self ? end : xml.indexOf(`</${name}>`, end) + name.length + 3
      if (last >= end) block.emptyStyle = xml.slice(start, last)
    }
    if (
      !closing &&
      names("endParaRPr").includes(name) &&
      !block.text.trim() &&
      block.insertAt === undefined
    ) {
      const last = self ? end : xml.indexOf(`</${name}>`, end) + name.length + 3
      if (last >= end) {
        block.insertAt = start
        block.insertPrefix = name.includes(":") ? name.split(":")[0] + ":" : ""
        block.insertRun = true
        block.emptyStyle = xml.slice(start, last).replace(/endParaRPr/g, "rPr")
      }
    }
    if (
      !closing &&
      names("drawing").concat(names("pict"), names("object")).includes(name)
    )
      block.object = true
    if (
      !closing &&
      names("fldChar")
        .concat(names("instrText"), names("fld"), names("fldSimple"))
        .includes(name)
    )
      block.protected = true
    if (
      !closing &&
      names("hyperlink").concat(names("hlinkClick")).includes(name)
    )
      block.linked = true
    if (!closing && tNames.includes(name)) {
      if (self) continue
      const run = runs.at(-1)
      active = {
        name,
        block,
        start,
        content: end,
        open: raw,
        runOpen: run?.open,
        runPrefix: run ? xml.slice(run.end, start) : undefined,
      }
    }
    if (!closing && breaks.includes(name)) {
      const finish = self
        ? end
        : xml.indexOf(`</${name}>`, end) + name.length + 3
      if (finish < end) throw Error("Mẫu có ngắt dòng không hợp lệ.")
      const value = name.endsWith("tab") ? "\t" : "\n"
      block.segments.push({
        from: block.text.length,
        text: value,
        start,
        end: finish,
      })
      block.text += value
    }
  }
  if (active || stack.length || xmlStack.length)
    throw Error("Không đọc được cấu trúc đoạn trong mẫu.")
  return blocks.filter((b) => b.text.trim() || b.emptyHint)
}
export function scanTemplate(data: Uint8Array): TemplateModel {
  const files = checkedUnzip(data)
  const types =
    files["[Content_Types].xml"] && strFromU8(files["[Content_Types].xml"])
  if (!types || /macroEnabled|vbaProject/i.test(types))
    throw Error("Chọn mẫu Word .docx hoặc PowerPoint .pptx không có macro.")
  const kind: TemplateKind = files["word/document.xml"] ? "docx" : "pptx"
  const parts = Object.keys(files)
    .filter((n) =>
      kind === "docx"
        ? /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(
            n,
          )
        : /^ppt\/slides\/slide\d+\.xml$/.test(n),
    )
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  if (!parts.length)
    throw Error("Không thấy nội dung Word hoặc PowerPoint trong tệp.")
  const blocks = parts.flatMap((part) =>
    paragraphs(strFromU8(files[part]), part, kind),
  )
  if (!blocks.length)
    throw Error(
      "Mẫu này chưa có chữ để thay. Mẫu chỉ gồm ảnh cần bản Word/PowerPoint có chữ chỉnh được.",
    )
  const labels: Record<string, string> = {
    title: "Tiêu đề",
    author: "Tác giả",
    date: "Ngày",
    summary: "Tóm tắt",
    body: "Nội dung",
    name: "Họ tên",
    email: "Email",
    phone: "Số điện thoại",
    address: "Địa chỉ",
  }
  const slots: TemplateSlot[] = []
  for (const block of blocks.filter((b) => !b.protected)) {
    if (!block.text.trim() && block.emptyHint) {
      slots.push({
        id: `${block.id}@empty`,
        blockId: block.id,
        label: block.emptyHint.replace(/[:：]$/, ""),
        original: block.text,
        start: 0,
        end: block.text.length,
        source: "marker",
      })
      continue
    }
    for (const match of block.text.matchAll(
      /\{\{\s*([^{}\n]{1,80}?)\s*\}\}|_{3,}|\.{5,}|\[(?:điền|nhập|thêm|tên|họ tên|nội dung)[^\]\n]{0,100}\]/giu,
    )) {
      const start = match.index!,
        label =
          match[1]?.trim() ||
          block.text
            .slice(0, start)
            .split(/[\n:]/)
            .filter(Boolean)
            .at(-1)
            ?.trim()
            .slice(-60) ||
          "Nội dung mới"
      slots.push({
        id: `${block.id}@${start}`,
        blockId: block.id,
        label: labels[label.toLowerCase()] ?? label,
        original: match[0],
        start,
        end: start + match[0].length,
        source: "marker",
      })
    }
  }
  return { kind, blocks, slots }
}
export function suggestedSlots(
  model: TemplateModel,
  candidates: { blockId: string; quote: string; label: string }[],
  existing: TemplateSlot[] = model.slots,
): TemplateSlot[] {
  const result: TemplateSlot[] = []
  for (const candidate of candidates) {
    const block = model.blocks.find((b) => b.id === candidate.blockId)
    if (!block || block.protected || !candidate.quote?.trim()) continue
    const start = block.text.indexOf(candidate.quote),
      end = start + candidate.quote.length
    if (start < 0 || block.text.indexOf(candidate.quote, start + 1) >= 0)
      continue
    if (
      [...existing, ...result].some(
        (s) => s.blockId === block.id && s.start < end && s.end > start,
      )
    )
      continue
    result.push({
      id: `${block.id}@${start}`,
      blockId: block.id,
      label: candidate.label.trim().slice(0, 100) || "Nội dung mới",
      original: candidate.quote,
      start,
      end,
      source: "suggested",
    })
  }
  return result
}
export function templateBatches<T>(
  items: T[],
  maxChars = 17000,
  maxItems = 30,
): T[][] {
  const result: T[][] = []
  let group: T[] = [],
    size = 2
  for (const item of items) {
    const n = JSON.stringify(item).length + 1
    if (n > maxChars)
      throw Error(
        "Một đoạn trong mẫu quá dài để gửi AI. Bạn vẫn có thể sửa trực tiếp đoạn đó.",
      )
    if ((size + n > maxChars || group.length >= maxItems) && group.length) {
      result.push(group)
      group = []
      size = 2
    }
    group.push(item)
    size += n
  }
  if (group.length) result.push(group)
  return result
}
export function sourceChunks(text: string, max = 12000): string[] {
  const out: string[] = []
  let at = 0
  while (at < text.length) {
    let end = Math.min(text.length, at + max)
    if (end < text.length) {
      const split = text.lastIndexOf("\n", end)
      if (split > at + max / 2) end = split + 1
    }
    out.push(text.slice(at, end))
    at = end < text.length ? end - Math.min(300, Math.floor(max / 8)) : end
  }
  return out
}
export function groundedValues(
  candidates: { id: string; value: string; quote: string }[],
  slots: TemplateSlot[],
  source: string,
) {
  return candidates
    .filter(
      (c) =>
        slots.some((s) => s.id === c.id) &&
        c.value.trim() &&
        c.quote.trim().length >= 4 &&
        source.includes(c.quote),
    )
    .map((c) => ({ ...c, value: c.value.slice(0, 20000) }))
}
export function applyTemplate(
  data: Uint8Array,
  slots: TemplateSlot[],
  values: Record<string, string>,
) {
  const model = scanTemplate(data),
    files = checkedUnzip(data),
    changed: string[] = [],
    warnings: string[] = []
  const emptyEdits = new Map<TemplateBlock, string>()
  const edits = new Map<
      Segment,
      { from: number; to: number; value: string }[]
    >(),
    active: TemplateSlot[] = []
  for (const slot of slots) {
    if (!Object.hasOwn(values, slot.id) || values[slot.id] === slot.original)
      continue
    const block = model.blocks.find((b) => b.id === slot.blockId)
    if (
      !block ||
      block.protected ||
      slot.start < 0 ||
      slot.end > block.text.length ||
      block.text.slice(slot.start, slot.end) !== slot.original
    )
      throw Error("Vị trí thay không còn khớp với mẫu. Hãy tải lại mẫu.")
    if (
      active.some(
        (s) =>
          s.blockId === slot.blockId &&
          s.start < slot.end &&
          s.end > slot.start,
      )
    )
      throw Error(
        "Hai vùng thay đang chồng lên nhau. Giữ lại một vùng rồi thử lại.",
      )
    active.push(slot)
    if (block.linked)
      warnings.push(`${slot.label}: kiểm tra liên kết gốc sau khi thay chữ.`)
    const value = values[slot.id].replace(/\r\n?/g, "\n")
    if (
      value.length >
        Math.max(slot.original.length * 1.4, slot.original.length + 50) ||
      (value.match(/\n/g) || []).length >
        (slot.original.match(/\n/g) || []).length
    )
      warnings.push(
        `${slot.label}: nội dung dài hơn mẫu, có thể đổi ngắt dòng hoặc tràn ô.`,
      )
    if (
      !block.text.trim() &&
      block.emptyHint &&
      slot.start === 0 &&
      slot.end === block.text.length
    ) {
      emptyEdits.set(block, value)
      continue
    }
    let inserted = false
    for (const segment of block.segments) {
      const end = segment.from + segment.text.length
      if (segment.from >= slot.end || end <= slot.start) continue
      const list = edits.get(segment) ?? []
      list.push({
        from: Math.max(0, slot.start - segment.from),
        to: Math.min(segment.text.length, slot.end - segment.from),
        value: !inserted && segment.open ? value : "",
      })
      if (segment.open) inserted = true
      edits.set(segment, list)
    }
  }
  for (const part of new Set(
    active.map((s) => model.blocks.find((b) => b.id === s.blockId)!.part),
  )) {
    let xml = strFromU8(files[part])
    const patches: { start: number; end: number; text: string }[] = []
    for (const [block, value] of emptyEdits)
      if (block.part === part) {
        if (block.insertAt === undefined)
          throw Error("Không xác định được ô trống trong mẫu.")
        const p = block.insertPrefix ?? (model.kind === "docx" ? "w:" : "a:"),
          opening = `<${p}t xml:space="preserve">`,
          closing = `</${p}t>`
        const separator =
          model.kind === "docx"
            ? `${closing}<${p}br/>${opening}`
            : `${closing}</${p}r><${p}br/><${p}r>${block.emptyStyle ?? ""}${opening}`
        const content =
          opening + escape(value).replace(/\n/g, separator) + closing
        const run = block.insertRun
          ? `<${p}r>${block.emptyStyle ?? ""}${content}</${p}r>`
          : content
        patches.push({
          start: block.insertAt,
          end: block.insertAt + (block.selfParagraph?.length ?? 0),
          text: block.selfParagraph
            ? block.selfParagraph.replace(/\/\s*>$/, ">") + run + `</${p}p>`
            : run,
        })
      }
    for (const block of model.blocks.filter((b) => b.part === part))
      for (const segment of block.segments) {
        const substitutions = edits.get(segment)
        if (!substitutions) continue
        if (!segment.open) {
          patches.push({ ...segment, text: "" })
          continue
        }
        let text = segment.text
        for (const e of substitutions.sort((a, b) => b.from - a.from))
          text = text.slice(0, e.from) + e.value + text.slice(e.to)
        const opening = /\bxml:space=/.test(segment.open)
          ? segment.open
          : segment.open.replace(/>$/, ' xml:space="preserve">')
        const prefix = opening.match(/^<([\w.-]+:)?t\b/)?.[1] ?? ""
        const separator =
          model.kind === "docx"
            ? `${segment.close}<${prefix}br/>${opening}`
            : segment.runOpen
              ? `${segment.close}</${segment.runOpen.match(/^<([\w:.-]+)/)?.[1] ?? prefix + "r"}><${prefix}br/>${segment.runOpen}${segment.runPrefix ?? ""}${opening}`
              : "&#10;"
        patches.push({
          start: segment.start,
          end: segment.end,
          text:
            opening + escape(text).replace(/\n/g, separator) + segment.close,
        })
      }
    for (const patch of patches.sort((a, b) => b.start - a.start))
      xml = xml.slice(0, patch.start) + patch.text + xml.slice(patch.end)
    if (
      typeof DOMParser !== "undefined" &&
      new DOMParser()
        .parseFromString(xml, "application/xml")
        .querySelector("parsererror")
    )
      throw Error("Chưa tạo được bản thay hợp lệ. File mẫu gốc vẫn được giữ.")
    files[part] = strToU8(xml)
    changed.push(part)
  }
  return {
    bytes: changed.length ? zipSync(files, { level: 6 }) : data,
    audit: {
      changedParts: changed,
      keptParts: Object.keys(files).length - changed.length,
      replacements: active.length,
      warnings: [...new Set(warnings)],
    },
  }
}
