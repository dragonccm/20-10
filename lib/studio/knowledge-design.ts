import { blank, text, shape, type Design } from "./design"
import { uid } from "./storage"
import type { Note } from "./document-knowledge"
export function notesToSlides(title: string, notes: Note[]): Design[] {
  const deck = {
    id: uid(),
    name: title,
    source: "bloom" as const,
    revision: 1,
  }
  const cover = {
    ...blank(1920, 1080, title),
    deck,
    els: [
      text({
        text: title,
        x: 130,
        y: 210,
        w: 1650,
        h: 350,
        fontSize: 92,
        font: "serif",
      }),
      text({
        text: "Ý chính từ tài liệu của bạn · Có dẫn vị trí nguồn",
        x: 135,
        y: 780,
        w: 1650,
        h: 100,
        fontSize: 32,
        color: "#7c6b8b",
      }),
    ],
  }
  const paged = notes.flatMap((n) => {
    const parts: string[] = []
    for (let start = 0; start < n.text.length; start += 550)
      parts.push(n.text.slice(start, start + 550))
    return parts.map((text) => ({ ...n, text }))
  })
  return [
    cover,
    ...paged.map((n, i) => ({
      ...blank(1920, 1080, `${title} · ${i + 1}`),
      deck,
      els: [
        shape("rect", { x: 110, y: 140, w: 10, h: 650, fill: "#9177aa" }),
        text({
          text: `Ý chính ${i + 1}`,
          x: 160,
          y: 130,
          w: 1600,
          h: 110,
          fontSize: 56,
          color: "#806391",
        }),
        text({
          text: n.text,
          x: 160,
          y: 290,
          w: 1590,
          h: 480,
          fontSize: n.text.length > 450 ? 34 : 44,
          weight: 400,
        }),
        text({
          text: n.evidence
            .map(
              (e) => `Nguồn: trang/phần ${e.page} — ${e.quote.slice(0, 100)}`,
            )
            .join("\n"),
          x: 160,
          y: 840,
          w: 1590,
          h: 170,
          fontSize: 22,
          color: "#7b7482",
          weight: 400,
        }),
      ],
    })),
  ]
}
export function notesToMindmaps(
  title: string,
  sections: { heading: string; notes: Note[] }[],
): Design[] {
  const rows = sections.flatMap((s) =>
      s.notes.map((n) => ({ heading: s.heading, note: n })),
    ),
    boards: Design[] = []
  for (let offset = 0; offset < rows.length; offset += 12) {
    const slice = rows.slice(offset, offset + 12),
      height = Math.max(1000, slice.length * 215 + 160),
      els: Design["els"] = []
    const top = (height - slice.length * 215) / 2
    const line = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1,
        dy = y2 - y1,
        length = Math.hypot(dx, dy)
      els.push(
        shape("rect", {
          x: (x1 + x2 - length) / 2,
          y: (y1 + y2) / 2,
          w: length,
          h: 3,
          rot: (Math.atan2(dy, dx) * 180) / Math.PI,
          fill: "#bca8ce",
          radius: 0,
        }),
      )
    }
    const groups = [...new Set(slice.map((r) => r.heading))]
    for (const heading of groups) {
      const indexes = slice.flatMap((r, i) =>
          r.heading === heading ? [i] : [],
        ),
        y = ((indexes[0] + indexes.at(-1)!) / 2) * 215 + top
      line(560, height / 2, 680, y + 95)
      for (const i of indexes) line(1130, y + 95, 1230, top + i * 215 + 95)
    }
    els.push(
      shape("rect", {
        x: 60,
        y: height / 2 - 110,
        w: 500,
        h: 220,
        fill: "#9177aa",
        radius: 25,
      }),
      text({
        text: title.slice(0, 110),
        x: 90,
        y: height / 2 - 80,
        w: 440,
        h: 175,
        fontSize: 34,
        color: "#ffffff",
      }),
    )
    for (const heading of groups) {
      const indexes = slice.flatMap((r, i) =>
          r.heading === heading ? [i] : [],
        ),
        y = ((indexes[0] + indexes.at(-1)!) / 2) * 215 + top
      els.push(
        shape("rect", {
          x: 680,
          y,
          w: 450,
          h: 190,
          fill: "#eee6f5",
          radius: 20,
        }),
        text({
          text: heading.slice(0, 110),
          x: 705,
          y: y + 22,
          w: 400,
          h: 155,
          fontSize: 30,
        }),
      )
    }
    slice.forEach((r, i) => {
      const y = top + i * 215
      els.push(
        shape("rect", {
          x: 1230,
          y,
          w: 1070,
          h: 190,
          fill: "#ffffff",
          radius: 16,
        }),
        text({
          text:
            r.note.text.length > 210
              ? r.note.text.slice(0, 207) + "…"
              : r.note.text,
          x: 1255,
          y: y + 18,
          w: 1020,
          h: 130,
          fontSize: 26,
          weight: 400,
        }),
        text({
          text:
            "Nguồn: " +
            r.note.evidence.map((e) => "trang/phần " + e.page).join(", "),
          x: 1255,
          y: y + 155,
          w: 1020,
          h: 30,
          fontSize: 18,
          color: "#886998",
        }),
      )
    })
    boards.push({
      ...blank(2400, height, `${title} · sơ đồ ${boards.length + 1}`),
      els,
    })
  }
  return boards
}
