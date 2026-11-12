# CodeBrowser – la vue « Code »

Affiche les fichiers de `code/stack` avec une explication chacun.

- **Tout fichier ajouté dans `code/stack` y apparaît** ; son explication va dans `constants.ts` (`EXPLANATIONS`).
- `UI.tsx`, `types.ts`, `constants.ts`, `helpers.ts`, `index.ts`, `CLAUDE.md` ont une explication générique (`ROLE_EXPLANATIONS`) : rien à ajouter.
- Le glob ignore `node_modules`, `dist`, `storybook-static`, `package-lock.json` (sinon Vite recharge à chaque écriture).
