// Réglages communs des essais : nettoyage du DOM après chaque essai, et les API du navigateur que jsdom n'a pas.
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
