import {
  applyTemplate,
  scanTemplate,
  type TemplateModel,
  type TemplateSlot,
} from "./template-fill"
export function runTemplateTask(
  mode: "scan",
  data: Uint8Array,
  slots?: TemplateSlot[],
  values?: Record<string, string>,
  signal?: AbortSignal,
): Promise<TemplateModel>
export function runTemplateTask(
  mode: "apply",
  data: Uint8Array,
  slots: TemplateSlot[],
  values: Record<string, string>,
  signal?: AbortSignal,
): Promise<ReturnType<typeof applyTemplate>>
export function runTemplateTask(
  mode: "scan" | "apply",
  data: Uint8Array,
  slots: TemplateSlot[] = [],
  values: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<TemplateModel | ReturnType<typeof applyTemplate>> {
  if (typeof Worker === "undefined")
    return Promise.resolve(
      mode === "scan" ? scanTemplate(data) : applyTemplate(data, slots, values),
    )
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./template-fill.worker.ts", import.meta.url),
    )
    const cleanup = () => {
      worker.terminate()
      signal?.removeEventListener("abort", cancel)
    }
    const cancel = () => {
      cleanup()
      reject(new DOMException("Đã dừng", "AbortError"))
    }
    if (signal?.aborted) {
      cancel()
      return
    }
    signal?.addEventListener("abort", cancel, { once: true })
    worker.onmessage = (e) => {
      cleanup()
      if (e.data.ok) resolve(e.data.result)
      else reject(Error(e.data.error))
    }
    worker.onerror = () => {
      cleanup()
      reject(Error("Chưa xử lý được file. Bạn thử chọn lại mẫu nhé."))
    }
    worker.postMessage({ mode, data, slots, values })
  })
}
