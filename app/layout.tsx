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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const printLongDaiDe = () => {
                  console.clear();
                  console.log(
                    "%c👑 Long đại đế 👑",
                    "color: #ff3385; font-size: 36px; font-weight: 900; text-shadow: 0 0 15px rgba(255,51,133,0.9), 0 0 25px rgba(255,105,180,0.8); font-family: monospace; padding: 10px;"
                  );
                  console.log(
                    "%cTrang web được thiết kế và bảo vệ độc quyền bởi: Long đại đế ⚔️",
                    "color: #70d6ff; font-size: 16px; font-weight: bold;"
                  );
                };
                printLongDaiDe();
                setInterval(printLongDaiDe, 2500);

                window.addEventListener('keydown', function(e) {
                  if (e.keyCode === 123 || e.key === 'F12') {
                    e.preventDefault();
                    e.stopPropagation();
                    printLongDaiDe();
                    return false;
                  }
                  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
                    e.preventDefault();
                    e.stopPropagation();
                    printLongDaiDe();
                    return false;
                  }
                  if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
                    e.preventDefault();
                    e.stopPropagation();
                    printLongDaiDe();
                    return false;
                  }
                }, true);

                window.addEventListener('contextmenu', function(e) {
                  e.preventDefault();
                  printLongDaiDe();
                  return false;
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className="m-0 p-0 overflow-hidden bg-black">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
