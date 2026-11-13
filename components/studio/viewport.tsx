"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"
import { usePathname } from "next/navigation"

export function StudioViewport({ children }: { children: ReactNode }) {
  const main = useRef<HTMLElement>(null)
  const path = usePathname()
  useLayoutEffect(() => {
    const viewport = main.current
    if (!viewport) return
    viewport.scrollTop = 0
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const animation = viewport.firstElementChild?.animate(
      [{ opacity: 0.85 }, { opacity: 1 }],
      { duration: 160, easing: "ease-out" },
    )
    return () => animation?.cancel()
  }, [path])
  return (
    <main
      ref={main}
      id="studio-scroll"
      className="studio-viewport min-w-0 flex-1 overflow-y-auto"
    >
      <div className="mx-auto w-full max-w-[1760px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 2xl:px-10">
        {children}
      </div>
    </main>
  )
}
