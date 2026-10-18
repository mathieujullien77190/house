import StepperUI from './UI'
import { STEP } from './constants'
import { canDecrease, nextValue } from './helpers'
import type { StepperProps } from './types'

const Stepper = ({ label, value, onChange }: StepperProps) => {
  return (
    <StepperUI
      label={label}
      value={value}
      canDecrease={canDecrease(value)}
      onDecrease={() => onChange(nextValue(value, -STEP))}
      onIncrease={() => onChange(nextValue(value, STEP))}
    />
  )
}

export default Stepper
