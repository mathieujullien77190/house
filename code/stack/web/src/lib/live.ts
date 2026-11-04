/** L'adresse du direct d'une caméra : le cookie de session ouvert par /auth autorise la balise <img>. `hd` : le 4K au lieu du léger. */
export const liveSrc = (camera: string, hd = false): string => `/stream?camera=${encodeURIComponent(camera)}${hd ? '&quality=hd' : ''}`
