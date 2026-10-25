import Button from '@/components/UI/Button'
import { CLOSE_CLASS, CLOSE_LABEL, ERROR_CLASS, LOADING_TEXT, PLAYER_CLASS, TEXT_CLASS, VIDEO_CLASS } from './constants'
import type { ClipPlayerUIProps } from './types'

const ClipPlayerUI = ({ src, error, onClose }: ClipPlayerUIProps) => {
  return (
    <div className={PLAYER_CLASS}>
      {error ? <p className={ERROR_CLASS}>{error}</p> : src ? <video className={VIDEO_CLASS} src={src} controls autoPlay /> : <p className={TEXT_CLASS}>{LOADING_TEXT}</p>}
      <Button className={CLOSE_CLASS} onClick={onClose}>
        {CLOSE_LABEL}
      </Button>
    </div>
  )
}

export default ClipPlayerUI
