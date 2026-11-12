import { unzipSync, zipSync, strFromU8, strToU8, type Unzipped } from "fflate"
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
const XML = "http://www.w3.org/XML/1998/namespace"
export function checkedUnzip(data: Uint8Array): Unzipped {
  let total = 0,
    count = 0
  return unzipSync(data, {
    filter: (entry) => {
      total += entry.originalSize
      if (total > 100 * 1024 * 1024 || ++count > 10000)
        throw Error("Tệp giải nén quá lớn để xử lý an toàn trên trình duyệt.")
      return true
    },
  })
}
const parse = (value: string) => {
  const doc = new DOMParser().parseFromString(value, "application/xml")
  if (doc.querySelector("parsererror")) throw Error("Tệp Word có XML bị lỗi.")
  return doc
}
export function templateFields(data: Uint8Array) {
  const files = checkedUnzip(data),
    fields = new Set<string>()
  for (const [name, bytes] of Object.entries(files)) {
    if (!/^word\/(document|header\d+|footer\d+)\.xml$/.test(name)) continue
    const doc = parse(strFromU8(bytes))
    for (const paragraph of Array.from(doc.getElementsByTagNameNS(W, "p"))) {
      const text = Array.from(paragraph.getElementsByTagNameNS(W, "t"))
        .map((t) => t.textContent || "")
        .join("")
      for (const m of text.matchAll(
        /\{\{\s*([\p{L}\p{N}_. -]{1,64}?)\s*\}\}/gu,
      ))
        fields.add(m[1].trim())
    }
  }
  return [...fields]
}
export function fillWordTemplate(
  data: Uint8Array,
  values: Record<string, string>,
): Uint8Array {
  const files = checkedUnzip(data)
  for (const [name, bytes] of Object.entries(files)) {
    if (!/^word\/(document|header\d+|footer\d+)\.xml$/.test(name)) continue
    const doc = parse(strFromU8(bytes))
    for (const paragraph of Array.from(doc.getElementsByTagNameNS(W, "p"))) {
      const nodes = Array.from(paragraph.getElementsByTagNameNS(W, "t")),
        starts: number[] = []
      let text = ""
      for (const node of nodes) {
        starts.push(text.length)
        text += node.textContent || ""
      }
      for (const match of [
        ...text.matchAll(/\{\{\s*([\p{L}\p{N}_. -]{1,64}?)\s*\}\}/gu),
      ].reverse()) {
        const key = match[1].trim()
        if (!Object.hasOwn(values, key)) continue
        for (const link of Array.from(
          paragraph.getElementsByTagNameNS(W, "hyperlink"),
        )) {
          if ((link.textContent || "").includes(match[0]))
            link.replaceWith(...Array.from(link.childNodes))
        }
        const start = match.index!,
          end = start + match[0].length,
          first = starts.findIndex(
            (s, i) => s + (nodes[i].textContent || "").length > start,
          ),
          last = starts.findIndex(
            (s, i) => s + (nodes[i].textContent || "").length >= end,
          )
        if (first < 0 || last < first) continue
        const prefix = (nodes[first].textContent || "").slice(
            0,
            start - starts[first],
          ),
          suffix = (nodes[last].textContent || "").slice(end - starts[last]),
          lines = String(values[key]).replace(/\r/g, "").split("\n")
        nodes[first].textContent =
          prefix +
          lines[0] +
          (first === last && lines.length === 1 ? suffix : "")
        nodes[first].setAttributeNS(XML, "xml:space", "preserve")
        if (last > first) {
          for (let i = first + 1; i < last; i++) nodes[i].textContent = ""
          nodes[last].textContent = suffix
        }
        let anchor: Node = nodes[first]
        for (let i = 1; i < lines.length; i++) {
          const br = doc.createElementNS(W, "w:br"),
            t = doc.createElementNS(W, "w:t")
          t.setAttributeNS(XML, "xml:space", "preserve")
          t.textContent =
            lines[i] + (first === last && i === lines.length - 1 ? suffix : "")
          anchor.parentNode!.insertBefore(br, anchor.nextSibling)
          anchor.parentNode!.insertBefore(t, br.nextSibling)
          anchor = t
        }
      }
    }
    files[name] = strToU8(new XMLSerializer().serializeToString(doc))
  }
  return zipSync(files, { level: 6 })
}
export type WordFormat = {
  font: string
  size: number
  marginCm: number
  line: number
}
const esc = (s: string) =>
  s
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
/** Genuine OOXML DOCX, not HTML renamed to .doc. */
export function htmlToDocx(
  html: string,
  format: WordFormat = {
    font: "Times New Roman",
    size: 13,
    marginCm: 2,
    line: 1.5,
  },
): Uint8Array {
  const font = esc(format.font),
    size = Math.max(9, Math.min(24, format.size)) * 2,
    margin = Math.round(Math.max(1, Math.min(4, format.marginCm)) * 567),
    line = Math.round(Math.max(1, Math.min(2.5, format.line)) * 240)
  const dom = new DOMParser().parseFromString(html, "text/html")
  const runs = (node: Node, bold = false, italic = false): string => {
    if (node.nodeType === 3)
      return `<w:r><w:rPr>${bold ? "<w:b/>" : ""}${italic ? "<w:i/>" : ""}</w:rPr><w:t xml:space="preserve">${esc(node.textContent || "")}</w:t></w:r>`
    const el = node as Element
    if (el.tagName === "BR") return "<w:r><w:br/></w:r>"
    return Array.from(node.childNodes)
      .map((c) =>
        runs(
          c,
          bold || /^(B|STRONG|TH)$/.test(el.tagName),
          italic || /^(I|EM)$/.test(el.tagName),
        ),
      )
      .join("")
  }
  const para = (el: Element, extra = "") =>
    `<w:p><w:pPr>${/^H[1-6]$/.test(el.tagName) ? `<w:pStyle w:val="Heading${Math.min(2, Number(el.tagName[1]))}"/>` : ""}${extra}</w:pPr>${runs(el)}</w:p>`
  const block = (el: Element): string => {
    if (el.tagName === "TABLE")
      return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map((k) => `<w:${k} w:val="single" w:sz="4" w:color="BBBBBB"/>`).join("")}</w:tblBorders></w:tblPr>${Array.from(
        el.querySelectorAll("tr"),
      )
        .map(
          (tr) =>
            `<w:tr>${Array.from(tr.children)
              .map(
                (td) =>
                  `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${renderChildren(td) || "<w:p/>"}</w:tc>`,
              )
              .join("")}</w:tr>`,
        )
        .join("")}</w:tbl>`
    if (/^(UL|OL)$/.test(el.tagName))
      return Array.from(el.children)
        .map(
          (li, i) =>
            `<w:p><w:pPr><w:ind w:left="360" w:hanging="180"/></w:pPr><w:r><w:t>${el.tagName === "UL" ? "•" : i + 1 + "."} </w:t></w:r>${runs(li)}</w:p>`,
        )
        .join("")
    if (
      el.tagName === "DIV" &&
      Array.from(el.children).some((c) =>
        /^(P|H[1-6]|TABLE|UL|OL|DIV)$/.test(c.tagName),
      )
    )
      return renderChildren(el)
    return para(el)
  }
  const renderChildren = (parent: Element): string => {
    let out = "",
      inline: Node[] = []
    const flush = () => {
      if (!inline.length) return
      const p = dom.createElement("p")
      for (const n of inline) p.append(n.cloneNode(true))
      if (p.textContent?.trim() || p.querySelector("br")) out += para(p)
      inline = []
    }
    for (const node of Array.from(parent.childNodes)) {
      if (
        node.nodeType === 1 &&
        /^(P|H[1-6]|TABLE|UL|OL|DIV|BLOCKQUOTE)$/.test(
          (node as Element).tagName,
        )
      ) {
        flush()
        out += block(node as Element)
      } else inline.push(node)
    }
    flush()
    return out
  }
  const body = renderChildren(dom.body) || "<w:p/>"

  const styles = `<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:eastAsia="${font}"/><w:sz w:val="${size}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="${line}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${[1, 2].map((i) => `<w:style w:type="paragraph" w:styleId="Heading${i}"><w:name w:val="heading ${i}"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="${i === 1 ? 36 : 30}"/></w:rPr></w:style>`).join("")}</w:styles>`
  const contentTypes =
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'
  return zipSync(
    {
      "[Content_Types].xml": strToU8(contentTypes),
      "_rels/.rels": strToU8(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      ),
      "word/_rels/document.xml.rels": strToU8(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      ),
      "word/styles.xml": strToU8(styles),
      "word/document.xml": strToU8(
        `<w:document xmlns:w="${W}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="708" w:footer="708"/></w:sectPr></w:body></w:document>`,
      ),
    },
    { level: 6 },
  )
}

export function wordParagraphs(data: Uint8Array) {
  const files = checkedUnzip(data)
  if (!files["word/document.xml"]) throw Error("Không thấy nội dung Word.")
  const doc = parse(strFromU8(files["word/document.xml"]))
  return Array.from(doc.getElementsByTagNameNS(W, "p"))
    .map((p, index) => ({
      index,
      text: Array.from(p.getElementsByTagNameNS(W, "t"))
        .map((n) => n.textContent || "")
        .join(""),
    }))
    .filter((p) => p.text.trim())
}
export function fillWordParagraphs(
  data: Uint8Array,
  replacements: Record<number, string>,
) {
  const files = checkedUnzip(data)
  if (!files["word/document.xml"]) throw Error("Không thấy nội dung Word.")
  const doc = parse(strFromU8(files["word/document.xml"])),
    paragraphs = Array.from(doc.getElementsByTagNameNS(W, "p"))
  for (const [index, value] of Object.entries(replacements)) {
    const p = paragraphs[Number(index)]
    if (!p) throw Error("Vị trí trong mẫu đã thay đổi.")
    for (const link of Array.from(p.getElementsByTagNameNS(W, "hyperlink")))
      link.replaceWith(...Array.from(link.childNodes))
    const nodes = Array.from(p.getElementsByTagNameNS(W, "t"))
    if (!nodes.length) continue
    for (const n of nodes) n.textContent = ""
    let anchor: Node = nodes[0]
    const lines = value.replace(/\r/g, "").split("\n")
    nodes[0].textContent = lines[0]
    nodes[0].setAttributeNS(XML, "xml:space", "preserve")
    for (const line of lines.slice(1)) {
      const br = doc.createElementNS(W, "w:br"),
        t = doc.createElementNS(W, "w:t")
      t.textContent = line
      t.setAttributeNS(XML, "xml:space", "preserve")
      anchor.parentNode!.insertBefore(br, anchor.nextSibling)
      anchor.parentNode!.insertBefore(t, br.nextSibling)
      anchor = t
    }
  }
  files["word/document.xml"] = strToU8(
    new XMLSerializer().serializeToString(doc),
  )
  return zipSync(files, { level: 6 })
}
