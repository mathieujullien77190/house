# web – la WebApp

Projet Vite + React + TypeScript à part, mêmes conventions que le site (style commun : `../CLAUDE.md`). Compilé dans l'image de l'API, servi par elle sur le port 8080.

- À ouvrir en HTTPS sur l'IP du PC ou sur `localhost` : `../docs/securite.md`.
- Le rendu vient de **`@house/ui`** (`../ui`). Ici ne restent que les **conteneurs** (état, hooks, appels) : pas de `UI.tsx`.

## Fichiers clés

- `lib/api.ts` : client de House API. La clé n'est jamais gardée : l'en-tête `X-House-Key` sert le temps de la saisie, `/auth` ouvre la session par cookie (`../docs/securite.md`).
- `lib/useHouse.ts` : la clé et son statut (essaie d'abord le cookie), caméras et événements rafraîchis chaque seconde.
- `lib/useAcUnits.ts`, `lib/useShutters.ts` : lecture et ordres, **partagés** entre l'onglet et l'aperçu de la carte de Home.
- `lib/useBox.ts` : la Freebox (lecture, WiFi), **partagée** entre l'onglet Box et son aperçu.
- `lib/useClipThumb.ts`, `lib/useClipDuration.ts` : vignette (image fixe) et durée d'un clip, sans garder de vidéo ouverte (`components/SavedClips/CLAUDE.md`).
- `lib/useTv.ts` : la télécommande du Freebox Player (état, touches, association par code affiché sur la TV), pour l'onglet Box TV.
- `lib/homeSelection.ts` : la sélection de la carte de Home, **état global** qui survit au démontage de la Home.
- `components/App` : barre du haut (`TopBar` de `@house/ui`), clé (`KeyForm`), dix onglets (`TABS`, dont Box TV, Page invité et Test). Ouvre sur **Test** (`DEFAULT_TAB`) ; la Home est montée dès l'ouverture, cachée.

## Barre du haut

- Le titre rafraîchit la page.
- Météo (`components/Weather`, `lib/useWeather.ts`) : Open-Meteo lu par le navigateur, sans clé, toutes les 15 min.
- Suivie de « · 🏠 22° » : la température du salon lue par sa clim (`lib/useHomeTemperature.ts`, `/ac`, toutes les 30 s ; rien si inconnue).
- Elle donne aussi le vent (km/h, `wind_speed_10m`) : « 💨 X km/h » par heure dans la prévision et dans l'infobulle.
- Un clic sur la météo ouvre la prévision des 24 h ; un clic ailleurs ou Échap la ferme.
- Sur téléphone, un menu « sandwich » regroupe les onglets ; météo, bouton du thème et bouton des notifications restent dans la barre.
- **Thème** : clair par défaut (fond `#e9ecf1`), le réglage du système n'est **pas** suivi. Le bouton 🌙 / ☀️ de la barre (à côté de 🔔) bascule clair/sombre ; le choix est gardé sur l'appareil (`localStorage` `house-theme`, `lib/useTheme.ts`) et posé en attribut `data-theme` sur la page : les jetons de `@house/ui/tokens.css` et le variant Tailwind `dark:` (`@custom-variant` de `src/index.css`) le suivent.

## Détail par composant

| Je travaille sur… | Je lis |
|---|---|
| Home, carte avec caméras et lampes | `Home/`, `HouseMap/`, `MapPlan/` |
| Onglet Caméras : mosaïque, clips sauvegardés | `CameraMosaic/`, `SavedClips/` |
| Détail d'une caméra, frise | `CameraCard/`, `Timeline/` |
| Lumière, Volet, Clim, Prise, Box, Box TV | `Lights/`, `ShuttersPanel/`, `AcPanel/`, `PlugPanel/`, `BoxPanel/`, `TvPanel/` |
| Page invité (QR code, aperçu) et la page `/chezmatou` | `GuestPanel/`, `ChezMatou/` |
| Onglet Test : la maison et le jardin en 3D, qui suivent la maison (lampes Hue, volets, clims, heure) et se cliquent (ampoules, clims, volets, écrans qui montrent les caméras) | `Kitchen3D/` |

Chemins : `src/components/<nom>/CLAUDE.md`.

## La page « Chez Matou »

`main.tsx` n'affiche que `components/ChezMatou` quand le chemin est `/chezmatou` (la même application, sans clé de la WebApp : la page a sa propre clé `LAN_KEY` dans l'adresse, `lib/lanApi.ts`). L'onglet « Page invité » (`GuestPanel`) donne son QR code et un aperçu. Routes et garde : `../api/src/routes/CLAUDE.md`.

## Notifications de mouvement

`lib/useMotionNotifications.ts`, `public/sw.js`.

- Le bouton 🔔 demande l'accord une fois, enregistre le service worker et garde le choix (`localStorage` `house-notify`).
- Ensuite, tant que la WebApp est ouverte (même onglet caché), un événement commencé il y a moins de 2 min affiche « Mouvement · caméra ».
- **Ce n'est pas du push** : onglet fermé ou endormi, rien n'arrive. Le vrai push (Web Push, VAPID) reste à faire.
- Demande HTTPS.

## Développement et tests

- `npm install`, `npm run dev` (port 5180, services relayés vers l'API).
- Tests : Vitest + Testing Library + jsdom, un `*.test.ts(x)` à côté du code. `npm run test:coverage` exige **100 %** sur `src/**` (hors `main.tsx`, `types.ts`, `index.ts` de réexport).
- MapLibre, `@house/ui` et les hooks sont simulés (`vi.mock`). Three.js est le vrai, sauf `WebGLRenderer` et `OrbitControls` (jsdom n'a pas de WebGL) ; doubles du canevas, des images et des vidéos hors page : `src/test/canvas.ts`. React Compiler est coupé sous Vitest (`process.env.VITEST`) : il fausserait la couverture.
- Vérifications : `npm run typecheck && npm run lint && npm run test:coverage && npm run build`.
- Déploiement : `../docs/deploiement.md` (la WebApp part avec l'API).
