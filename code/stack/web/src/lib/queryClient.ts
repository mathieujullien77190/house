import { QueryClient } from '@tanstack/react-query'

/**
 * Le cache des requêtes de la frise (TanStack Query). Un seul client pour la page, passé directement à `useQuery` (pas de fournisseur à monter) : revenir sur une
 * fenêtre déjà vue la montre tout de suite, puis la relit si elle a plus de `STALE_MS`.
 */
export const STALE_MS = 10_000
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: STALE_MS, retry: 1, refetchOnWindowFocus: false } } })
