/**
 * L'adresse du direct d'une caméra : le cookie de session ouvert par /auth autorise la balise <img>. `hd` : le 4K au lieu du léger.
 * `mobile` (écran de moins de 1024 px) : le flux dont la cadence se règle à part, dans House Sync.
 */
export const liveSrc = (camera: string, hd = false, mobile = false): string =>
  `/stream?camera=${encodeURIComponent(camera)}${hd ? '&quality=hd' : ''}${mobile ? '&screen=mobile' : ''}`
