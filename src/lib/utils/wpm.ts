export function calcWpm(correctChars: number, elapsedMs: number): number {
  const minutes = elapsedMs / 1000 / 60
  if (minutes === 0) return 0
  return Math.round((correctChars / 5) / minutes)
}

export function calcAccuracy(correctChars: number, totalTyped: number): number {
  if (totalTyped === 0) return 100
  return Math.round((correctChars / totalTyped) * 100)
}
