import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SchemaSection from '@/components/SchemaSection'
import SchemaUI from './UI'

describe('SchemaSection', () => {
  it('les deux architectures, la matérielle puis la logicielle', () => {
    render(<SchemaSection />)
    const hardware = screen.getByText('Architecture matérielle')
    const software = screen.getByText('Architecture logicielle')
    expect(hardware.compareDocumentPosition(software) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('des boîtes et des textes de liaison', () => {
    render(<SchemaSection />)
    expect(screen.getByText('Mini PC ACEMAGIC K1')).toBeTruthy()
    expect(screen.getByText('go2rtc')).toBeTruthy()
    expect(screen.getByText('RJ45 vers la box')).toBeTruthy()
    expect(screen.getByText('RTSP interne')).toBeTruthy()
  })

  it('un étage sans lien n’a pas de flèche', () => {
    render(<SchemaUI diagrams={[{ id: 'd', title: 'Titre', intro: 'Intro', tiers: [{ id: 't', nodes: [{ id: 'n', title: 'Boîte', detail: 'Détail', tone: 'muted' }] }] }]} />)
    expect(screen.getByText('Boîte')).toBeTruthy()
    expect(screen.queryByText('▼')).toBeNull()
  })
})
