# CodeBrowser – la vue « Code »

Affiche les fichiers de `code/stack` avec une explication chacun (arbre, explication, code coloré).

- L'arbre s'affiche avec tous les dossiers fermés ; un clic sur un dossier l'ouvre ou le ferme (`open`, `visibleNodes`).
- **Tout fichier ajouté dans `code/stack` y apparaît** ; son explication va dans `constants.ts` (`EXPLANATIONS`). `UI.tsx`, `types.ts`, `constants.ts`, `helpers.ts`, `index.ts` et `CLAUDE.md` ont une explication générique dans `ROLE_EXPLANATIONS` : pas d'entrée à ajouter pour eux.
- Le glob ignore `node_modules`, `dist`, `storybook-static`, `package-lock.json` (sinon Vite recharge à chaque écriture).
