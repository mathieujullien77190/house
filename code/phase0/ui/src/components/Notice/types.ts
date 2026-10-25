export type NoticeTone = 'muted' | 'error'

export interface NoticeProps {
  text: string
  tone?: NoticeTone
}
