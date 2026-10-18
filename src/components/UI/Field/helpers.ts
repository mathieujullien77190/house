import type { ChangeEvent } from 'react'

export const readValue = (e: ChangeEvent<HTMLInputElement>): string => {
  return e.target.value
}
