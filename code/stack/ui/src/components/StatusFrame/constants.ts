/** Le cadre d'un équipement ouvert dans un aperçu : toujours 1 px : la bordure normale d'un bloc quand tout va bien, rouge quand l'équipement est éteint (la place est la même, rien ne bouge quand l'état change). */
export const FRAME_CLASS = 'rounded-lg border bg-card'
export const FRAME_TONE_CLASS = {
  ok: 'border-line',
  off: 'border-danger',
  open: 'border-[#8fd0f7]',
  closed: 'border-[#8b5cf6]',
} as const
