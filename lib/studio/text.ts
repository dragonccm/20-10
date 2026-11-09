import { escapeHtml } from "./storage"

export function textStats(text: string) {
  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const sentences = trimmed ? trimmed.split(/[.!?。？！]+(?:\s|$)/).filter((s) => s.trim()).length : 0
  const paragraphs = trimmed ? trimmed.split(/\n+/).filter((s) => s.trim()).length : 0
  return {
    words,
    chars: text.replace(/\n/g, "").length,
    charsNoSpace: text.replace(/\s/g, "").length,
    sentences,
    paragraphs,
    readingMin: Math.max(1, Math.round(words / 200)),
    avgSentence: sentences ? Math.round(words / sentences) : 0,
  }
}

/** Plain text / simple Markdown -> safe HTML paragraphs. */
export function textToHtml(text: string) {
  const lines = text.replace(/\r/g, "").split(/\n/)
  const out: string[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) out.push(`<ul>${list.map((l) => `<li>${l}</li>`).join("")}</ul>`)
    list = []
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    const inline = (s: string) =>
      escapeHtml(s)
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
        .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<i>$2</i>")
    if (/^[-*•]\s+/.test(line)) {
      list.push(inline(line.replace(/^[-*•]\s+/, "")))
      continue
    }
    flush()
    if (/^#{1,2}\s+/.test(line)) out.push(`<h2>${inline(line.replace(/^#+\s+/, ""))}</h2>`)
    else if (/^#{3,6}\s+/.test(line)) out.push(`<h3>${inline(line.replace(/^#+\s+/, ""))}</h3>`)
    else if (/^>\s?/.test(line)) out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`)
    else out.push(`<p>${inline(line)}</p>`)
  }
  flush()
  return out.join("")
}

/** Editor HTML -> Markdown. */
export function htmlToMarkdown(html: string) {
  const root = document.createElement("div")
  root.innerHTML = html
  const inline = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? ""
    if (!(n instanceof HTMLElement)) return ""
    const c = Array.from(n.childNodes).map(inline).join("")
    switch (n.tagName) {
      case "B":
      case "STRONG":
        return c.trim() ? `**${c}**` : c
      case "I":
      case "EM":
        return c.trim() ? `*${c}*` : c
      case "BR":
        return "\n"
      default:
        return c
    }
  }
  const blocks: string[] = []
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      if (n.textContent?.trim()) blocks.push(n.textContent.trim())
      return
    }
    if (!(n instanceof HTMLElement)) return
    switch (n.tagName) {
      case "H1":
      case "H2":
        blocks.push(`## ${inline(n).trim()}`)
        break
      case "H3":
      case "H4":
        blocks.push(`### ${inline(n).trim()}`)
        break
      case "UL":
        blocks.push(Array.from(n.children).map((li) => `- ${inline(li).trim()}`).join("\n"))
        break
      case "OL":
        blocks.push(Array.from(n.children).map((li, i) => `${i + 1}. ${inline(li).trim()}`).join("\n"))
        break
      case "BLOCKQUOTE":
        blocks.push(`> ${inline(n).trim()}`)
        break
      case "P":
      case "DIV":
        if (n.querySelector("p,div,ul,ol,h2,h3,blockquote")) Array.from(n.childNodes).forEach(walk)
        else if (inline(n).trim()) blocks.push(inline(n).trim())
        break
      default:
        if (inline(n).trim()) blocks.push(inline(n).trim())
    }
  }
  Array.from(root.childNodes).forEach(walk)
  return blocks.join("\n\n") + "\n"
}

/** Find `needle` across text nodes of `root` and replace it with plain text. Returns false if not found. */
export function replaceInElement(root: HTMLElement, needle: string, replacement: string) {
  if (!needle) return false
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let full = ""
  while (walker.nextNode()) {
    const t = walker.currentNode as Text
    nodes.push(t)
    full += t.data
  }
  const idx = full.indexOf(needle)
  if (idx < 0) return false
  const locate = (offset: number, isEnd: boolean) => {
    let acc = 0
    for (const node of nodes) {
      const len = node.data.length
      if (offset < acc + len || (isEnd && offset === acc + len)) return { node, off: offset - acc }
      acc += len
    }
    const last = nodes[nodes.length - 1]
    return { node: last, off: last.data.length }
  }
  const s = locate(idx, false)
  const e = locate(idx + needle.length, true)
  const range = document.createRange()
  range.setStart(s.node, s.off)
  range.setEnd(e.node, e.off)
  range.deleteContents()
  range.insertNode(document.createTextNode(replacement))
  root.normalize()
  return true
}

export function normalizeLatin(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
}
