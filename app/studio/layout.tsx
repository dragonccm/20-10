import localFont from "next/font/local"
import type { Metadata } from "next"
import type React from "react"
import { Toaster } from "sonner"
import { Companion } from "@/components/studio/companion"
import { StudioViewport } from "@/components/studio/viewport"
import { StudioNav } from "@/components/studio/nav"
import "./mobile.css"

const studioFont = localFont({
  src: "./fonts/plus-jakarta-sans.woff2",
  variable: "--font-studio",
  weight: "200 800",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
})

export const metadata: Metadata = {
  title: "Bloom Workspace",
  description: "Một góc nhỏ để tìm sự giúp đỡ khi bạn cần.",
}

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${studioFont.className} ${studioFont.variable} studio-ui fixed inset-0 flex flex-col bg-[#f6f7fb] text-slate-700 lg:flex-row`}
    >
      <div className="contents studio-navigation">
        <StudioNav />
      </div>
      <StudioViewport>{children}</StudioViewport>
      <div id="studio-overlays" className="studio-overlays" />
      <Companion />
      <Toaster position="bottom-center" richColors closeButton />
    </div>
  )
}
