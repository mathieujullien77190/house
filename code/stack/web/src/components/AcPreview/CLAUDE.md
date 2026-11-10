# AcPreview – l'aperçu d'une climatisation sur la carte

Ce que montre la carte de Home (`../HouseMap/CLAUDE.md`) quand on **choisit un split** : sur grand écran, un clic sur son icône place la carte sur `PREVIEW_VIEW` et affiche cet aperçu **à droite, à côté de la limite de propriété et en face du split**, comme la miniature d'une caméra ou l'aperçu du chauffage. Un clic à côté le ferme ; un **double clic** sur l'icône ouvre l'onglet Clim ; sur téléphone, un clic ouvre directement l'onglet Clim.

- **Le même bloc que l'onglet Clim** (`../AcPanel/AcUnitCard.tsx`, partagé) : On / Off, état, mode, consigne (− / +), ventilateur, ailette. Les ordres partent par `setAc` ; la réponse de l'API s'affiche tout de suite.
- L'état est relu toutes les 10 s (`fetchAc`). Pas de bouton d'ouverture : le double clic sur l'icône ouvre l'onglet Clim.
