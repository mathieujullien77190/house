const STORAGE = 'house-tv'

/**
 * Le mode télé de la page « Chez Matou » : `?tv=1` dans l'adresse (gardé pour l'onglet, car la clé effacée de la barre d'adresse emporte toute la query).
 * Il agrandit tout (texte et blocs) et dessine un cadre bien visible sur le bloc choisi à la télécommande.
 */
export const readTvMode = (): boolean => {
  const given = new URLSearchParams(window.location.search).get('tv')
  try {
    if (given === '1') sessionStorage.setItem(STORAGE, '1')
    return given === '1' || sessionStorage.getItem(STORAGE) === '1'
  } catch {
    return given === '1'
  }
}
