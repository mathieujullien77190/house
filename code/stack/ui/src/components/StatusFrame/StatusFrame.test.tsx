import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatusFrame from './StatusFrame'
import type { StatusFrameTone } from './types'

describe('StatusFrame', () => {
  it.each<[StatusFrameTone, string]>([
    ['ok', 'border-line'],
    ['off', 'border-danger'],
    ['open', 'border-[#8fd0f7]'],
    ['closed', 'border-[#8b5cf6]'],
  ])('tone %s : liseré %s de 1 px', (tone, expected) => {
    render(
      <StatusFrame tone={tone}>
        <span>contenu</span>
      </StatusFrame>,
    )
    const frame = screen.getByText('contenu').parentElement
    expect(frame?.className).toContain(expected)
    expect(frame?.className).toContain('border ')
  })
})
