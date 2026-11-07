import { useState } from 'react'
import type { Filter } from '@/types'
import { NO_FILTER } from './filter'

/** Le filtre d'un tableau (valeur et jour) : chaque changement revient à la première page (`onChange`). `change` fusionne, `NO_FILTER` efface. */
export const useFilter = (onChange: () => void) => {
  const [filter, setFilter] = useState<Filter>(NO_FILTER)
  const change = (patch: Partial<Filter>) => {
    setFilter((current) => ({ ...current, ...patch }))
    onChange()
  }
  return { filter, change }
}
