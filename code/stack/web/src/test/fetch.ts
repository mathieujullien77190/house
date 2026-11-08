// Doubles de `fetch` pour les tests : une réponse JSON, ou un échec réseau.
export const reply = (body: unknown = {}, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers })

/** Remplace `fetch` par un double ; chaque appel passe par `handler(path, init)`. */
export const stubFetch = (handler: (path: string, init?: RequestInit) => Response | Promise<Response>) => {
  const spy = vi.fn((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve().then(() => handler(String(input), init)))
  vi.stubGlobal('fetch', spy)
  return spy
}

/** Laisse passer les promesses en attente (sans avancer les minuteurs simulés). */
export const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}
