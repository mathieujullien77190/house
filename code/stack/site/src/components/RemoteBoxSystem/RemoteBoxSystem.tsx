import { useState } from 'react'
import ShutterSystemUI from '@/components/ShutterSystem/UI'
import type { ShutterViewId } from '@/components/ShutterSystem/types'
import { DEFAULT_VIEW, VIEWS, VIEW_OPTIONS } from './constants'

/** Le boîtier volet + clim : le schéma matériel (ce qui se branche) et le schéma logiciel (le firmware et qui parle à qui). Le rendu est celui des volets. */
const RemoteBoxSystem = () => {
  const [viewId, setViewId] = useState<ShutterViewId>(DEFAULT_VIEW)
  return <ShutterSystemUI viewId={viewId} view={VIEWS[viewId]} options={VIEW_OPTIONS} onViewChange={setViewId} />
}

export default RemoteBoxSystem
