# sync/web – la page de House Sync

Projet Vite + React + TypeScript à part (mêmes conventions que le site : un dossier par composant, Tailwind, alias `@/`, TypeScript strict, ESLint). Compilé dans l'image de House Sync, servi par lui sur le port 8081. Le rendu vient du paquet **`@house/ui`** (`../../ui`) : ici ne restent que les conteneurs.

- `lib/api.ts` : les services de House Sync (`/login`, `/logout`, `/api/overview`, `/api/table`, `/api/clips`, `/files/...`), session par cookie. `lib/totals.ts` : les trois chiffres de tête.
- `components/App` : la clé, puis deux onglets, **Base** (les tables de la base, paginées) et **Disque** (les clips) ; la vue d'ensemble est rechargée toutes les 15 s sauf média ouvert, et un compteur `refreshTick` fait recharger leur page aux tableaux.
- `TableSection` : une table de la base, paginée (20 lignes) et **repliée par défaut sauf `events`** (`OPEN_BY_DEFAULT` ; le titre déplie ; la page n'est chargée qu'une fois dépliée), une description par table dans `constants.ts` (`DESCRIPTIONS`) ; le rendu des cellules est dans `UI.tsx` (clip ou image → bouton « voir », adresse → lien, horodatage → date, étiquette → pastille).
- `ClipsSection` : les clips du disque backup, paginés.
- `MediaPanel` : le clip ou l'image ouvert, dans le panneau collant de `@house/ui` au-dessus des tableaux ; la vidéo démarre à l'ouverture, Fermer l'arrête, les tableaux ne changent pas de taille.

Développement : `npm install`, `npm run dev` (HTTPS sur 5181 avec le certificat de `data/certs`, services relayés vers House Sync). Vérifications : `npm run typecheck && npm run lint && npm run build`.
