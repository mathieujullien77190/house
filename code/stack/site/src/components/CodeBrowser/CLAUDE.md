# CodeBrowser – la vue « Code »

Affiche les fichiers de `code/stack` avec une explication chacun.

- **Tout fichier ajouté dans `code/stack` y apparaît** ; son explication va dans `constants.ts` (`EXPLANATIONS`).
- `UI.tsx`, `types.ts`, `constants.ts`, `helpers.ts`, `index.ts`, `CLAUDE.md` ont une explication générique (`ROLE_EXPLANATIONS`) : rien à ajouter.
- Le site est dans `code/stack/site` : le glob lit `/../**` (un dossier plus haut que la racine Vite) ; ses clés `../x` donnent `x`, celles du site lui-même (`/Dockerfile`) donnent `site/Dockerfile`. Le glob n'affiche du site que `CLAUDE.md`, `Dockerfile`, `nginx.conf` (pas `src/`, `public/`, ni ses fichiers de config).
- Le glob ignore `node_modules`, `dist`, `storybook-static`, `package-lock.json` (sinon Vite recharge à chaque écriture).
