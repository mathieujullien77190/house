# web – la WebApp

Projet Vite + React + TypeScript à part, mêmes conventions que le site (style commun : `../CLAUDE.md`). Compilé dans l'image de l'API, servi par elle sur le port 8080.

- À ouvrir en HTTPS sur l'IP du PC ou sur `localhost` : `../docs/securite.md`.
- Le rendu vient de **`@house/ui`** (`../ui`). Ici ne restent que les **conteneurs** (état, hooks, appels) : pas de `UI.tsx`.

## Fichiers clés

- `lib/api.ts` : client de House API. La clé n'est jamais gardée : l'en-tête `X-House-Key` sert le temps de la saisie, `/auth` ouvre la session par cookie (`../docs/securite.md`).
- `lib/useHouse.ts` : la clé et son statut (essaie d'abord le cookie), caméras et événements rafraîchis chaque seconde.
- `lib/useAcUnits.ts`, `lib/useShutters.ts` : lecture et ordres, **partagés** entre l'onglet et l'aperçu de la carte de Home.
- `lib/homeSelection.ts` : la sélection de la carte de Home, **état global** qui survit au démontage de la Home.
- `components/App` : barre du haut (`TopBar` de `@house/ui`), clé (`KeyForm`), sept onglets (`TABS`). Ouvre sur **Home** (`DEFAULT_TAB`). Pas d'onglet API sur téléphone.
- `ApiExplorer` : les services de l'API (liste dans `constants.ts`, à compléter quand l'API gagne un service).

## Barre du haut

- Le titre rafraîchit la page.
- Météo (`components/Weather`, `lib/useWeather.ts`) : Open-Meteo lu par le navigateur, sans clé, toutes les 15 min.
- Suivie de « · 🏠 22° » : la température du salon lue par sa clim (`lib/useHomeTemperature.ts`, `/ac`, toutes les 30 s ; rien si inconnue).
- Un clic sur la météo ouvre la prévision des 24 h ; un clic ailleurs ou Échap la ferme.
- Sur téléphone, un menu « sandwich » regroupe les onglets ; météo et bouton des notifications restent dans la barre.

## Détail par composant

| Je travaille sur… | Je lis |
|---|---|
| Home, carte avec caméras et lampes | `Home/`, `HouseMap/`, `MapPlan/` |
| Onglet Caméras : mosaïque, clips sauvegardés | `CameraMosaic/`, `SavedClips/` |
| Détail d'une caméra, frise | `CameraCard/`, `Timeline/` |
| Lumière, Volet, Clim, Prise | `Lights/`, `ShuttersPanel/`, `AcPanel/`, `PlugPanel/` |

Chemins : `src/components/<nom>/CLAUDE.md`.

## Notifications de mouvement

`lib/useMotionNotifications.ts`, `public/sw.js`.

- Le bouton 🔔 demande l'accord une fois, enregistre le service worker et garde le choix (`localStorage` `house-notify`).
- Ensuite, tant que la WebApp est ouverte (même onglet caché), un événement commencé il y a moins de 2 min affiche « Mouvement · caméra ».
- **Ce n'est pas du push** : onglet fermé ou endormi, rien n'arrive. Le vrai push (Web Push, VAPID) reste à faire.
- Demande HTTPS.

## Développement et tests

- `npm install`, `npm run dev` (port 5180, services relayés vers l'API).
- Tests : Vitest + Testing Library + jsdom, un `*.test.ts(x)` à côté du code. `npm run test:coverage` exige **100 %** sur `src/**` (hors `main.tsx`, `types.ts`, `index.ts` de réexport).
- MapLibre, `@house/ui` et les hooks sont simulés (`vi.mock`). React Compiler est coupé sous Vitest (`process.env.VITEST`) : il fausserait la couverture.
- Vérifications : `npm run typecheck && npm run lint && npm run test:coverage && npm run build`.
- Déploiement : `../docs/deploiement.md` (la WebApp part avec l'API).
