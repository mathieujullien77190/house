/** Des secondes en « m:ss » (la durée d'un clip : quelques minutes au plus). */
export const formatClock = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}
