/** Remet en forme un corps JSON (2 espaces) ; un corps qui n'en est pas est rendu tel quel. */
export const prettify = (body: string): string => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}
