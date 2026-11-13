import { applyTemplate, scanTemplate, type TemplateSlot } from "./template-fill"
const scope = self as unknown as {
  onmessage: ((event: MessageEvent) => void) | null
  postMessage: (data: unknown, transfer?: Transferable[]) => void
}
scope.onmessage = (
  event: MessageEvent<{
    mode: "scan" | "apply"
    data: Uint8Array
    slots: TemplateSlot[]
    values: Record<string, string>
  }>,
) => {
  try {
    const { mode, data, slots, values } = event.data
    if (mode === "scan")
      scope.postMessage({ ok: true, result: scanTemplate(data) })
    else {
      const result = applyTemplate(data, slots, values)
      scope.postMessage({ ok: true, result }, [
        result.bytes.buffer as ArrayBuffer,
      ])
    }
  } catch (error) {
    scope.postMessage({ ok: false, error: (error as Error).message })
  }
}
