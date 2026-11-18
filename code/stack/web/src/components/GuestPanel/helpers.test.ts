import { previewOf } from './helpers'

describe('previewOf', () => {
  it('reprend la clé de l’adresse sur l’origine de la WebApp', () => {
    expect(previewOf('https://chezmatou.local:3000/chezmatou?k=abc', 'https://mini.local:8082')).toBe('https://mini.local:8082/chezmatou?k=abc')
  })
  it('sans adresse ou avec une adresse fausse : null', () => {
    expect(previewOf(null, 'https://x')).toBeNull()
    expect(previewOf('pas une adresse', 'https://x')).toBeNull()
  })
})
