import ReolinkDrawingUI from './UI'
import { irLedPoints } from './helpers'

const ReolinkDrawing = () => {
  return <ReolinkDrawingUI irLeds={irLedPoints()} />
}

export default ReolinkDrawing
