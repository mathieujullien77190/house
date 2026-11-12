# SavedClips – les clips sauvegardés

En bas de l'onglet **Caméras**, sous la mosaïque (`App/UI.tsx`), pas dans le détail d'une caméra.

- `GET /events?saved=1`, une vignette par clip (première image, `preload="metadata"`).
- Un clic ouvre le détail de la caméra **sur ce clip lancé** (`onOpenCamera(caméra, id)`) ; sans `onOpenCamera`, lecture sur place avec bouton retour.
- Un clip ouvert a : carré « ⛶ » plein écran (`components/FullscreenBox`), interrupteur Sauvegardé / Non sauvegardé (`PUT /clips/<id>/saved` : le clip quitte la liste), `ShareButton` (`../CameraCard/CLAUDE.md`).
- **Emoji** en haut à droite du clip (vignette et lecteur) : `../ClipEmoji/CLAUDE.md`. Il s'affiche sur la carte de Home.
- **Caméra en portrait** : vignette de la taille des autres ; lecteur `components/PortraitClip` (`RotatedMedia`, commandes droites en bas).
