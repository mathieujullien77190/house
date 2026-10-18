import { findEntry } from '@/glossary'
import { FALLBACK_TITLE } from './constants'

export const entryContent = (termId: string | null): { title: string; definition: string } => {
  const entry = termId ? findEntry(termId) : undefined
  return { title: entry?.term ?? FALLBACK_TITLE, definition: entry?.definition ?? '' }
}
