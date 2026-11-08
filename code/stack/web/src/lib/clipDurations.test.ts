import { clipDurationOf, rememberClipDuration } from './clipDurations'

describe('clipDurations', () => {
  it('garde une durée valide', () => {
    rememberClipDuration('a', 12)
    expect(clipDurationOf('a')).toBe(12)
  })
  it('ignore les durées nulles, négatives ou infinies', () => {
    rememberClipDuration('b', 0)
    rememberClipDuration('c', -1)
    rememberClipDuration('d', Infinity)
    expect([clipDurationOf('b'), clipDurationOf('c'), clipDurationOf('d'), clipDurationOf('inconnu')]).toEqual([null, null, null, null])
  })
})
