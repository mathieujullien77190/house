# Home – le premier onglet

Premier onglet de la barre et onglet d'ouverture (`DEFAULT_TAB` de `App/constants.ts`, y compris au rechargement et au clic sur le titre « House », qui rafraîchit la page).

- **La maison et le jardin en 3D** (`components/Kitchen3D`, `../Kitchen3D/CLAUDE.md`) : rien d'autre. Il n'y a plus de plan 2D ni de carte.
- **Chargée à part** : `React.lazy` dans `Home.tsx` (Three.js n'est pas dans le premier paquet), « Chargement de la vue 3D… » en attendant (`LOADING_3D_TEXT`).
- **Clics** : ampoules, clims et volets se commandent dans la scène ; un clic sur une caméra de la scène ouvre l'onglet Caméras sur elle (`onOpenCamera`, câblé par `App/UI.tsx`).
- **Home reste montée quand on change d'onglet** (`App/UI.tsx` : seulement `hidden`) : la scène et le point de vue restent toute la session. Cachée, la vue n'est plus dessinée (`IntersectionObserver`) et sa largeur nulle est ignorée ; elle reprend sa taille au retour (`ResizeObserver`).
- Sur téléphone, l'écran d'une caméra et la télécommande TV remplacent toute la page : la Home est alors démontée, la scène est reconstruite au retour.
- Les clips sauvegardés sont en bas de l'onglet Caméras (`../SavedClips/CLAUDE.md`).
