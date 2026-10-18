export interface RichTextProps {
  text: string
}

export interface Segment {
  text: string
  /** Présent quand le morceau est un terme du glossaire. */
  termId?: string
}

export interface RichTextUIProps {
  segments: Segment[]
  onTerm: (termId: string) => void
}
