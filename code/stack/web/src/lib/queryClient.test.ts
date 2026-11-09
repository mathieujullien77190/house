import { queryClient, STALE_MS } from './queryClient'

describe('queryClient', () => {
  it('garde les réponses fraîches 10 s, sans relire au retour sur la page', () => {
    const options = queryClient.getDefaultOptions().queries
    expect(options?.staleTime).toBe(STALE_MS)
    expect(options?.retry).toBe(1)
    expect(options?.refetchOnWindowFocus).toBe(false)
  })
})
