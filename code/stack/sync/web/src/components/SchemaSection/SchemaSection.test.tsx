import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SchemaSection from '@/components/SchemaSection'

describe('SchemaSection', () => {
  it('les deux architectures, la matérielle puis la logicielle', () => {
    render(<SchemaSection />)
    const hardware = screen.getByText('Architecture matérielle')
    const software = screen.getByText('Architecture logicielle')
    expect(hardware.compareDocumentPosition(software) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('un dessin SVG par architecture, avec ses textes', () => {
    render(<SchemaSection />)
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.getByText('Mini PC · Docker Compose')).toBeTruthy()
    expect(screen.getByText('go2rtc')).toBeTruthy()
    expect(screen.getByText('tunnel WireGuard (UDP)')).toBeTruthy()
  })
})
