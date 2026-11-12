# Home – l'onglet de départ

Premier onglet et onglet d'ouverture (`DEFAULT_TAB`, y compris au rechargement). Un clic sur le titre « House » (`onTitle` de `TopBar`) rafraîchit la page, qui se rouvre sur Home.

- **La carte** (`components/HouseMap`, `../HouseMap/CLAUDE.md`, `../MapPlan/CLAUDE.md`) : toit caché. `App` lui donne les vraies caméras.
- Clics : voir `../HouseMap/CLAUDE.md` (aperçus et double clics).
- **Téléphone (sous 1024 px)** : carte en paysage qui remplit la place sous la barre (`fill`, `fitHeight`, 15 rem au moins) ; un clic ouvre directement la page de l'objet.
- **Home reste montée quand on change d'onglet** (`App/UI.tsx` : seulement `hidden`). Bloc ou clip choisi, flux des miniatures et vue de la carte restent toute la session ; la carte se redimensionne au retour (`ResizeObserver`). Sélection : `lib/homeSelection.ts`.
- Les clips sauvegardés sont en bas de l'onglet Caméras (`../SavedClips/CLAUDE.md`).
