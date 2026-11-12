# ui – le paquet @house/ui

Composants **dumb** des deux apps (`web/` et `sync/web/`) : aucun état métier ni appel réseau, tout par props. Consommé **en source** (`"@house/ui": "file:../ui"`) : pas de build ni de `dist`. Conventions de dossier : `../../../CLAUDE.md`.

- `src/index.ts` : barrel public. `src/tokens.css` : couleurs de la maison (`@theme`), importé par chaque app après Tailwind, avec `@source` vers `ui/src`.
- `src/components/<Nom>/` : même structure que le reste du projet. **Imports relatifs entre composants** (`../Button`) : seule exception à « jamais `../` », le paquet n'a pas d'alias résolu par ses consommateurs.
- Liste des composants et options : `src/components/CLAUDE.md`.
- `src/plan.ts` : types du plan de la maison (`PlanLamp`, `PlanRoom`, `PlanWall`, `PlanTree`, `PlanHedge`, `PlanGate`, `PlanCamera`, `PlanPlug`, `PlanRect`), de simples données. Le plan est dessiné par la WebApp (`../web/src/components/MapPlan/CLAUDE.md`).
- Un composant avec ref ou effet de présentation (`ClipPlayer`) reste dumb : il ne tient aucune donnée.

## Storybook

`npm run storybook` (port 6006), `npm run build-storybook`.

- Une story = `stories/<Section>/<Cas>/` avec `Cas.stories.tsx`, `Cas.fr.md` et `Cas.en.md` (deux phrases : ce que le cas montre, la chose non évidente), et un `<Story>.source.md` par story (snippet côté consommateur, import depuis `@house/ui`).
- Helpers : `stories/source.ts` (`source()` sur la story, jamais sur le meta), `stories/i18n.ts` (`prose({ fr, en })` sur le meta), `stories/decorators.tsx` (`boxed`).
- Sections (ordre de `.storybook/preview.ts`) : Base, Formulaires, Données, Médias, Caméras, Pages.
- Un composant interactif a une démo dans le fichier de story, qui tient l'état.
- Le site sert ce Storybook compilé : `../../../CLAUDE.md`.

## Mobile

- Lisible de 360 à 1024 px sans défilement horizontal, version bureau avec `lg:` (le seul point de rupture).
- Sous 1024 px : une colonne, `Button` et `Tabs` plus hauts, `SpecList` empile nom et valeur, `PieChart` centré, `DataTable` en fiches « nom : valeur » (chaque cellule porte un `data-label`).
- Valeurs longues coupées (`[overflow-wrap:anywhere]`), `minmax(0,1fr)` plutôt que `1fr`.

## Côté apps

- Les apps gardent les conteneurs (état, hooks, appels, calculs).
- Vite : `resolve.preserveSymlinks: true`, `dedupe: ['react', 'react-dom']`, `optimizeDeps.exclude: ['@house/ui']`. TypeScript : `preserveSymlinks: true`.
- Docker : le contexte de build est `stack`, qui copie `ui/` à côté de l'app avant `npm ci`.

## Tests

- Vitest + Testing Library + jsdom. `npm test`, `npm run test:coverage` (100 % lignes, branches, fonctions, instructions).
- Un `Nom.test.tsx` par composant (comportement vu de l'extérieur), helpers testés avec lui.
- `src/test/setup.ts` charge `jest-dom` ; `src/test/media.ts` simule `<video>` / `<audio>` pour `ClipPlayer`.
- Hors couverture : tests, `src/test/`, barrels `index.ts`, `types.ts`.

Vérifications : `npm run typecheck && npm run lint && npm run test:coverage && npm run build-storybook`.
