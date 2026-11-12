"use client"

import { useEffect, useState } from "react"

export type AiTask =
  | "companion"
  | "grammar"
  | "structure"
  | "outline"
  | "summarize"
  | "academic"
  | "translate"
  | "korean"
  | "english"
  | "interview"
  | "cover-letter"
  | "vocab"
  | "cite-queries"
  | "cite-rank"
  | "design"
  | "design-action"
  | "html-edit"
  | "cv-theme"
  | "doc-review"
  | "slide-script"
  | "doc-chat"
  | "doc-quiz"
  | "cv-parse"
  | "ocr"

export type GrammarIssue = {
  original: string
  suggested: string
  category: string
  explanation: string
}

export async function callAi<T = { text: string }>(task: AiTask, payload: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const res = await fetch("/api/ai", {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ task, ...payload }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "AI đang bận, thử lại sau nhé.")
  return data as T
}

let cached: boolean | null = null

export function useAiStatus() {
  const [configured, setConfigured] = useState<boolean | null>(cached)
  useEffect(() => {
    if (cached !== null) return
    fetch("/api/ai")
      .then((r) => r.json())
      .then((d) => {
        cached = !!d.configured
        setConfigured(cached)
      })
      .catch(() => setConfigured(false))
  }, [])
  return configured
}
