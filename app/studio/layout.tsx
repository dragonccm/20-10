import type { Metadata } from "next"
import type React from "react"
import { Toaster } from "sonner"
import { StudioNav } from "@/components/studio/nav"

export const metadata: Metadata = {
  title: "Bloom Workspace",
  description: "A little space to learn, create and grow.",
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-rose-50 via-violet-50 to-sky-50 text-slate-700 lg:flex-row">
      <StudioNav />
      <main id="studio-scroll" className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1760px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 2xl:px-10">{children}</div>
      </main>
      <Toaster position="bottom-center" richColors closeButton />
    </div>
  )
}
