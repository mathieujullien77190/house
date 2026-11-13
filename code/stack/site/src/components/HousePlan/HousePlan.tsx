import HousePlanUI from './UI'
import { roomsFor, stairSteps } from './helpers'
import type { HousePlanProps } from './types'

const HousePlan = ({ floor }: HousePlanProps) => {
  return <HousePlanUI floor={floor} rooms={roomsFor(floor)} steps={stairSteps()} />
}

export default HousePlan
