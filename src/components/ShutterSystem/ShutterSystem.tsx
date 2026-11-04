import { useState } from 'react'
import ShutterSystemUI from './UI'
import { DEFAULT_VIEW, VIEWS, VIEW_OPTIONS } from './constants'
import type { ShutterViewId } from './types'

/** Les volets : le schéma matériel (ce qui se branche) et le schéma logiciel (qui parle à qui). */
const ShutterSystem = () => {
  const [viewId, setViewId] = useState<ShutterViewId>(DEFAULT_VIEW)
  return <ShutterSystemUI viewId={viewId} view={VIEWS[viewId]} options={VIEW_OPTIONS} onViewChange={setViewId} />
}

export default ShutterSystem
