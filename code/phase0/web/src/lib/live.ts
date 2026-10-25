/** L'adresse du direct d'une caméra : le cookie de session ouvert par /auth autorise la balise <img>. */
export const liveSrc = (camera: string): string => `/stream?camera=${encodeURIComponent(camera)}`
