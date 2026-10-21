import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Sự thức giấc của Tiny - Ngày 20/10 Thúy Ngân",
  description: "Dành riêng cho Thúy Ngân • Tạo bởi Ngọc Long",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className="m-0 p-0 overflow-hidden bg-black">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
