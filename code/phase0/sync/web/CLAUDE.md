# sync/web – la page de House Sync

Projet Vite + React + TypeScript à part (mêmes conventions que le site : un dossier par composant, Tailwind, alias `@/`, TypeScript strict, ESLint). Compilé dans l'image de House Sync, servi par lui sur le port 8081.

- `lib/api.ts` : les services de House Sync (`/login`, `/logout`, `/api/overview`, `/api/table`, `/api/clips`, `/files/...`), session par cookie.
- `components/App` : la clé, puis la vue d'ensemble rechargée toutes les 15 s sauf média ouvert ; un compteur `refreshTick` fait recharger leur page aux tableaux.
- `Totals` : poids des vidéos, des images par minute, de la base.
- `TableSection` : une table de la base, paginée (20 lignes), une description par table dans `constants.ts` (`DESCRIPTIONS`) ; le rendu des cellules est dans `UI.tsx` (clip ou image → bouton « voir », adresse → lien, horodatage → date, étiquette → pastille).
- `ClipsSection` : les clips du disque backup, paginés.
- `MediaPanel` : le clip ou l'image ouvert, dans un panneau collant au-dessus des tableaux ; la vidéo démarre à l'ouverture, Fermer l'arrête, les tableaux ne changent pas de taille.
- `DataTable` et `Pager` : tableau paginé rendu pur, et sa pagination.

Développement : `npm install`, `npm run dev` (HTTPS sur 5181 avec le certificat de `data/certs`, services relayés vers House Sync). Vérifications : `npm run typecheck && npm run lint && npm run build`.
