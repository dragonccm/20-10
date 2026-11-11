"use client"

import type React from "react"

import { CV_THEMES, EMPTY_CV, SAMPLE_CV } from "@/lib/studio/cv-data"
import type { Lang, Edu, Exp, Proj, Lng, CvLayout, CvTheme, CV } from "@/lib/studio/cv-data"
export { CV_THEMES, EMPTY_CV, SAMPLE_CV } from "@/lib/studio/cv-data"
export type { Lang, Edu, Exp, Proj, Lng, CvLayout, CvTheme, CV } from "@/lib/studio/cv-data"

/* ---------- Validation for AI-made themes ---------- */

const HEX = /^#([0-9a-f]{6})$/i
const lum = (h: string) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}
const readable = (fg: string, bg: string, min = 4) => (contrast(fg, bg) >= min ? fg : lum(bg) > 0.4 ? "#1e293b" : "#ffffff")

export function sanitizeTheme(raw: unknown, fallback: CvTheme): CvTheme | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const pick = <T extends string>(v: unknown, opts: readonly T[], fb: T) => (opts.includes(v as T) ? (v as T) : fb)
  const col = (v: unknown, fb: string) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : fb)
  const paper = col(r.paper, "#ffffff")
  const panel = col(r.panel, fallback.panel)
  const t: CvTheme = {
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 40) : "Mẫu AI",
    layout: pick(r.layout, ["classic","banner","sidebar","executive","timeline","minimal","split","korean","cards","folio","compact","letterhead","academic","magazine","project","skills-first","dossier","dashboard","research","profile"] as const, fallback.layout),
    side: pick(r.side, ["left", "right"] as const, "left"),
    paper: lum(paper) > 0.6 ? paper : "#ffffff",
    ink: "",
    accent: "",
    panel,
    panel2: col(r.panel2, panel),
    panelInk: "",
    font: pick(r.font, ["sans", "serif", "mix"] as const, fallback.font),
    heading: pick(r.heading, ["underline", "bar", "pill", "caps", "dot"] as const, fallback.heading),
    density: pick(r.density, ["compact", "normal", "airy"] as const, "normal"),
    photo: pick(r.photo, ["none", "circle", "rounded", "square"] as const, fallback.photo),
    skills: pick(r.skills, ["tags", "list", "text"] as const, fallback.skills),
  }
  t.ink = readable(col(r.ink, "#1e293b"), t.paper, 7)
  t.accent = readable(col(r.accent, fallback.accent), t.paper, 3)
  t.panelInk = readable(col(r.panelInk, fallback.panelInk), t.panel, 4.5)
  return t
}

/* ---------- Rendering (inline styles so the same markup prints identically) ---------- */

const SANS = "'Segoe UI', 'Noto Sans', 'Noto Sans KR', Arial, sans-serif"
const SERIF = "Georgia, 'Noto Serif', 'Noto Serif KR', 'Times New Roman', serif"

const HEADINGS: Record<Lang, Record<string, string>> = {
  vi: { summary: "Giới thiệu", education: "Học vấn", experience: "Kinh nghiệm", projects: "Dự án", skills: "Kỹ năng", languages: "Ngoại ngữ", certificates: "Chứng chỉ", contact: "Liên hệ", present: "nay", resume: "SƠ YẾU LÝ LỊCH", name: "Họ tên", position: "Vị trí", email: "Email", phone: "Điện thoại", address: "Địa chỉ" },
  en: { summary: "Profile", education: "Education", experience: "Experience", projects: "Projects", skills: "Skills", languages: "Languages", certificates: "Certificates", contact: "Contact", present: "Present", resume: "RÉSUMÉ", name: "Name", position: "Position", email: "Email", phone: "Phone", address: "Address" },
  ko: { summary: "자기소개", education: "학력", experience: "경력", projects: "프로젝트", skills: "보유 기술", languages: "어학 능력", certificates: "자격증", contact: "연락처", present: "현재", resume: "이 력 서", name: "성명", position: "지원 분야", email: "이메일", phone: "연락처", address: "주소" },
}

export function themeOf(cv: CV): CvTheme {
  return cv.theme ?? { ...CV_THEMES[0], accent: cv.accent }
}

export function CvPreview({ cv, theme: t0 }: { cv: CV; theme?: CvTheme }) {
  const t = t0 ?? themeOf(cv)
  const h = HEADINGS[cv.lang]
  const d = { compact: { pad: 36, fs: 11.5, gap: 14 }, normal: { pad: 46, fs: 12.5, gap: 18 }, airy: { pad: 56, fs: 13, gap: 24 } }[t.density]
  const bodyFont = t.font === "serif" ? SERIF : SANS
  const headFont = t.font === "sans" ? SANS : SERIF
  const panelBg = t.panel2 && t.panel2 !== t.panel ? `linear-gradient(160deg, ${t.panel}, ${t.panel2})` : t.panel
  const muted = mix(t.ink, t.paper, 0.35)
  const period = (a: string, b: string) => [a, b || (a ? h.present : "")].filter(Boolean).join(" – ")
  const contact = [cv.email, cv.phone, cv.location, cv.link].filter(Boolean)
  const certs = cv.certificates.split("\n").filter((c) => c.trim())
  const skills = cv.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const showPhoto = !!cv.photo && t.photo !== "none"

  const H = ({ children, onPanel }: { children: React.ReactNode; onPanel?: boolean }) => {
    const c = onPanel ? t.panelInk : t.accent
    const common: React.CSSProperties = { fontFamily: headFont, color: c, margin: `${d.gap}px 0 ${Math.round(d.gap / 2)}px`, fontWeight: 700 }
    if (t.heading === "pill")
      return (
        <div style={{ ...common }}>
          <span style={{ display: "inline-block", background: onPanel ? t.panelInk : t.accent, color: onPanel ? t.panel : "#fff", borderRadius: 999, padding: "3px 12px", fontSize: d.fs, letterSpacing: 1, textTransform: "uppercase" }}>{children}</span>
        </div>
      )
    if (t.heading === "bar") return <div style={{ ...common, fontSize: d.fs + 3, borderLeft: `4px solid ${c}`, paddingLeft: 8, lineHeight: 1.2 }}>{children}</div>
    if (t.heading === "caps")
      return (
        <div style={{ ...common, display: "flex", alignItems: "center", gap: 10, fontSize: d.fs, letterSpacing: 3, textTransform: "uppercase" }}>
          <span style={{ whiteSpace: "nowrap" }}>{children}</span>
          <span style={{ flex: 1, height: 1, background: `${c}55` }} />
        </div>
      )
    if (t.heading === "dot")
      return (
        <div style={{ ...common, display: "flex", alignItems: "center", gap: 8, fontSize: d.fs + 2.5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: c, display: "inline-block" }} />
          {children}
        </div>
      )
    return <div style={{ ...common, fontSize: d.fs + 0.5, letterSpacing: 1.5, textTransform: "uppercase", borderBottom: `1.5px solid ${c}40`, paddingBottom: 4 }}>{children}</div>
  }

  const Photo = ({ size, onPanel }: { size: number; onPanel?: boolean }) =>
    showPhoto ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cv.photo}
        alt=""
        style={{
          width: size,
          height: t.photo === "square" ? Math.round(size * 1.3) : size,
          objectFit: "cover",
          borderRadius: t.photo === "circle" ? "50%" : t.photo === "rounded" ? 16 : 2,
          border: `3px solid ${onPanel ? t.panelInk + "66" : "#ffffff"}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          flexShrink: 0,
          display: "block",
        }}
      />
    ) : null

  const Row = ({ left, right }: { left: React.ReactNode; right?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span>{left}</span>
      {right && <span style={{ color: muted, whiteSpace: "nowrap" }}>{right}</span>}
    </div>
  )

  const timeline = t.layout === "timeline"
  const Entry = ({ children }: { children: React.ReactNode }) =>
    timeline ? (
      <div style={{ position: "relative", paddingLeft: 22, paddingBottom: 12, borderLeft: `2px solid ${t.accent}33`, marginLeft: 5 }}>
        <span style={{ position: "absolute", left: -7, top: 3, width: 12, height: 12, borderRadius: 99, background: t.paper, border: `3px solid ${t.accent}` }} />
        {children}
      </div>
    ) : (
      <div style={{ marginBottom: 11 }}>{children}</div>
    )

  const Summary = () =>
    cv.summary ? (
      <>
        <H>{h.summary}</H>
        <div style={{ whiteSpace: "pre-wrap" }}>{cv.summary}</div>
      </>
    ) : null
  const Experience = () =>
    cv.experience.length ? (
      <>
        <H>{h.experience}</H>
        {cv.experience.map((e) => (
          <Entry key={e.id}>
            <Row
              left={
                <>
                  <strong>{e.role}</strong>
                  {e.org && <span style={{ color: muted }}>{e.role ? " · " : ""}{e.org}</span>}
                </>
              }
              right={period(e.from, e.to)}
            />
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {e.bullets
                .split("\n")
                .filter((b) => b.trim())
                .map((b, i) => (
                  <li key={i}>{b.replace(/^[-•*]\s*/, "")}</li>
                ))}
            </ul>
          </Entry>
        ))}
      </>
    ) : null
  const Education = () =>
    cv.education.length ? (
      <>
        <H>{h.education}</H>
        {cv.education.map((e) => (
          <Entry key={e.id}>
            <Row left={<strong>{e.school}</strong>} right={period(e.from, e.to)} />
            {e.degree && <div>{e.degree}</div>}
            {e.detail && <div style={{ color: muted }}>{e.detail}</div>}
          </Entry>
        ))}
      </>
    ) : null
  const Projects = () =>
    cv.projects.length ? (
      <>
        <H>{h.projects}</H>
        {cv.projects.map((p) => (
          <div key={p.id} style={{ marginBottom: 8 }}>
            <strong>{p.name}</strong>
            {p.detail && <div style={{ color: muted, whiteSpace: "pre-wrap" }}>{p.detail}</div>}
          </div>
        ))}
      </>
    ) : null
  const Languages = ({ onPanel }: { onPanel?: boolean }) =>
    cv.languages.length ? (
      <>
        <H onPanel={onPanel}>{h.languages}</H>
        {cv.languages.map((l) => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{l.name}</span>
            <span style={{ opacity: 0.75 }}>{l.level}</span>
          </div>
        ))}
      </>
    ) : null
  const Skills = ({ onPanel }: { onPanel?: boolean }) =>
    skills.length ? (
      <>
        <H onPanel={onPanel}>{h.skills}</H>
        {t.skills === "tags" ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {skills.map((s) => (
              <span key={s} style={{ padding: "2px 10px", borderRadius: 999, background: onPanel ? `${t.panelInk}22` : `${t.accent}14`, color: onPanel ? t.panelInk : t.accent, fontSize: d.fs - 0.5 }}>
                {s}
              </span>
            ))}
          </div>
        ) : t.skills === "list" ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <div>{skills.join("  ·  ")}</div>
        )}
      </>
    ) : null
  const Certificates = ({ onPanel }: { onPanel?: boolean }) =>
    certs.length ? (
      <>
        <H onPanel={onPanel}>{h.certificates}</H>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {certs.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </>
    ) : null

  const page: React.CSSProperties = { width: 794, minHeight: 1123, background: t.paper, boxSizing: "border-box", fontFamily: bodyFont, color: t.ink, fontSize: d.fs, lineHeight: 1.55 }
  const Name = ({ size = 30, color = t.ink, align }: { size?: number; color?: string; align?: "center" }) => (
    <>
      <div style={{ fontFamily: headFont, fontSize: size, fontWeight: 700, lineHeight: 1.15, color, textAlign: align }}>{cv.name || "Họ và tên"}</div>
      {cv.title && <div style={{ fontSize: d.fs + 2.5, color: color === t.ink ? t.accent : color, opacity: color === t.ink ? 1 : 0.9, marginTop: 4, textAlign: align }}>{cv.title}</div>}
    </>
  )
  const Bottom = () => (
    <div style={{ display: "flex", gap: 32 }}>
      <div style={{ flex: 1 }}>
        <Languages />
      </div>
      <div style={{ flex: 1 }}>
        <Skills />
      </div>
    </div>
  )

  const Contact = () => <div style={{ fontSize: d.fs - .5, overflowWrap: "anywhere" }}>{contact.map(c => <div key={c}>{c}</div>)}</div>
  const Header = ({dark=false,center=false,large=false}:{dark?:boolean;center?:boolean;large?:boolean}) => <div style={{padding:large?"44px 42px":"24px 34px",background:dark?t.ink:panelBg,color:dark?t.paper:t.panelInk,textAlign:center?"center":"left",display:"flex",flexDirection:center?"column":"row",alignItems:"center",gap:22}}><Photo size={large?120:84}/><div style={{flex:1}}><Name size={large?44:32} color={dark?t.paper:t.panelInk} align={center?"center":undefined}/><div style={{marginTop:12}}><Contact/></div></div></div>
  const body = {padding:"20px 40px 40px"} as React.CSSProperties
  const two = {display:"grid",gridTemplateColumns:"1fr 1fr",gap:28} as React.CSSProperties
  const box = {padding:"4px 22px 20px",background:t.panel,color:t.panelInk} as React.CSSProperties
  // Authored document compositions; section placement changes with the use case.
  if(t.layout==="executive")return <div style={page}><Header dark large/><div style={{...body,display:"grid",gridTemplateColumns:"235px 1fr",gap:30}}><aside><Summary/><Skills/><Languages/><Certificates/></aside><main><Experience/><Projects/><Education/></main></div></div>
  if(t.layout==="cards")return <div style={{...page,padding:32}}><Header center/><div style={{...two,marginTop:24}}><section style={box}><Summary/></section><section style={box}><Education/></section><section style={box}><Experience/></section><section style={box}><Projects/></section><section style={box}><Skills/><Languages/></section><section style={box}><Certificates/></section></div></div>
  if(t.layout==="folio")return <div style={page}><div style={{display:"flex",minHeight:265}}><div style={{width:95,background:t.accent}}/><div style={{flex:1,padding:"55px 40px",background:t.ink}}><Name size={46} color={t.paper}/><div style={{color:t.paper,marginTop:24}}><Contact/></div></div></div><div style={{...body,display:"grid",gridTemplateColumns:"1fr 205px",gap:35}}><main><Summary/><Projects/><Experience/></main><aside><Skills/><Education/><Languages/><Certificates/></aside></div></div>
  if(t.layout==="compact")return <div style={{...page,padding:"32px 42px"}}><div style={{display:"flex",justifyContent:"space-between",borderBottom:`5px solid ${t.accent}`,paddingBottom:18}}><Name size={30}/><Contact/></div><Summary/><div style={two}><section><Experience/><Skills/><Languages/></section><section><Education/><Projects/><Certificates/></section></div></div>
  if(t.layout==="letterhead")return <div style={{...page,padding:"48px 55px"}}><div style={{display:"grid",gridTemplateColumns:"1fr 200px",gap:25}}><Name size={42}/><Contact/></div><div style={{height:1,background:t.accent,marginTop:30}}/><Summary/><div style={{borderTop:`1px solid ${t.accent}`,marginTop:30}}><Experience/></div><Education/><Projects/><Bottom/><Certificates/></div>
  if(t.layout==="academic")return <div style={{...page,padding:"50px 65px"}}><div style={{textAlign:"center",borderBottom:`2px solid ${t.ink}`,paddingBottom:25}}><Name size={36} align="center"/><div style={{marginTop:12}}>{contact.join(" · ")}</div></div><Education/><Summary/><Experience/><Projects/><div style={{...two,borderTop:`1px solid ${t.accent}`,marginTop:20}}><div><Languages/><Skills/></div><Certificates/></div></div>
  if(t.layout==="magazine")return <div style={page}><div style={{padding:"40px 42px 28px",borderBottom:`18px solid ${t.accent}`}}><small style={{letterSpacing:4,color:t.accent}}>PORTFOLIO / RÉSUMÉ</small><div style={{marginTop:30}}><Name size={58}/></div></div><div style={{...body,...two,gridTemplateColumns:"1fr 1.65fr"}}><aside><Photo size={165}/><div style={{marginTop:20}}><Contact/></div><Summary/><Languages/></aside><main><Projects/><Experience/><Education/><Skills/><Certificates/></main></div></div>
  if(t.layout==="project")return <div style={page}><Header/><div style={body}><Summary/><div style={{background:t.panel,padding:"2px 22px 18px",marginTop:22}}><Projects/></div><div style={{...two,gridTemplateColumns:"1.8fr 1fr"}}><main><Experience/><Education/></main><aside><Skills/><Languages/><Certificates/></aside></div></div></div>
  if(t.layout==="skills-first")return <div style={{...page,padding:"40px 48px"}}><div style={{display:"flex",gap:30,alignItems:"center"}}><Photo size={95}/><div><Name size={36}/><Contact/></div></div><Summary/><div style={{background:t.panel,padding:"2px 24px 20px",marginTop:20}}><Skills/></div><Experience/><div style={two}><section><Projects/><Certificates/></section><section><Education/><Languages/></section></div></div>
  if(t.layout==="dossier")return <div style={{...page,padding:30}}><div style={{border:`2px solid ${t.ink}`,padding:"28px 32px",minHeight:1060}}><div style={{fontSize:12,letterSpacing:3,borderBottom:`1px solid ${t.ink}`,paddingBottom:14,marginBottom:25}}>CURRICULUM VITAE / HỒ SƠ NĂNG LỰC</div><div style={{display:"flex",gap:25,justifyContent:"space-between"}}><Name size={34}/><Photo size={85}/></div><div style={{borderTop:`1px solid ${t.accent}`,borderBottom:`1px solid ${t.accent}`,padding:"15px 0",margin:"25px 0"}}><Contact/></div><Summary/><Experience/><Education/><Projects/><Bottom/><Certificates/></div></div>
  if(t.layout==="dashboard")return <div style={page}><div style={{padding:"32px 40px",display:"grid",gridTemplateColumns:"1fr 210px",gap:24,background:t.ink,color:t.paper}}><div><Name size={36} color={t.paper}/><div style={{marginTop:16}}><Contact/></div></div><div style={{padding:20,border:`1px solid ${t.paper}66`}}><Skills onPanel/></div></div><div style={body}><Summary/><div style={{...two,gridTemplateColumns:"1.7fr 1fr"}}><main><Experience/><Projects/></main><aside style={{borderLeft:`2px solid ${t.accent}`,paddingLeft:20}}><Education/><Languages/><Certificates/></aside></div></div></div>
  if(t.layout==="research")return <div style={{...page,padding:"45px 48px"}}><div style={{display:"grid",gridTemplateColumns:"125px 1fr",gap:25}}><Photo size={110}/><div><Name size={38}/><Contact/></div></div><div style={{margin:"24px 0",padding:"1px 22px 18px",background:t.panel}}><Summary/></div><div style={{display:"grid",gridTemplateColumns:"195px 1fr",gap:28}}><aside><Education/><Languages/><Certificates/></aside><main style={{borderLeft:`2px solid ${t.accent}`,paddingLeft:28}}><Experience/><Projects/><Skills/></main></div></div>
  if(t.layout==="profile")return <div style={page}><Header center large/><div style={{padding:"20px 54px 45px"}}><Summary/><div style={{...two,marginTop:10}}><main><Education/><Experience/></main><aside><Projects/><Skills/><Languages/><Certificates/></aside></div></div></div>

  /* ----- Sidebar ----- */
  if (t.layout === "sidebar") {
    const side = (
      <div style={{ width: 250, flexShrink: 0, background: panelBg, color: t.panelInk, padding: `${d.pad}px 24px`, boxSizing: "border-box" }}>
        {showPhoto && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <Photo size={130} onPanel />
          </div>
        )}
        <H onPanel>{h.contact}</H>
        {contact.map((c) => (
          <div key={c} style={{ wordBreak: "break-word", marginBottom: 4 }}>
            {c}
          </div>
        ))}
        <Languages onPanel />
        <Skills onPanel />
        <Certificates onPanel />
      </div>
    )
    const main = (
      <div style={{ flex: 1, padding: `${d.pad}px ${d.pad - 8}px`, minWidth: 0 }}>
        <Name size={32} />
        <Summary />
        <Experience />
        <Education />
        <Projects />
      </div>
    )
    return <div style={{ ...page, display: "flex", flexDirection: t.side === "left" ? "row" : "row-reverse" }}>{side}{main}</div>
  }

  /* ----- Korean 이력서 ----- */
  if (t.layout === "korean") {
    const cell: React.CSSProperties = { border: `1px solid ${t.accent}55`, padding: "6px 10px", verticalAlign: "top" }
    const th: React.CSSProperties = { ...cell, background: t.panel, color: t.panelInk, fontWeight: 700, whiteSpace: "nowrap", width: 110 }
    const Table = ({ title, rows }: { title: string; rows: [string, React.ReactNode, React.ReactNode?][] }) =>
      rows.length ? (
        <>
          <H>{title}</H>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {rows.map(([a, b, c], i) => (
                <tr key={i}>
                  <td style={{ ...th, fontWeight: 500 }}>{a}</td>
                  <td style={cell}>{b}</td>
                  {c !== undefined && <td style={{ ...cell, width: "45%" }}>{c}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null
    return (
      <div style={{ ...page, padding: `${d.pad}px ${d.pad + 6}px` }}>
        <div style={{ textAlign: "center", fontFamily: headFont, fontSize: 30, fontWeight: 800, letterSpacing: 6, color: t.accent, marginBottom: 18 }}>{h.resume}</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {(
              [
                [h.name, cv.name || "Họ và tên"],
                [h.position, cv.title],
                [h.email, cv.email],
                [h.phone, cv.phone],
                [h.address, [cv.location, cv.link].filter(Boolean).join(" · ")],
              ] as [string, string][]
            ).map(([k, v], i) => (
              <tr key={k}>
                {i === 0 && (
                  <td rowSpan={5} style={{ ...cell, width: 120, textAlign: "center", verticalAlign: "middle", padding: 8 }}>
                    {showPhoto ? <Photo size={100} /> : <div style={{ width: 100, height: 130, margin: "0 auto", background: `${t.accent}10`, color: muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>3 × 4</div>}
                  </td>
                )}
                <td style={th}>{k}</td>
                <td style={{ ...cell, fontWeight: i === 0 ? 700 : 400, fontSize: i === 0 ? d.fs + 3 : d.fs }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Table title={h.education} rows={cv.education.map((e) => [period(e.from, e.to), <strong key="s">{e.school}</strong>, [e.degree, e.detail].filter(Boolean).join(" · ")])} />
        <Table
          title={h.experience}
          rows={cv.experience.map((e) => [
            period(e.from, e.to),
            <span key="o">
              <strong>{e.org}</strong>
              {e.role && <div>{e.role}</div>}
            </span>,
            <ul key="b" style={{ margin: 0, paddingLeft: 16 }}>
              {e.bullets
                .split("\n")
                .filter((b) => b.trim())
                .map((b, i) => (
                  <li key={i}>{b.replace(/^[-•*]\s*/, "")}</li>
                ))}
            </ul>,
          ])}
        />
        <Table title={h.languages} rows={cv.languages.map((l) => [l.name, l.level])} />
        <Table title={h.certificates} rows={certs.map((c, i) => [String(i + 1), c])} />
        <Projects />
        <Skills />
        {cv.summary && (
          <>
            <H>{h.summary}</H>
            <div style={{ whiteSpace: "pre-wrap", border: `1px solid ${t.accent}55`, padding: 12 }}>{cv.summary}</div>
          </>
        )}
      </div>
    )
  }

  /* ----- Banner ----- */
  if (t.layout === "banner") {
    return (
      <div style={page}>
        <div style={{ background: panelBg, color: t.panelInk, padding: `${d.pad - 6}px ${d.pad + 8}px`, display: "flex", alignItems: "center", gap: 24 }}>
          <Photo size={104} onPanel />
          <div style={{ minWidth: 0 }}>
            <Name size={34} color={t.panelInk} />
            {contact.length > 0 && <div style={{ marginTop: 10, opacity: 0.9 }}>{contact.join("  ·  ")}</div>}
          </div>
        </div>
        <div style={{ padding: `${Math.round(d.pad / 2)}px ${d.pad + 8}px ${d.pad}px` }}>
          <Summary />
          <Experience />
          <Education />
          <Projects />
          <Bottom />
          <Certificates />
        </div>
      </div>
    )
  }

  /* ----- Split (two columns, no fill) ----- */
  if (t.layout === "split") {
    return (
      <div style={{ ...page, padding: `${d.pad}px ${d.pad + 6}px` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, paddingBottom: 16, borderBottom: `3px solid ${t.accent}` }}>
          <Photo size={88} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Name size={32} />
          </div>
          <div style={{ textAlign: "right", color: muted, fontSize: d.fs - 0.5, lineHeight: 1.7 }}>
            {contact.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
        </div>
        <Summary />
        <div style={{ display: "flex", gap: 28 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Experience />
            <Education />
            <Projects />
          </div>
          <div style={{ width: 220, flexShrink: 0, background: t.panel, color: t.panelInk, borderRadius: 12, padding: "2px 16px 16px", alignSelf: "flex-start", marginTop: d.gap }}>
            <Languages onPanel />
            <Skills onPanel />
            <Certificates onPanel />
          </div>
        </div>
      </div>
    )
  }

  /* ----- Minimal ----- */
  if (t.layout === "minimal") {
    return (
      <div style={{ ...page, padding: `${d.pad + 6}px ${d.pad + 20}px` }}>
        {showPhoto && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <Photo size={92} />
          </div>
        )}
        <Name size={34} align="center" />
        {contact.length > 0 && <div style={{ marginTop: 10, color: muted, textAlign: "center" }}>{contact.join("   |   ")}</div>}
        <div style={{ height: 1, background: `${t.ink}30`, margin: `${d.gap}px auto 0`, width: "60%" }} />
        <Summary />
        <Experience />
        <Education />
        <Projects />
        <Bottom />
        <Certificates />
      </div>
    )
  }

  /* ----- Classic & timeline ----- */
  return (
    <div style={{ ...page, padding: `${d.pad}px ${d.pad + 10}px` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ flex: 1, minWidth: 0, borderLeft: timeline ? undefined : `5px solid ${t.accent}`, paddingLeft: timeline ? 0 : 16 }}>
          <Name size={timeline ? 34 : 30} />
          {contact.length > 0 && <div style={{ marginTop: 8, color: muted }}>{contact.join("  ·  ")}</div>}
        </div>
        <Photo size={96} />
      </div>
      {timeline && <div style={{ height: 4, background: `linear-gradient(90deg, ${t.accent}, ${t.accent}00)`, borderRadius: 4, marginTop: 14 }} />}
      <Summary />
      <Experience />
      <Education />
      <Projects />
      <Bottom />
      <Certificates />
    </div>
  )
}

/** Blend two hex colours (t = share of b). */
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  if (pa.some(Number.isNaN) || pb.some(Number.isNaN)) return "#64748b"
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")
}
