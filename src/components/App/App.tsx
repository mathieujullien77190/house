import { useState } from 'react'
import { countsOf, totalFor } from '@/catalog'
import CameraDialog from '@/components/CameraDialog'
import Diagram from '@/components/Diagram'
import GlossarySheet from '@/components/GlossarySheet'
import InfoPanel from '@/components/InfoPanel'
import K3sPanel from '@/components/K3sPanel'
import Legend from '@/components/Legend'
import MainsPanel from '@/components/MainsPanel'
import Phase0Architecture from '@/components/Phase0Architecture'
import PhaseSwitch from '@/components/PhaseSwitch'
import Pricing from '@/components/Pricing'
import { GlossaryContext } from '@/lib/glossaryContext'
import { inPhase, isCameraKind, templates, type Floor, type NodeKind, type Phase } from '@/nodes'
import { useDiagram } from '@/useDiagram'
import AppUI from './UI'
import { HINT, SUBTITLE, TITLE } from './constants'

const App = () => {
  const d = useDiagram()
  const [phase, setPhase] = useState<Phase>(0)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedLink, setSelectedLink] = useState<string | null>(null)
  const [floor, setFloor] = useState<Floor>('rdc')
  const [term, setTerm] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  // Seuls les composants et les liens de la phase affichée comptent partout.
  const nodes = d.nodes.filter((n) => inPhase(n, phase))
  const ids = new Set(nodes.map((n) => n.id))
  const links = d.links.filter((l) => inPhase(l, phase) && ids.has(l.from) && ids.has(l.to))

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
    selectNode(d.addNode(kind, phase))
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
    setPhase(0)
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
        phaseSwitch={<PhaseSwitch phase={phase} totals={{ 0: totalFor(d.nodes, 0), 1: totalFor(d.nodes, 1), 2: totalFor(d.nodes, 2) }} onChange={setPhase} />}
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
        architecture={phase === 0 ? <Phase0Architecture /> : null}
        mains={phase === 0 ? null : <MainsPanel nodes={nodes} phase={phase} />}
        k3s={phase === 0 ? null : <K3sPanel nodes={nodes} />}
        pricing={
          <Pricing
            phase={phase}
            counts={countsOf(nodes)}
            customs={nodes.filter((n) => n.kind === 'custom')}
            onAdd={add}
            onRemove={(kind) => d.removeLast(kind, phase)}
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
