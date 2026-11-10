export interface MarkersToggleProps {
  /** Les 📷 sont-ils montrés sur la vidéo ? */
  visible: boolean
  /** Un clic : les montre ou les cache. */
  onToggle: () => void
}
