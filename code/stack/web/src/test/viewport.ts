// La largeur d'écran simulée : étroite (téléphone) par défaut, bureau (dès 1024 px) sur demande.
const state = { desktop: false }

export const setDesktop = (value: boolean): void => {
  state.desktop = value
}

export const isDesktop = (): boolean => state.desktop
