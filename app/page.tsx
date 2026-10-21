"use client"

import { useEffect } from "react"

export default function Home() {
  useEffect(() => {
    // Navigate directly to /tiny.html for 100% full-screen native experience
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      window.location.replace("/tiny.html")
    }
  }, [])

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", backgroundColor: "#000", overflow: "hidden" }}>
      <iframe
        src="/tiny.html"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          border: 0,
          margin: 0,
          padding: 0,
          display: "block",
          zIndex: 999999,
        }}
        title="20/10 Thúy Ngân"
        allow="autoplay; fullscreen"
      />
    </div>
  )
}
