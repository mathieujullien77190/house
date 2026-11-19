import { fireEvent, within } from '@testing-library/react'

// Les interrupteurs (Toggle, ToggleField de @house/ui) sont deux onglets : Arrêt / Non puis Marche / Oui.
const tabs = (list: HTMLElement): HTMLElement[] => within(list).getAllByRole('tab')

/** L'interrupteur est sur « marche » (le second onglet est sélectionné). */
export const isOn = (list: HTMLElement): boolean => tabs(list)[1].getAttribute('aria-selected') === 'true'

/** L'interrupteur est grisé. */
export const isDisabled = (list: HTMLElement): boolean => tabs(list).every((tab) => (tab as HTMLButtonElement).disabled)

/** Clique l'onglet qui n'est pas sélectionné : l'interrupteur change d'état. */
export const flip = (list: HTMLElement): void => {
  fireEvent.click(tabs(list)[isOn(list) ? 0 : 1])
}
