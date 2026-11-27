import { fadeFor, zoomLabel } from './helpers'

describe('zoomLabel', () => {
  it('une décimale, avec une virgule', () => {
    expect(zoomLabel(1)).toBe('Zoom ×1,0')
    expect(zoomLabel(3.1857)).toBe('Zoom ×3,2')
  })
})

describe('fadeFor', () => {
  it('temps réel : le fondu est plafonné', () => {
    expect(fadeFor(1)).toBe(400)
  })
  it('plus c’est rapide, plus il est court, jusqu’au plancher', () => {
    expect(fadeFor(300)).toBe(160)
    expect(fadeFor(5000)).toBe(40)
  })
  it('le sens n’y change rien ; 0 vaut ×1', () => {
    expect(fadeFor(-60)).toBe(fadeFor(60))
    expect(fadeFor(0)).toBe(400)
  })
})
