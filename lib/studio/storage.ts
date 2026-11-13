"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

export function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeLS(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** State persisted in localStorage (per browser). Loads after mount to stay SSR-safe. */
export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const latest = useRef({ key, value: initial, ready: false })

  // Restore before paint on client navigation, so a saved form does not flash empty.
  useLayoutEffect(() => {
    const previous = latest.current
    if (previous.ready && previous.key !== key) writeLS(previous.key, previous.value)
    setValue(readLS(key, initial))
    setLoadedKey(key)
    // The initial value is a fallback, not a reason to reload an edited form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  if (loadedKey === key) latest.current = { key, value, ready: true }

  useEffect(() => {
    if (loadedKey !== key) return
    const timer = setTimeout(() => writeLS(key, value), 180)
    return () => clearTimeout(timer)
  }, [key, value, loadedKey])

  useEffect(() => {
    const flush = () => {
      const snapshot = latest.current
      if (snapshot.ready && snapshot.key === key) writeLS(key, snapshot.value)
    }
    window.addEventListener("pagehide", flush)
    return () => {
      window.removeEventListener("pagehide", flush)
      flush()
    }
  }, [key])

  return [value, setValue, loadedKey === key] as const
}

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)

export function downloadFile(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function safeFileName(name: string) {
  return (name || "tai-lieu").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80) || "tai-lieu"
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Print arbitrary HTML through a hidden iframe (user can choose "Save as PDF"). */
export function printHtml(title: string, bodyHtml: string, css = "") {
  const iframe = document.createElement("iframe")
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) return
  doc.open()
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${bodyHtml}</body></html>`,
  )
  doc.close()
  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => iframe.remove(), 2000)
  }, 300)
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
}
