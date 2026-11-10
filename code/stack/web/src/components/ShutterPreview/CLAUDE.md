# ShutterPreview – l'aperçu d'un volet roulant sur la carte

Ce que montre la carte de Home (`../HouseMap/CLAUDE.md`) quand on **choisit un volet** : sur grand écran, un clic sur son icône place la carte sur `PREVIEW_VIEW` et affiche cet aperçu **en haut à droite**, comme la miniature d'une caméra ou le bloc d'une clim. Un clic à côté le ferme ; un **double clic** sur l'icône ouvre l'onglet Volet ; sur téléphone, un clic ouvre directement l'onglet Volet. **Un clic ne descend plus ni ne monte le volet** : il montre son bloc, les ordres se donnent dedans.

- **Le même bloc que l'onglet Volet** (`../ShuttersPanel/ShutterCard.tsx`, partagé) : Monter, Stop, Descendre, « Fermer à moitié » (volets qui ont un temps de fermeture), le dernier ordre, les deux cases de l'action automatique.
- **La lecture et les ordres sont ceux de l'onglet Volet** : le hook partagé `lib/useShutters.ts` (relu toutes les 10 s, 2 s pendant un « Fermer à moitié » ; ordres, « Fermer à moitié » et cases automatiques). La réponse de l'API s'affiche tout de suite après un ordre.
