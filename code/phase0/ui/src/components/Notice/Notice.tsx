import { ERROR_CLASS, MUTED_CLASS } from './constants'
import type { NoticeProps } from './types'

/** Une phrase d'information ou d'erreur, sous l'en-tête. */
const Notice = ({ text, tone = 'muted' }: NoticeProps) => <p className={tone === 'error' ? ERROR_CLASS : MUTED_CLASS}>{text}</p>

export default Notice
