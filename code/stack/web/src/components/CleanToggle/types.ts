export interface CleanToggleProps {
  /** Les composants posés sur la vidéo sont-ils montrés ? */
  visible: boolean
  /** Un clic : les cache ou les montre. */
  onToggle: () => void
}
