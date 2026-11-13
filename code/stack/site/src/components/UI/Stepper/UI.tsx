import Button from '@/components/UI/Button'
import { BUTTON_CLASS } from './constants'
import type { StepperUIProps } from './types'

const StepperUI = ({ label, value, canDecrease, onDecrease, onIncrease }: StepperUIProps) => {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Button className={BUTTON_CLASS} aria-label={`Retirer : ${label}`} disabled={!canDecrease} onClick={onDecrease}>
        −
      </Button>
      <span className="min-w-6 text-center font-semibold" aria-live="polite">
        {value}
      </span>
      <Button className={BUTTON_CLASS} aria-label={`Ajouter : ${label}`} onClick={onIncrease}>
        +
      </Button>
    </span>
  )
}

export default StepperUI
