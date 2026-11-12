# CameraMosaic – la vue de l'onglet Caméras

Grille du direct de toutes les caméras : `CameraMosaic` + `LiveTile`, une `CameraTile` de `@house/ui` par caméra. En direct, chaque vignette porte les indicateurs de `CameraIndicators` (détail : `../CameraCard/CLAUDE.md`).

## Contenu d'une vignette

- Température du détecteur en bas à gauche (`overlay`, `CAMERA_SENSOR`).
- Caméra éteinte ou en démarrage : cadre noir avec le message.
- **Sous la vignette, le dernier événement** (`footer`) : « Dernier : person · début du clip · durée du clip ».
  - L'heure est `clip_started_at`, la durée est lue dans la vidéo (`lib/useClipDuration.ts`, gardée par `lib/clipDurations.ts`).
  - Partout (carte, frise, partage, Home), `describeEvent` donne début et durée **du clip**, pas du mouvement ; sans durée connue, elle n'est pas écrite.
- **Non lu / Lu ✓** : le clip a déjà été ouvert **sur cet appareil** (`lib/useReadClips.ts`, `localStorage` `house-read-clips`, 500 identifiants au plus). `CameraCard` appelle `onRead` à l'ouverture, par n'importe quel chemin.

## Clics

- Une vignette ouvre le détail (`CameraCard`) ; rien ne se lit tout seul.
- La ligne du dernier événement ouvre la caméra **sur ce clip** (`onOpenFooter`, `initialEventId`).
- « ← Toutes les caméras » ramène à la mosaïque (`App` retient la caméra ouverte).
- Le direct n'est ouvert que pour ce qui est affiché : la mosaïque ferme ses flux quand on ouvre un détail.

## Mise en page

- Ordre (`MOSAIC_ORDER`) : `voliere-interieur`, `voliere-toit`, `voliere-exterieur`, `salon-de-jardin`, puis les autres dans l'ordre de l'API. Même ordre de haut en bas sur téléphone.
- Grille (`GRID_CLASS`, `PLACEMENT`) : une colonne sous 1024 px, trois dès `lg:`.
  - Colonne 1 : `voliere-interieur` et `voliere-toit` dessous (`STACK_CAMERAS`).
  - Colonne 2 : `voliere-exterieur`. Colonne 3 : `salon-de-jardin`.
- Vignettes sans étirement ; espace identique (`gap-3`) en horizontal et vertical.
- **Portrait** : vidéo de 530 px de haut (`--big-h`, `TILE_PORTRAIT_CLASS`, 298 px de large). Si la colonne 2 est en portrait, elle fait exactement 298 px (`GRID_PORTRAIT_MIDDLE_CLASS`), sinon du vide s'ajouterait.
- **Hauteurs égales** : les deux vidéos paysage empilées (colonne 1) doivent égaler la hauteur de la vignette portrait. `lib/useStackWidth.ts` mesure et pose `--col1` sur la grille (399 px avant la première mesure).
- La carte de la maison est dans Home (`../HouseMap/CLAUDE.md`). Sous la mosaïque : les clips sauvegardés (`../SavedClips/CLAUDE.md`).
