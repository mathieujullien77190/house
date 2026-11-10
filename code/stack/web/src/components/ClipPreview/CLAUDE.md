# ClipPreview – l'aperçu d'un clip sur la carte

Ce que montre la carte de Home (`../HouseMap/CLAUDE.md`) quand on **choisit l'emoji d'un clip** (`../ClipEmoji/CLAUDE.md`) : sur grand écran, un clic sur l'emoji place la carte sur `PREVIEW_VIEW` et affiche cet aperçu **en haut à droite**, comme la miniature d'une caméra, le chauffage ou une clim. Un clic à côté le ferme ; un **double clic** sur l'emoji ouvre le clip dans l'onglet Caméras (le détail de sa caméra, `onOpenCamera(caméra, id du clip)`, le clip lancé) ; sur téléphone la carte n'est pas montrée.

- La vidéo du clip (`ClipPlayer`, ou `PortraitClip` pour une caméra en portrait : lu droit) avec ses commandes, la copie légère H.264 si elle existe (`playablePath`).
- Une ligne « 🦊 caméra · date et heure » : un clic dessus ouvre le clip comme le double clic ; la note du clip dessous, s'il y en a une.
