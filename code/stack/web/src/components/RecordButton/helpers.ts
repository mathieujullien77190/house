/** Des secondes en « m:ss ». */
export const elapsedLabel = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
