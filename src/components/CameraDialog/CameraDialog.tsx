import { lazy, Suspense, useState } from 'react'
import PiZeroSchematic from '@/components/PiZeroSchematic'
import ReolinkDrawing from '@/components/ReolinkDrawing'
import CameraDialogUI from './UI'
import { LOADING_TEXT, TABS } from './constants'
import { dialogTitle, modelKind } from './helpers'
import type { CameraDialogProps, DialogView } from './types'

// Three.js est lourd : on ne le charge que lorsqu'on ouvre la vue 3D.
const CameraModel3D = lazy(() => import('@/components/CameraModel3D'))

const CameraDialog = ({ node, open, onClose }: CameraDialogProps) => {
  const [view, setView] = useState<DialogView>('2d')
  const kind = modelKind(node)

  return (
    <CameraDialogUI
      open={open && node !== null}
      title={dialogTitle(node)}
      view={view}
      tabs={TABS}
      onViewChange={setView}
      onClose={onClose}
      schematic={kind === 'zero' ? <PiZeroSchematic /> : <ReolinkDrawing />}
      model={
        <Suspense fallback={<p className="text-muted">{LOADING_TEXT}</p>}>
          <CameraModel3D kind={kind} />
        </Suspense>
      }
    />
  )
}

export default CameraDialog
