import type { useFade } from '@/lib/useFade'

export interface FadeButtonProps {
  /** L'extinction en douceur de cette lampe (le hook `useFade`, tenu par le parent : le curseur de la lampe en suit la luminosité). */
  fade: ReturnType<typeof useFade>
  /** La lampe est allumée. */
  on: boolean
}
