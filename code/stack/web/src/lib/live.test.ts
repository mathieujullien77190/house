import { liveSrc } from './live'

describe('liveSrc', () => {
  it('construit l’adresse du direct', () => {
    expect(liveSrc('a b')).toBe('/stream?camera=a%20b')
    expect(liveSrc('c', true)).toBe('/stream?camera=c&quality=hd')
    expect(liveSrc('c', false, true)).toBe('/stream?camera=c&screen=mobile')
    expect(liveSrc('c', true, true)).toBe('/stream?camera=c&quality=hd&screen=mobile')
  })
})
