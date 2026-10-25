# web – la WebApp

Projet Vite + React + TypeScript à part (mêmes conventions que le site : un dossier par composant, Tailwind, alias `@/`, TypeScript strict, ESLint). Compilé dans l'image de l'API, servi par elle sur le port 8080. À ouvrir en HTTPS sur l'IP du PC ou sur `localhost` (un hôte du certificat) : aucune connexion à Frigate n'est nécessaire.

Le rendu vient du paquet **`@house/ui`** (`../ui`, voir son CLAUDE.md) : ici ne restent que les **conteneurs** (état, hooks, appels, calculs) qui passent les props aux composants dumb. Pas de `UI.tsx` dans ce projet.

- `lib/api.ts` : le client de House API, la clé dans l'en-tête `X-House-Key` ; gardée dans l'onglet (`sessionStorage`), jamais dans le code.
- `lib/useHouse.ts` : la clé et son statut, les caméras et les événements, rafraîchis chaque seconde.
- `components/App` : la clé (`KeyForm`), puis deux onglets (`Tabs`) : **Caméras** et **API**. Pas d'onglet de plus (Frigate n'est plus dans la WebApp).
- `CameraCard` : en haut le **direct** (`<img src="/stream?camera=…">` : un flux MJPEG que l'API relaie depuis go2rtc, une seule requête, la session par cookie ouverte par `/auth`), remplacé par l'image gardée à l'instant choisi sur la frise (`SnapshotImage`) ou par le clip de l'événement choisi (`ClipPlayer`) ; « Maintenant » de la frise ramène au direct.
- `Timeline` : une fenêtre de temps (raccourcis 10 min à 7 j, molette pour zoomer, glisser pour se déplacer, ◀ ▶, « Maintenant »), un bloc par événement (hachuré rouge et allongé jusqu'au bord droit tant qu'il est en cours), la couverture en images (bande bleue), le curseur rouge. Clic sur l'axe → image de cet instant ; clic dans un bloc → le clip démarre à l'instant cliqué, la fenêtre se recadre pour que l'événement occupe la moitié de l'axe, le curseur suit la lecture (l'avance du clip sur l'événement se déduit de la durée de la vidéo). Calculs purs dans `helpers.ts`.
- `ApiExplorer` : les services de l'API (liste dans `constants.ts`), un clic montre la réponse JSON.

Développement : `npm install`, `npm run dev` (port 5180, services relayés vers l'API). Vérifications : `npm run typecheck && npm run lint && npm run build`.
