import { useState } from 'react'
import { countsOf } from '@/catalog'
import CameraDialog from '@/components/CameraDialog'
import Diagram from '@/components/Diagram'
import GlossarySheet from '@/components/GlossarySheet'
import InfoPanel from '@/components/InfoPanel'
import Legend from '@/components/Legend'
import MainsPanel from '@/components/MainsPanel'
import Architecture from '@/components/Architecture'
import Pricing from '@/components/Pricing'
import { GlossaryContext } from '@/lib/glossaryContext'
import { isCameraKind, isPricedByHand, templates, type Floor, type NodeKind } from '@/nodes'
import { useDiagram } from '@/useDiagram'
import AppUI from './UI'
import { HINT, SUBTITLE, TITLE } from './constants'

const App = () => {
  const d = useDiagram()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedLink, setSelectedLink] = useState<string | null>(null)
  const [floor, setFloor] = useState<Floor>('rdc')
  const [term, setTerm] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  // Un lien dont une extrémité a disparu n'est pas montré.
  const nodes = d.nodes
  const ids = new Set(nodes.map((n) => n.id))
  const links = d.links.filter((l) => ids.has(l.from) && ids.has(l.to))

  const node = nodes.find((n) => n.id === selectedNode) ?? null
  const link = links.find((l) => l.id === selectedLink) ?? null

  const selectNode = (id: string) => {
    setSelectedNode(id)
    setSelectedLink(null)
  }

  const selectLink = (id: string) => {
    setSelectedLink(id)
    setSelectedNode(null)
  }

  // Un clic sur une caméra ouvre sa boîte de dialogue (schéma 2D et vue 3D).
  const activateNode = (id: string) => {
    const target = nodes.find((n) => n.id === id)
    if (target && isCameraKind(target.kind)) setCameraOpen(true)
  }

  // Un composant ajouté apparaît à son étage : on y bascule pour le voir.
  const add = (kind: NodeKind) => {
    setFloor(templates[kind].floor)
    selectNode(d.addNode(kind))
  }

  const removeLink = (id: string) => {
    d.removeLink(id)
    setSelectedLink(null)
  }

  const reset = () => {
    d.reset()
    setSelectedNode(null)
    setSelectedLink(null)
    setFloor('rdc')
  }

  const openTerm = (id: string) => {
    setTerm(id)
    setSheetOpen(true)
  }

  return (
    <GlossaryContext.Provider value={openTerm}>
      <AppUI
        title={TITLE}
        subtitle={SUBTITLE}
        notice={d.notice}
        hint={HINT}
        diagram={
          <Diagram
            nodes={nodes}
            links={links}
            floor={floor}
            selectedNode={selectedNode}
            selectedLink={selectedLink}
            onFloorChange={setFloor}
            onSelectNode={selectNode}
            onActivateNode={activateNode}
            onSelectLink={selectLink}
            onMove={d.moveNode}
          />
        }
        legend={<Legend />}
        info={
          <InfoPanel
            node={node}
            link={link}
            nodes={nodes}
            links={links}
            onUpdateNode={d.updateNode}
            onSetZone={d.setZone}
            onRemoveLink={removeLink}
            onSelectLink={selectLink}
          />
        }
        architecture={<Architecture />}
        mains={<MainsPanel nodes={nodes} />}
        pricing={
          <Pricing
            counts={countsOf(nodes)}
            customs={nodes.filter((n) => isPricedByHand(n.kind))}
            onAdd={add}
            onRemove={(kind) => d.removeLast(kind)}
            onReset={reset}
          />
        }
        sheet={
          <>
            <CameraDialog node={node} open={cameraOpen} onClose={() => setCameraOpen(false)} />
            <GlossarySheet termId={term} open={sheetOpen} onClose={() => setSheetOpen(false)} />
          </>
        }
      />
    </GlossaryContext.Provider>
  )
}

export default App
