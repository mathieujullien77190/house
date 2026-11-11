# web – la WebApp

Projet Vite + React + TypeScript à part (mêmes conventions que le site : un dossier par composant, Tailwind, alias `@/`, TypeScript strict, ESLint ; style commun aux deux apps : `../CLAUDE.md`). Compilé dans l'image de l'API, servi par elle sur le port 8080. À ouvrir en HTTPS sur l'IP du PC ou sur `localhost` (un hôte du certificat) : `../docs/securite.md`.

Le rendu vient du paquet **`@house/ui`** (`../ui`, voir son CLAUDE.md) : ici ne restent que les **conteneurs** (état, hooks, appels, calculs) qui passent les props aux composants dumb. Pas de `UI.tsx` dans ce projet.

## Fichiers clés

- `lib/api.ts` : le client de House API. La clé est dans l'en-tête `X-House-Key` le temps de la saisie, jamais gardée (ni code, ni stockage du navigateur) : `/auth` ouvre la session par cookie, que le navigateur renvoie ensuite tout seul (clé vide dans l'en-tête, le cookie suffit). Principe : `../docs/securite.md`.
- `lib/useAcUnits.ts`, `lib/useShutters.ts` : la lecture et les ordres des climatisations et des volets, **partagés** entre l'onglet (`AcPanel`, `ShuttersPanel`) et l'aperçu de la carte de Home (`AcPreview`, `ShutterPreview`).
- `lib/homeSelection.ts` : la sélection de la carte de Home (caméra, chauffage, clim, volet, emoji de clip), **un état global** qui survit au démontage de la Home (changement d'onglet).
- `lib/useHouse.ts` : la clé et son statut (au départ il essaie le cookie : une page rouverte ne redemande pas la clé), les caméras et les événements, rafraîchis chaque seconde.
- `components/App` : **une barre du haut toujours visible** (`TopBar` de `@house/ui` : le titre, dont un clic rafraîchit la page, les onglets, **la météo** (`components/Weather`, `info` de `TopBar` : un petit dessin (soleil, nuage, pluie…), la température et le nom du lieu (grand écran), puis **« · 🏠 22° » : la température de la maison, celle de la pièce du salon lue par sa climatisation, séparée de celle de dehors par un point et précédée d'un emoji maison** (« 12° · 🏠 22° ») (`lib/useHomeTemperature.ts`, `/ac`, relue toutes les 30 s ; rien tant qu'elle est inconnue ; et le nom du lieu n'est plus écrit), lus **par le navigateur** pour la météo sur Open-Meteo, sans clé, toutes les 15 min, `lib/useWeather.ts` ; le point est dans `Weather/constants.ts` ; **un clic ouvre sous la barre la prévision heure par heure des 24 prochaines heures** : l'heure, le dessin, la température, la chance de pluie et le cumul ; un clic ailleurs ou Échap la ferme) ; plus de bouton « Oublier la clé » (retiré : la session par cookie suffit, à remettre au besoin) ; **sur téléphone, un bouton « sandwich » en haut à droite ouvre un menu** avec les onglets, la météo et le bouton des notifications (`barActions`, juste à gauche du sandwich) restant dans la barre), la clé (`KeyForm`), puis sept onglets (`Tabs`, `TABS`, la page s'ouvre sur **Home**, `DEFAULT_TAB` ; **l'onglet API n'existe pas sur téléphone**).
- `ApiExplorer` : les services de l'API (liste dans `constants.ts`, à compléter quand l'API gagne un service), rangés par type : Général, Caméra, Lumière, Volet, Prise ; un clic montre la réponse JSON.

## Le détail par onglet et par composant (un CLAUDE.md dans chaque dossier)

| Je travaille sur… | Je lis |
|---|---|
| **Home** : la carte de la maison (caméras et lampes) | `src/components/Home/CLAUDE.md`, `src/components/HouseMap/CLAUDE.md` |
| **Clips sauvegardés** (en bas de l'onglet Caméras) | `src/components/SavedClips/CLAUDE.md` |
| **Caméras**, la mosaïque (vignettes, dernier événement, lu / non lu, mise en page) | `src/components/CameraMosaic/CLAUDE.md` |
| La carte de la maison (MapLibre, couches, modification, plan gardé par l'API) | `src/components/MapPlan/CLAUDE.md` |
| Le détail d'une caméra (direct, clip, zone, alimentation, portrait, zoom, partage, enregistrer) | `src/components/CameraCard/CLAUDE.md` |
| La frise (fenêtre, événements, version téléphone) | `src/components/Timeline/CLAUDE.md` |
| **Lumière** (liste Hue, carte, positions des lampes) | `src/components/Lights/CLAUDE.md` |
| **Volet** (volets roulants, simulation tant que l'ESP32 n'est pas branché) | `src/components/ShuttersPanel/CLAUDE.md` |
| **Clim** (climatisations Mitsubishi : allumer, mode, consigne, ventilateur) | `src/components/AcPanel/CLAUDE.md` |
| **Prise** | `src/components/PlugPanel/CLAUDE.md` |

## Notifications de mouvement

`lib/useMotionNotifications.ts`, `public/sw.js` : le bouton **🔔** (l’icône seule, 🔕 si le navigateur les bloque ; le texte est dans l’infobulle) (dans la barre du haut, ou le menu sur téléphone) demande l'accord du navigateur une fois, enregistre le service worker `/sw.js` et mémorise le choix (`localStorage` `house-notify`) ; ensuite, **tant que la WebApp est ouverte, même dans un onglet caché**, chaque nouvel événement (commencé il y a moins de 2 min, jamais ceux d'avant l'activation) affiche « Mouvement · caméra » et l'heure, par le service worker (seul moyen sur Android) ou `new Notification` ; un clic ramène sur la WebApp. **Ce n'est pas du push** : sans onglet ouvert, ou si le navigateur endort l'onglet (téléphone surtout), rien n'arrive ; le vrai push (Web Push, clés VAPID) reste à faire. Demande HTTPS.

## Développement et tests

`npm install`, `npm run dev` (port 5180, services relayés vers l'API).

**Tests** : Vitest + Testing Library + jsdom (`vitest.config.ts`, init dans `src/test/setup.ts`, doubles de `fetch` dans `src/test/fetch.ts`), un `*.test.ts(x)` à côté du code ; `npm test` les lance, `npm run test:coverage` exige **100 %** (lignes, fonctions, branches, instructions) sur `src/**` (hors `main.tsx`, `types.ts` et les `index.ts` de réexport). Les tests ne sont pas dans le build ; MapLibre, `@house/ui` (pour les composants à gestes) et les hooks sont simulés avec `vi.mock`. React Compiler (`vite.config.ts`) n'est pas appliqué sous Vitest (`process.env.VITEST`) : son code ajouté fausserait la couverture.

Vérifications : `npm run typecheck && npm run lint && npm run test:coverage && npm run build`. Déploiement : `../docs/deploiement.md` (la WebApp part avec l'API).
