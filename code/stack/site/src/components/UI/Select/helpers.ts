import type { ChangeEvent } from 'react'

export const readValue = (e: ChangeEvent<HTMLSelectElement>): string => {
  return e.target.value
}
