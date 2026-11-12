"use client"
import { useEffect, useRef, useState } from "react"
import { HelpDetails, Button, Card, Input, Label } from "./ui"
export function FocusTimer() {
  const [minutes, setMinutes] = useState(25),
    [remaining, setRemaining] = useState(25 * 60),
    [running, setRunning] = useState(false),
    [finished, setFinished] = useState(false)
  const deadline = useRef(0)
  useEffect(() => {
    if (!running) return
    const tick = () => {
      const next = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      )
      setRemaining(next)
      if (!next) {
        setRunning(false)
        setFinished(true)
      }
    }
    tick()
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  }, [running])
  return (
    <Card className="mx-auto max-w-xl space-y-5 p-7 text-center">
      <h2 className="font-semibold text-2xl">Một khoảng tập trung</h2>
      <p className="text-sm leading-relaxed text-slate-500">
        Chọn một khoảng tập trung. Nghỉ hay dừng lúc nào cũng được.
      </p>
      <HelpDetails summary="Về cách Pomodoro">
        <p>
          Chia việc thành một khoảng tập trung rồi nghỉ. Bạn tự đổi thời lượng;
          ứng dụng không giữ chuỗi ngày hay nhắc quay lại.
        </p>
      </HelpDetails>
      <label className="mx-auto block max-w-36">
        <Label>Số phút bạn muốn</Label>
        <Input
          type="number"
          min={1}
          max={120}
          disabled={running}
          value={minutes}
          onChange={(e) => {
            const m = Math.max(1, Math.min(120, Number(e.target.value) || 25))
            setMinutes(m)
            setRemaining(m * 60)
            setFinished(false)
          }}
        />
      </label>
      <div
        role="timer"
        aria-label="Thời gian còn lại"
        className="font-semibold text-6xl text-violet-700"
      >
        {String(Math.floor(remaining / 60)).padStart(2, "0")}:
        {String(remaining % 60).padStart(2, "0")}
      </div>
      {finished && (
        <p role="status" className="text-sm text-emerald-700">
          Khoảng thời gian này đã khép lại. Bạn có thể nghỉ một chút nếu muốn.
        </p>
      )}
      <div className="flex justify-center gap-3">
        <Button
          onClick={() => {
            if (running) setRunning(false)
            else {
              deadline.current = Date.now() + (remaining || minutes * 60) * 1000
              setFinished(false)
              setRunning(true)
            }
          }}
        >
          {running ? "Tạm dừng" : "Bắt đầu / Tiếp tục"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setRunning(false)
            setRemaining(minutes * 60)
            setFinished(false)
          }}
        >
          Để lúc khác
        </Button>
      </div>
    </Card>
  )
}
