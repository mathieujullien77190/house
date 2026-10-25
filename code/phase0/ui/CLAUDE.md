# ui – le paquet @house/ui

Les composants **dumb** des deux apps (WebApp `web/` et page de House Sync `sync/web/`) : aucun état métier, aucun appel réseau, tout arrive par props. Les deux apps le consomment **en source** (`"@house/ui": "file:../ui"`, un lien dans `node_modules`) : pas de build, pas de `dist`.

- `src/index.ts` : le barrel public. `src/tokens.css` : les couleurs de la maison (`@theme` Tailwind), importées par chaque app après Tailwind, avec `@source` vers `ui/src` pour que Tailwind lise les classes du paquet.
- `src/components/<Nom>/` : `Nom.tsx`, `constants.ts` (textes et classes Tailwind), `types.ts`, `helpers.ts` (fonctions pures de présentation), `index.ts`. **Imports relatifs entre composants** (`../Button`) : c'est la seule exception à la règle « jamais de `../` », parce que le paquet n'a pas d'alias résolu par ses consommateurs.
- Composants : `Button`, `Tabs`, `Page` + `PageHeader`, `Notice`, `SectionTitle`, `KeyForm`, `Pager`, `DataTable`, `Totals`, `MediaPanel`, `ClipPlayer`, `SnapshotImage`, `Timeline`, `CameraCard`, `ApiExplorer`, `PageFrame`.
- Un composant qui a besoin d'un ref ou d'un effet de présentation (`ClipPlayer` qui saute à une position) reste dumb : il ne tient aucune donnée.

## Storybook

`npm run storybook` (port 6006), `npm run build-storybook`. Une story = un dossier `stories/<Section>/<Cas>/` avec `Cas.stories.tsx`, la prose `Cas.fr.md` et `Cas.en.md` (deux phrases : ce que le cas montre, la chose non évidente), et un `<Story>.source.md` par story (le snippet du point de vue du consommateur, qui importe depuis `@house/ui`). Helpers : `stories/source.ts` (`source()` sur la story, jamais sur le meta), `stories/i18n.ts` (`prose({ fr, en })` sur le meta), `stories/decorators.tsx` (`boxed`). Sections, dans l'ordre de `.storybook/preview.ts` : Base, Formulaires, Données, Médias, Caméras, Pages. Un composant interactif a un petit composant de démo dans le fichier de story, qui tient l'état.

## Côté apps

Les apps gardent les conteneurs (état, hooks, appels, calculs) et passent les props. Vite : `resolve.preserveSymlinks: true`, `dedupe: ['react', 'react-dom']`, `optimizeDeps.exclude: ['@house/ui']` ; TypeScript : `preserveSymlinks: true`. Docker : le contexte de build est `phase0` et copie `ui/` à côté de l'app avant `npm ci`.

Vérifications : `npm run typecheck && npm run lint && npm run build-storybook`.
