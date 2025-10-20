"use client"

import type React from "react"
import { useState } from "react"

export default function Home() {
  const [showPopup, setShowPopup] = useState(false)

  const handleClick = () => {
    setShowPopup(true)
  }

  const handleSendMessage = () => {
    // Open messaging app or contact method
    window.open("https://m.me/nguyen.ngoc.long.744894", "_blank")
  }

  const handleClosePopup = () => {
    setShowPopup(false)
  }

  return (
    <div>
      <div className="message-text">
        <p>
          20/10, chúc Ngọc Maii dangiu luôn thật hạnh phúc và nhiều năng lượng nhé, cùng anh đón chờ nhiều
          điều mới mẻ hơn ở phía trước nheee cô bé xinh đẹp của anh!
        </p>
      </div>

      <div className="floating-bubbles">
        <div className="bubble bubble-1" onClick={handleClick}>
          <img
            src="/images/design-mode/image(1).png"
            alt="Memory 1"
          />
        </div>
        <div className="bubble bubble-2" onClick={handleClick}>
          <img
            src="/images/design-mode/image(1).png"
            alt="Memory 2"
          />
        </div>
        <div className="bubble bubble-3" onClick={handleClick}>
          <img
            src="/images/design-mode/image(1).png"
            alt="Memory 3"
          />
        </div>
        <div className="bubble bubble-4" onClick={handleClick}>
          <img
            src="/images/design-mode/image(1).png"
            alt="Memory 4"
          />
        </div>
        <div className="bubble bubble-5" onClick={handleClick}>
          <img
            src="/images/design-mode/image(1).png"
            alt="Memory 5"
          />
        </div>
      </div>

      <div className="night"></div>
      <div className="flowers" onClick={handleClick}>
        {/* Flower 1 */}
        <div className="flower flower--1">
          <div className="flower__leafs flower__leafs--1">
            <div className="flower__leaf flower__leaf--1"></div>
            <div className="flower__leaf flower__leaf--2"></div>
            <div className="flower__leaf flower__leaf--3"></div>
            <div className="flower__leaf flower__leaf--4"></div>
            <div className="flower__white-circle"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={`flower__light flower__light--${i}`}></div>
            ))}
          </div>
          <div className="flower__line">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`flower__line__leaf flower__line__leaf--${i}`}></div>
            ))}
          </div>
        </div>

        {/* Flower 2 */}
        <div className="flower flower--2">
          <div className="flower__leafs flower__leafs--2">
            <div className="flower__leaf flower__leaf--1"></div>
            <div className="flower__leaf flower__leaf--2"></div>
            <div className="flower__leaf flower__leaf--3"></div>
            <div className="flower__leaf flower__leaf--4"></div>
            <div className="flower__white-circle"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={`flower__light flower__light--${i}`}></div>
            ))}
          </div>
          <div className="flower__line">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flower__line__leaf flower__line__leaf--${i}`}></div>
            ))}
          </div>
        </div>

        {/* Flower 3 */}
        <div className="flower flower--3">
          <div className="flower__leafs flower__leafs--3">
            <div className="flower__leaf flower__leaf--1"></div>
            <div className="flower__leaf flower__leaf--2"></div>
            <div className="flower__leaf flower__leaf--3"></div>
            <div className="flower__leaf flower__leaf--4"></div>
            <div className="flower__white-circle"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={`flower__light flower__light--${i}`}></div>
            ))}
          </div>
          <div className="flower__line">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flower__line__leaf flower__line__leaf--${i}`}></div>
            ))}
          </div>
        </div>

        {/* Grass and decorative elements */}
        <div className="grow-ans" style={{ "--d": "1.2s" } as React.CSSProperties}>
          <div className="flower__g-long">
            <div className="flower__g-long__top"></div>
            <div className="flower__g-long__bottom"></div>
          </div>
        </div>

        <div className="growing-grass">
          <div className="flower__grass flower__grass--1">
            <div className="flower__grass--top"></div>
            <div className="flower__grass--bottom"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={`flower__grass__leaf flower__grass__leaf--${i}`}></div>
            ))}
            <div className="flower__grass__overlay"></div>
          </div>
        </div>

        <div className="growing-grass">
          <div className="flower__grass flower__grass--2">
            <div className="flower__grass--top"></div>
            <div className="flower__grass--bottom"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={`flower__grass__leaf flower__grass__leaf--${i}`}></div>
            ))}
            <div className="flower__grass__overlay"></div>
          </div>
        </div>

        {/* Additional decorative elements */}
        <div className="grow-ans" style={{ "--d": "2.4s" } as React.CSSProperties}>
          <div className="flower__g-right flower__g-right--1">
            <div className="leaf"></div>
          </div>
        </div>

        <div className="grow-ans" style={{ "--d": "2.8s" } as React.CSSProperties}>
          <div className="flower__g-right flower__g-right--2">
            <div className="leaf"></div>
          </div>
        </div>

        <div className="grow-ans" style={{ "--d": "2.8s" } as React.CSSProperties}>
          <div className="flower__g-front">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={`flower__g-front__leaf-wrapper flower__g-front__leaf-wrapper--${i}`}>
                <div className="flower__g-front__leaf"></div>
              </div>
            ))}
            <div className="flower__g-front__line"></div>
          </div>
        </div>

        <div className="grow-ans" style={{ "--d": "3.2s" } as React.CSSProperties}>
          <div className="flower__g-fr">
            <div className="leaf"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={`flower__g-fr__leaf flower__g-fr__leaf--${i}`}></div>
            ))}
          </div>
        </div>

        {/* Long grass elements */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className={`long-g long-g--${i}`}>
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="grow-ans" style={{ "--d": `${3 + (i + j) * 0.2}s` } as React.CSSProperties}>
                <div className={`leaf leaf--${j}`}></div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {showPopup && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={handleClosePopup}>
              ×
            </button>
            <p className="popup-message">
              toi biết em thấy sến nma toi thích làm mấy trò sến súa với cô nương đó, bấm nút để nhắn tin cho anh
              ngayyy, anh đang đợi đó
            </p>
            <button className="popup-button" onClick={handleSendMessage}>
              Nhắn tin cho anh ngay
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
