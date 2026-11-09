import { useEffect, useState } from 'react'

/** La valeur, mais seulement une fois qu'elle n'a plus changé depuis `delay` ms (la première valeur est donnée tout de suite). */
export const useDebounced = <T>(value: T, delay: number): T => {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return settled
}
