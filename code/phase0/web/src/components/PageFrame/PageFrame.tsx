import PageFrameUI from './UI'
import type { PageFrameProps } from './types'

/** Une autre page de la maison (Frigate, House Sync) dans une iframe : même site que la WebApp, donc ses cookies passent. */
const PageFrame = (props: PageFrameProps) => {
  return <PageFrameUI {...props} />
}

export default PageFrame
