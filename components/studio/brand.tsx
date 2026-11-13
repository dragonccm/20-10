type MarkProps = { size?: number; className?: string }

/** The same original mark is used in navigation, the companion and browser icons. */
export function BloomMark({ size = 32, className = "" }: MarkProps) {
  return <img src="/brand/bloom-mark.svg" width={size} height={size} alt="" aria-hidden="true" className={`shrink-0 ${className}`} draggable={false} />
}

export function BloomWordmark({ className = "" }: { className?: string }) {
  return <img src="/brand/bloom-wordmark.svg" width={120.06} height={48} alt="Bloom" className={`h-6 w-auto ${className}`} draggable={false} />
}
