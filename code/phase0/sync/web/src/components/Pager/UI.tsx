import Button from '@/components/UI/Button'
import { NEXT_LABEL, PREVIOUS_LABEL, WRAP_CLASS } from './constants'
import type { PagerUIProps } from './types'

const PagerUI = ({ text, canPrevious, canNext, onPrevious, onNext }: PagerUIProps) => {
  return (
    <div className={WRAP_CLASS}>
      <span>{text}</span>
      <Button onClick={onPrevious} disabled={!canPrevious} aria-label="Page précédente">
        {PREVIOUS_LABEL}
      </Button>
      <Button onClick={onNext} disabled={!canNext} aria-label="Page suivante">
        {NEXT_LABEL}
      </Button>
    </div>
  )
}

export default PagerUI
