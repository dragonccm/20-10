"use client"
import { memo, type CSSProperties } from "react"
import { fontFamily, type El } from "@/lib/studio/design"
import { FULL_CROP, cssFilter, withDefaults } from "@/lib/studio/imagefx"

export const DesignElement = memo(function DesignElement({
  el,
  scale,
}: {
  el: El
  scale: number
}) {
  const base: CSSProperties = {
    width: "100%",
    height: "100%",
    opacity: el.opacity,
  }
  const boxShadow = el.shadow
    ? `0 ${10 * scale}px ${30 * scale}px rgba(0,0,0,0.35)`
    : undefined
  if (el.type === "rect")
    return (
      <div
        style={{
          ...base,
          background: el.fill,
          borderRadius: (el.radius ?? 0) * scale,
          boxShadow,
        }}
      />
    )
  if (el.type === "circle")
    return (
      <div
        style={{ ...base, background: el.fill, borderRadius: "50%", boxShadow }}
      />
    )
  if (el.type === "image") {
    const c = el.crop ?? FULL_CROP
    const f = withDefaults(el.filters)
    return (
      <div
        style={{
          ...base,
          position: "relative",
          overflow: el.cutout ? "visible" : "hidden",
          borderRadius: el.cutout ? 0 : (el.radius ?? 0) * scale,
          boxShadow: el.cutout ? undefined : boxShadow,
          filter:
            el.cutout && el.shadow
              ? `drop-shadow(0 ${10 * scale}px ${15 * scale}px rgba(0,0,0,0.35))`
              : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform:
              el.flipX || el.flipY
                ? `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})`
                : undefined,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={el.src}
            loading="lazy"
            decoding="async"
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              maxWidth: "none",
              width: `${100 / c.w}%`,
              height: `${100 / c.h}%`,
              left: `${(-c.x / c.w) * 100}%`,
              top: `${(-c.y / c.h) * 100}%`,
              filter: cssFilter(f, f.blur * scale),
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    )
  }
  return (
    <div
      style={{
        ...base,
        color: el.color,
        fontSize: (el.fontSize ?? 48) * scale,
        fontWeight: el.weight,
        fontStyle: el.italic ? "italic" : undefined,
        fontFamily: fontFamily(el),
        letterSpacing: (el.letterSpacing ?? 0) * scale,
        textAlign: el.align,
        lineHeight: el.lineHeight ?? 1.25,
        display: "flex",
        flexDirection: "column",
        justifyContent:
          el.verticalAlign === "middle"
            ? "center"
            : el.verticalAlign === "bottom"
              ? "flex-end"
              : "flex-start",
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        textShadow: el.shadow
          ? `0 ${3 * scale}px ${12 * scale}px rgba(0,0,0,0.35)`
          : undefined,
      }}
    >
      {el.text}
    </div>
  )
})
