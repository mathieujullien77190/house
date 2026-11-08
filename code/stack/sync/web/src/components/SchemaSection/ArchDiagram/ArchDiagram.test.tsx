import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ArchDiagram from '@/components/SchemaSection/ArchDiagram'
import type { ArchView } from '@/components/SchemaSection/types'

const VIEW: ArchView = {
  id: 'essai',
  label: 'Essai',
  intro: [],
  ariaLabel: 'Schéma d’essai',
  viewBox: '0 0 400 300',
  panels: [
    { id: 'p1', x: 0, y: 0, w: 200, h: 100, tone: 'panel', title: 'Cadre' },
    { id: 'p2', x: 0, y: 100, w: 200, h: 100, tone: 'warm', title: 'Docker', titleEnd: true },
  ],
  boxes: [
    { id: 'b1', x: 10, y: 10, w: 100, h: 60, tone: 'plain', title: 'Boîte', lines: ['ligne un', 'ligne deux'] },
    { id: 'b2', x: 10, y: 120, w: 100, h: 60, tone: 'green', title: 'Verte', lines: [] },
  ],
  arrows: [
    { id: 'a1', d: 'M0 0 L10 10' },
    { id: 'a2', d: 'M0 0 L20 20', dashed: true },
    { id: 'a3', d: 'M0 0 L30 30', vpn: true, both: true },
    { id: 'a4', d: 'M0 0 L40 40', live: true },
  ],
  labels: [
    { id: 'l1', x: 1, y: 1, text: 'libellé' },
    { id: 'l2', x: 1, y: 2, text: 'note grise', note: true, anchor: 'middle' },
    { id: 'l3', x: 1, y: 3, text: 'libellé vpn', vpn: true },
    { id: 'l4', x: 1, y: 4, text: 'libellé direct', live: true },
  ],
  disks: [
    { id: 'd1', cx: 300, cy: 50, title: 'Disque un', lines: ['sauvegarde'] },
    { id: 'd2', cx: 300, cy: 150, title: 'Disque deux', lines: ['a', 'b'], rx: 80 },
  ],
}

describe('ArchDiagram', () => {
  it('dessine les cadres, boîtes, disques et libellés', () => {
    render(<ArchDiagram view={VIEW} />)
    expect(screen.getByRole('img', { name: 'Schéma d’essai' })).toBeTruthy()
    for (const text of ['Cadre', 'Docker', 'Boîte', 'ligne un', 'ligne deux', 'Verte', 'libellé', 'note grise', 'libellé vpn', 'libellé direct', 'Disque un', 'sauvegarde', 'Disque deux'])
      expect(screen.getByText(text)).toBeTruthy()
  })

  it('une flèche par tracé : pointes aux deux bouts pour both, pointe violette pour live', () => {
    const { container } = render(<ArchDiagram view={VIEW} />)
    const paths = Array.from(container.querySelectorAll('svg > path'))
    expect(paths).toHaveLength(4)
    expect(paths[0].getAttribute('marker-start')).toBeNull()
    expect(paths[0].getAttribute('marker-end')).toBe('url(#arch-arrow-essai)')
    expect(paths[2].getAttribute('marker-start')).toBe('url(#arch-arrow-essai)')
    expect(paths[3].getAttribute('marker-end')).toBe('url(#arch-arrow-essai-live)')
    expect(new Set(paths.map((path) => path.getAttribute('class'))).size).toBe(4)
  })

  it('sans disques, le dessin reste valide', () => {
    render(<ArchDiagram view={{ ...VIEW, disks: undefined }} />)
    expect(screen.queryByText('Disque un')).toBeNull()
  })
})
