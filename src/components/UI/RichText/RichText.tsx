import { useGlossary } from '@/lib/glossaryContext'
import RichTextUI from './UI'
import { splitTerms } from './helpers'
import type { RichTextProps } from './types'

const RichText = ({ text }: RichTextProps) => {
  const openTerm = useGlossary()
  return <RichTextUI segments={splitTerms(text)} onTerm={openTerm} />
}

export default RichText
