# Home – le premier onglet

Premier onglet de la barre. Ce n'est plus l'onglet d'ouverture : la WebApp s'ouvre sur l'onglet Test (`DEFAULT_TAB` de `App/constants.ts`, y compris au rechargement et au clic sur le titre « House », `onTitle` de `TopBar`, qui rafraîchit la page). La Home est pourtant montée dès l'ouverture, cachée.

- **La carte** (`components/HouseMap`, `../HouseMap/CLAUDE.md`, `../MapPlan/CLAUDE.md`) : toit caché. `App` lui donne les vraies caméras.
- Clics : voir `../HouseMap/CLAUDE.md` (aperçus et double clics).
- **Téléphone (sous 1024 px)** : carte en paysage qui remplit la place sous la barre (`fill`, `fitHeight`, 15 rem au moins) ; un clic ouvre directement la page de l'objet.
- **Home reste montée quand on change d'onglet** (`App/UI.tsx` : seulement `hidden`). Bloc ou clip choisi, flux des miniatures et vue de la carte restent toute la session ; la carte se redimensionne au retour (`ResizeObserver`). Sélection : `lib/homeSelection.ts`.
- Les clips sauvegardés sont en bas de l'onglet Caméras (`../SavedClips/CLAUDE.md`).
