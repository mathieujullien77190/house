# SavedClips – les clips sauvegardés

En bas de l'onglet **Caméras**, sous la mosaïque (`App/UI.tsx`), pas dans le détail d'une caméra.

- `GET /events?saved=1`, une vignette par clip : une **image fixe** (`components/ClipThumb`, `lib/useClipThumb.ts`), la première image de la vidéo copiée puis la vidéo lâchée, deux clips à la fois. Jamais une balise `<video>` par vignette : chacune gardait une connexion vers l'API, le navigateur n'en a que six en HTTP/1.1 (chaque direct en prend une), et le clip qu'on ouvrait ne se chargeait plus. Même raison pour `lib/useClipDuration.ts`, qui lâche sa vidéo dès la durée lue.
- Un clic ouvre le détail de la caméra **sur ce clip lancé** (`onOpenCamera(caméra, id)`) ; sans `onOpenCamera`, lecture sur place avec bouton retour.
- Un clip ouvert a : carré « ⛶ » plein écran (`components/FullscreenBox`), interrupteur Sauvegardé / Non sauvegardé (`PUT /clips/<id>/saved` : le clip quitte la liste), `ShareButton` (`../CameraCard/CLAUDE.md`).
- **Emoji** en haut à droite du clip (vignette et lecteur) : `../ClipEmoji/CLAUDE.md`.
- **Caméra en portrait** : vignette de la taille des autres ; lecteur `components/PortraitClip` (`RotatedMedia`, commandes droites en bas).
