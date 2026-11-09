# web – la WebApp

Projet Vite + React + TypeScript à part (mêmes conventions que le site : un dossier par composant, Tailwind, alias `@/`, TypeScript strict, ESLint ; style commun aux deux apps : `../CLAUDE.md`). Compilé dans l'image de l'API, servi par elle sur le port 8080. À ouvrir en HTTPS sur l'IP du PC ou sur `localhost` (un hôte du certificat) : `../docs/securite.md`.

Le rendu vient du paquet **`@house/ui`** (`../ui`, voir son CLAUDE.md) : ici ne restent que les **conteneurs** (état, hooks, appels, calculs) qui passent les props aux composants dumb. Pas de `UI.tsx` dans ce projet.

## Fichiers clés

- `lib/api.ts` : le client de House API. La clé est dans l'en-tête `X-House-Key` le temps de la saisie, jamais gardée (ni code, ni stockage du navigateur) : `/auth` ouvre la session par cookie, que le navigateur renvoie ensuite tout seul (clé vide dans l'en-tête, le cookie suffit). Principe : `../docs/securite.md`.
- `lib/useHouse.ts` : la clé et son statut (au départ il essaie le cookie : une page rouverte ne redemande pas la clé), les caméras et les événements, rafraîchis chaque seconde.
- `components/App` : **une barre du haut toujours visible** (`TopBar` de `@house/ui` : le titre, qui ramène à Home, les onglets, le nombre de caméras, de lampes et de prises (« 2 caméras / 19 lampes / 1 prise » ; `lib/usePlugCount.ts`, 1 tant que `/plug` répond ; les lampes : `Lights/useLampCount.ts`), « Oublier la clé » ; **sur téléphone, un bouton « sandwich » en haut à droite ouvre un menu** avec les onglets, le compte et « Oublier la clé »), la clé (`KeyForm`), puis six onglets (`Tabs`, `TABS`, la page s'ouvre sur **Caméras**, `DEFAULT_TAB`).
- `ApiExplorer` : les services de l'API (liste dans `constants.ts`, à compléter quand l'API gagne un service), rangés par type : Général, Caméra, Lumière, Volet, Prise ; un clic montre la réponse JSON.

## Le détail par onglet et par composant (un CLAUDE.md dans chaque dossier)

| Je travaille sur… | Je lis |
|---|---|
| **Home** : clips sauvegardés, lien de la page invité | `src/components/Home/CLAUDE.md` |
| **Caméras**, la mosaïque (vignettes, dernier événement, lu / non lu, mise en page) | `src/components/CameraMosaic/CLAUDE.md` |
| La carte de la maison (MapLibre, couches, modification, plan gardé par l'API) | `src/components/MapPlan/CLAUDE.md` |
| Le détail d'une caméra (direct, clip, zone, alimentation, portrait, zoom, partage, enregistrer) | `src/components/CameraCard/CLAUDE.md` |
| La frise (fenêtre, événements, version téléphone) | `src/components/Timeline/CLAUDE.md` |
| **Lumière** (liste Hue, carte, positions des lampes) | `src/components/Lights/CLAUDE.md` |
| **Volet** (volets roulants, simulation tant que l'ESP32 n'est pas branché) | `src/components/ShuttersPanel/CLAUDE.md` |
| **Prise** | `src/components/PlugPanel/CLAUDE.md` |

## Notifications de mouvement

`lib/useMotionNotifications.ts`, `public/sw.js` : le bouton **« 🔔 Notifications »** (dans la barre du haut, ou le menu sur téléphone) demande l'accord du navigateur une fois, enregistre le service worker `/sw.js` et mémorise le choix (`localStorage` `house-notify`) ; ensuite, **tant que la WebApp est ouverte, même dans un onglet caché**, chaque nouvel événement (commencé il y a moins de 2 min, jamais ceux d'avant l'activation) affiche « Mouvement · caméra » et l'heure, par le service worker (seul moyen sur Android) ou `new Notification` ; un clic ramène sur la WebApp. **Ce n'est pas du push** : sans onglet ouvert, ou si le navigateur endort l'onglet (téléphone surtout), rien n'arrive ; le vrai push (Web Push, clés VAPID) reste à faire. Demande HTTPS.

## Développement et tests

`npm install`, `npm run dev` (port 5180, services relayés vers l'API).

**Tests** : Vitest + Testing Library + jsdom (`vitest.config.ts`, init dans `src/test/setup.ts`, doubles de `fetch` dans `src/test/fetch.ts`), un `*.test.ts(x)` à côté du code ; `npm test` les lance, `npm run test:coverage` exige **100 %** (lignes, fonctions, branches, instructions) sur `src/**` (hors `main.tsx`, `types.ts` et les `index.ts` de réexport). Les tests ne sont pas dans le build ; MapLibre, `@house/ui` (pour les composants à gestes) et les hooks sont simulés avec `vi.mock`. React Compiler (`vite.config.ts`) n'est pas appliqué sous Vitest (`process.env.VITEST`) : son code ajouté fausserait la couverture.

Vérifications : `npm run typecheck && npm run lint && npm run test:coverage && npm run build`. Déploiement : `../docs/deploiement.md` (la WebApp part avec l'API).
