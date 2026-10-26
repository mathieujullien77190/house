import { useCallback, useEffect, useState } from 'react'
import {
  CANVAS,
  defaultLinks,
  defaultNodes,
  isCameraKind,
  templates,
  type DiagramLink,
  type DiagramNode,
  inPhase,
  type NodeKind,
  type Phase,
} from '@/nodes'
import { autoWire, wireInfra } from '@/wiring'

/** Où apparaît un nouveau composant : jardin au sud pour le rez-de-chaussée, local technique au sous-sol. */
const SPAWN = { rdc: { x: 420, y: 440 }, basement: { x: 330, y: 300 } }

const KEY = 'house-diagram-v23'

interface State {
  nodes: DiagramNode[]
  links: DiagramLink[]
  /** Explication du dernier branchement automatique. */
  notice?: string
}

const initial = (): State => ({ nodes: defaultNodes, links: defaultLinks })

const load = (): State => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) return parsed as State
    }
  } catch {
    // stockage indisponible ou JSON invalide : on repart du schéma par défaut
  }
  return initial()
}

const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`
const snap = (v: number) => Math.round(v / 10) * 10
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

const withoutNode = (s: State, id: string): State => {
  return {
    nodes: s.nodes.filter((n) => n.id !== id),
    links: s.links.filter((l) => l.from !== id && l.to !== id),
  }
}

export const useDiagram = () => {
  const [state, setState] = useState<State>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ nodes: state.nodes, links: state.links }))
    } catch {
      // sauvegarde impossible : le schéma reste utilisable en mémoire
    }
  }, [state])

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setState((s) => ({
      ...s,
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, x: clamp(snap(x), 0, CANVAS.w - n.w), y: clamp(snap(y), 0, CANVAS.h - n.h) }
          : n,
      ),
    }))
  }, [])

  /** Ajoute un composant, présent à partir de la phase donnée. */
  const addNode = useCallback((kind: NodeKind, phase: Phase): string => {
    const id = newId(kind)
    const linkId = newId('link')
    const t = templates[kind]
    setState((s) => {
      const count = s.nodes.filter((n) => n.kind === kind).length + 1
      const i = s.nodes.length % 8
      const node: DiagramNode = {
        id,
        kind,
        floor: t.floor,
        phases: phase === 0 ? [0, 1, 2] : phase === 1 ? [1, 2] : [2],
        x: clamp(SPAWN[t.floor].x + i * 12, 0, CANVAS.w - t.w),
        y: clamp(SPAWN[t.floor].y + i * 12, 0, CANVAS.h - t.h),
        w: t.w,
        h: t.h,
        title: kind === 'pi' ? `Pi5 #${count}` : `${t.title} ${count}`,
        sub: t.sub,
        ...(kind === 'custom' ? { price: 0 } : {}),
        ...(kind === 'disk' ? { price: 129 } : {}),
      }
      const nodes = [...s.nodes, node]
      if (!isCameraKind(kind)) return { nodes, links: wireInfra(nodes, s.links, node, () => newId('link')), notice: undefined }
      const wired = autoWire(nodes, s.links, node, () => linkId)
      return { nodes, links: wired.links, notice: wired.notice }
    })
    return id
  }, [])

  /** Change la zone d'une caméra et la rebranche selon la règle des zones. */
  const setZone = useCallback((id: string, zone: string) => {
    const linkId = newId('link')
    setState((s) => {
      const z = zone.trim()
      const nodes = s.nodes.map((n) => (n.id === id ? { ...n, zone: z || undefined } : n))
      const cam = nodes.find((n) => n.id === id)
      if (!cam || !isCameraKind(cam.kind)) return { ...s, nodes }
      const wired = autoWire(nodes, s.links, cam, () => linkId)
      return { nodes, links: wired.links, notice: wired.notice }
    })
  }, [])

  /** Retire le dernier composant ajouté de ce type (utilisé par les boutons − du tableau des prix). */
  const removeLast = useCallback((kind: NodeKind, phase: Phase) => {
    setState((s) => {
      for (let i = s.nodes.length - 1; i >= 0; i--) {
        if (s.nodes[i].kind === kind && inPhase(s.nodes[i], phase)) return withoutNode(s, s.nodes[i].id)
      }
      return s
    })
  }, [])

  const updateNode = useCallback((id: string, patch: Partial<DiagramNode>) => {
    setState((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }))
  }, [])

  const removeLink = useCallback((id: string) => {
    setState((s) => ({ ...s, links: s.links.filter((l) => l.id !== id) }))
  }, [])

  const reset = useCallback(() => setState(initial()), [])

  return { ...state, moveNode, addNode, removeLast, setZone, updateNode, removeLink, reset }
}
