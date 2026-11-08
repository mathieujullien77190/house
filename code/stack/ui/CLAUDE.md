# ui – le paquet @house/ui

Les composants **dumb** des deux apps (WebApp `web/` et page de House Sync `sync/web/`) : aucun état métier, aucun appel réseau, tout arrive par props. Les deux apps le consomment **en source** (`"@house/ui": "file:../ui"`, un lien dans `node_modules`) : pas de build, pas de `dist`. Conventions de dossier : `../../../CLAUDE.md` (« Conventions de code »).

- `src/index.ts` : le barrel public. `src/tokens.css` : les couleurs de la maison (`@theme` Tailwind), importées par chaque app après Tailwind, avec `@source` vers `ui/src` pour que Tailwind lise les classes du paquet.
- `src/components/<Nom>/` : `Nom.tsx`, `constants.ts` (textes et classes Tailwind), `types.ts`, `helpers.ts` (fonctions pures de présentation), `index.ts`. **Imports relatifs entre composants** (`../Button`) : c'est la seule exception à la règle « jamais de `../` », parce que le paquet n'a pas d'alias résolu par ses consommateurs.
- **La liste des composants et leurs options** : `src/components/CLAUDE.md`.
- `src/plan.ts` : les types du plan de la maison (`PlanLamp`, `PlanRoom`, `PlanWall`, `PlanTree`, `PlanHedge`, `PlanGate`, `PlanCamera`, `PlanPlug`, `PlanRect`), de simples données. Le paquet ne dessine pas le plan : la WebApp le dessine sur sa carte MapLibre (`../web/src/components/MapPlan/CLAUDE.md`).
- Un composant qui a besoin d'un ref ou d'un effet de présentation (`ClipPlayer` qui saute à une position) reste dumb : il ne tient aucune donnée.

## Storybook

`npm run storybook` (port 6006), `npm run build-storybook`. Une story = un dossier `stories/<Section>/<Cas>/` avec `Cas.stories.tsx`, la prose `Cas.fr.md` et `Cas.en.md` (deux phrases : ce que le cas montre, la chose non évidente), et un `<Story>.source.md` par story (le snippet du point de vue du consommateur, qui importe depuis `@house/ui`). Helpers : `stories/source.ts` (`source()` sur la story, jamais sur le meta), `stories/i18n.ts` (`prose({ fr, en })` sur le meta), `stories/decorators.tsx` (`boxed`). Sections, dans l'ordre de `.storybook/preview.ts` : Base, Formulaires, Données, Médias, Caméras, Pages. Un composant interactif a un petit composant de démo dans le fichier de story, qui tient l'état. Le site sert ce Storybook compilé (`npm run build:storybook` à la racine : `../../../CLAUDE.md`).

## Mobile

Un composant se lit de 360 à 1024 px sans défilement horizontal, puis passe à sa version bureau avec `lg:` (1024 px), le seul point de rupture. Sous 1024 px : une colonne, `Button` et `Tabs` plus hauts (cible tactile), `SpecList` empile le nom au-dessus de sa valeur, `PieChart` se centre, `DataTable` montre chaque ligne en fiche « nom : valeur » (la ligne d'en-tête disparaît ; chaque cellule porte un `data-label`) au lieu d'un tableau qui défile de côté. Les valeurs longues (chemins, adresses) se coupent (`[overflow-wrap:anywhere]`) au lieu d'élargir la colonne : `minmax(0,1fr)` plutôt que `1fr`.

## Côté apps

Les apps gardent les conteneurs (état, hooks, appels, calculs) et passent les props. Vite : `resolve.preserveSymlinks: true`, `dedupe: ['react', 'react-dom']`, `optimizeDeps.exclude: ['@house/ui']` ; TypeScript : `preserveSymlinks: true`. Docker : le contexte de build est le dossier `stack` et copie `ui/` à côté de l'app avant `npm ci`.

## Tests

Vitest + Testing Library + jsdom, comme `web/` : `npm test` (une passe) et `npm run test:coverage` (seuils de 100 % en lignes, branches, fonctions et instructions, dans `vitest.config.ts`). Un `Nom.test.tsx` à côté de chaque composant (comportement vu de l'extérieur : rôles, textes, appels des props), les helpers testés avec leur composant. `src/test/setup.ts` charge `jest-dom` ; `src/test/media.ts` simule `<video>` / `<audio>` (jsdom n'en lit aucun : lecture, position, durée, événements) pour `ClipPlayer`.

Hors de la mesure de couverture (`vitest.config.ts`) : les tests et `src/test/`, les barrels `index.ts` et les `types.ts` (aucune instruction exécutable). Les stories (`stories/`) ne sont pas dans `src`.

Vérifications : `npm run typecheck && npm run lint && npm run test:coverage && npm run build-storybook`.
