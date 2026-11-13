"use client"
import { useEffect, useState, type ReactNode } from "react"
import * as Popover from "@radix-ui/react-popover"

export function ToolbarPopover({
  label,
  trigger,
  children,
}: {
  label: string
  trigger: ReactNode
  children: ReactNode
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null)
  useEffect(() => setContainer(document.getElementById("studio-overlays")), [])
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="studio-toolbar-trigger"
          aria-label={label}
        >
          {trigger}
        </button>
      </Popover.Trigger>
      <Popover.Portal container={container}>
        <Popover.Content
          className="studio-toolbar-popover"
          sideOffset={8}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
