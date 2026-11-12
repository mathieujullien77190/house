# CameraCard – le détail d'une caméra

Conteneur de `CameraCard` de `@house/ui` (`../../../../ui/src/components/CLAUDE.md`). Depuis la mosaïque : `../CameraMosaic/CLAUDE.md`. Frise : `../Timeline/CLAUDE.md`.

`App` donne une `key` par caméra : l'écran est recréé à chaque changement, rien de la précédente ne reste (lampe, prise, zone, clip, son).

## Direct

- `<img src="/stream?camera=…">` : MJPEG relayé par l'API depuis go2rtc, session par cookie (`../../../../docs/securite.md`).
- Sélecteur **L / 4K / Off** sur la vidéo, en haut à droite (`LiveChoice`). **4K par défaut** (`&quality=hd`, recodé par le mini PC : lourd).
- Le 4K démarre par le flux léger affiché tout de suite ; le 4K le remplace à sa première image (`HD_PRELOAD_CLASS`, `hdReady`).
- Sous 1024 px l'adresse ajoute `&screen=mobile` (`lib/live.ts`).
- Caméra éteinte ou en démarrage : image noire avec le message, retour automatique du direct.

## Image passée et clips

- `SnapshotImage` : image gardée à l'instant choisi. En bas à gauche, son code permanent (en-tête `X-Snapshot-Code` de `GET /snapshot`).
- `ClipPlayer` : `<video>` lu en continu depuis `/clips/id` (morceaux demandés, cookie suffisant), en sourdine et `playsInline`.
- **Pas de choix de version** : H.265 (original) sur PC, H.264 (copie légère) sur téléphone, original partout sans copie légère.
- Appareil qui ne décode pas : un message le dit, avec « Fermer ».
- Événement sans clip : cadre noir qui dit pourquoi.
  - en cours (le clip arrive à la fin du mouvement) ;
  - en copie par House Sync (fini depuis moins de 10 min, `CLIP_WAIT_SECONDS`) ;
  - sans clip pour de bon (`NEVER_CLIP_TEXT` : mode pluie ou brouillard, ou réglage de la caméra).
- **Son des clips** : `voliere-interieur` a un fichier à part (`clip_audio`, `/clips/<id>/audio`) joué avec la vidéo. Si le navigateur refuse (téléphone), bouton « Activer le son ».
- **Contours du mouvement** (`/clips/<id>/shapes`, `clip_shapes`) : polygones rouges posés par-dessus la vidéo. `shapesAt` prend l'image notée la plus proche avant la lecture (0,5 s au plus). Rien sur le direct ni sur les clips d'avant.

## Clips : sauvegarde, partage, enregistrement

- Interrupteur **Sauvegardé / Non sauvegardé** (`PUT /clips/<id>/saved`), grand écran seulement. Un clip sauvegardé n'est jamais effacé ; les autres le sont après la durée de garde de House Sync (15 jours par défaut). L'état s'affiche tout de suite (`savedChoice`) et revient en arrière si l'API refuse.
- **Partager** (`ShareButton`, `lib/shareClip.ts`) : clips sauvegardés, seulement dans Home et SavedClips, pas ici.
  - La vidéo légère est téléchargée, puis `navigator.share({ files })` ; sans partage de fichier (ordinateurs), elle est téléchargée.
  - Demande HTTPS avec la CA de la maison. Un lien ne servirait à rien : le clip n'est lisible qu'avec la session.
- **Enregistrer** (`lib/useRecording.ts`, `/record`, `components/RecordButton`) : rond en haut à gauche de la vidéo, aussi sur téléphone.
  - Gris au repos, rouge qui pulse en cours ; un clic commence, un second termine ; arrêt automatique à 3 min.
  - Le clip est copié par House Sync quel que soit le réglage « Clips vidéo », visible dans la frise en environ 1 min, **sauvegardé d'office**.
  - Une page rouverte retrouve un enregistrement en cours.

## Son du direct

- `components/LiveAudio` : haut-parleur sur la vidéo, en bas à droite (slot `sound`) ; caméra allumée, pas pendant un clip.
- Ouvre `/audio?camera=` (flux AAC relayé de go2rtc) à la demande ; rien avant le clic.
- **Le son se garde** d'une caméra à l'autre (`initialSound`, `openSound` de `App`) et en vue en grand sans coupure : le lecteur est tenu hors du composant (`LiveAudio/session.ts`), le nouveau bouton le reprend, la coupure du premier a lieu après 400 ms.
- Micro Reolink très faible (-50 à -60 dB) : gain ×32 et limiteur (Web Audio). Le micro doit être activé dans l'appli Reolink, sinon le cadre devient rouge ("Pas de son").

## Repères des autres caméras

- La boîte du média (`MEDIA_HOST_CLASS`) arrondit et rogne : images et vidéos n'ont ni bordure ni arrondi propres.
- Les icônes posées sur la vidéo (repères, lampe, chauffage) ont le même rond que sur la carte (`components/MapIcon`).
- `components/CameraMarkers` : une icône par **autre caméra**, sur le direct, l'image passée et les clips (pas pendant la modification de la zone).
- Un clic ouvre cette caméra **à la même seconde et à la même vitesse** (`onOpenCamera(nom, instant, vitesse)`, `initialCursor`, `initialRate`).
- **Une caméra éteinte (PoE coupé, `lib/useOffCameras.ts`) a un repère grisé mais cliquable** (`inactive`) : on l'ouvre pour la rallumer.
- Sous 1024 px, un repère hors de l'image est collé au bord (`max-lg:` + `clamp`, `CameraMarkers/constants.ts`) ; la place enregistrée ne change pas.
- Places : `lib/useMarkers.ts` (`GET /markers`, `PUT /markers/<caméra>`) ; sans liste, alignés en haut.
- `MARKERS_EDITABLE` est à `false` : places figées. À `true` : glisser (au-delà de 5 px), clic droit pour retirer.
- `components/MarkersToggle` (à côté du son) les cache ; choix dans `localStorage` `house-markers-hidden`.

## Mesures posées sur la vidéo

- **Température du détecteur** en bas à gauche, en direct seulement. `CAMERA_SENSOR` (`constants.ts`) : `voliere-exterieur` donne « motion exterieur » (57), `voliere-interieur` donne « motion interieur » (54). Lue par `lib/useSensors.ts` (`/hue/sensors`, 30 s).
- **À côté, pour `voliere-interieur`** (`CameraIndicators`) :
  - le rond de la lampe « Perruche » (`CAMERA_LAMP` = 26, `lib/useLamp.ts`, 5 s) ;
  - le carré de la prise (`PlugSquare`, vert allumée, rouge éteinte) ;
  - 🌧️ / ☔ si le champ `rain` de `GET /direct` est vrai (mode pluie allumé et il pleut) ;
  - 👁️ si `eyes` est vrai (recherche des yeux qui brillent active : option de la caméra et nuit).
- Chaque indicateur est cliquable (`components/IndicatorHint`) : infobulle fermée par un autre clic, Échap ou 6 s ; le clic n'ouvre pas la caméra.
- **Heure** (`lib/useClock.ts`, `clock`) : en vue en grand, en bas à droite, secondes sans date ; direct = maintenant, sinon l'heure du curseur. Hors vue en grand, la frise a un bloc heure après les durées.

## Alimentation

- **« Off » coupe le PoE du port du switch** (`/poe`, `lib/usePower.ts`) ; « L » ou « 4K » le rend. Plus de bouton Éteindre / Allumer.
- « Off » n'existe que si le switch est configuré. Un ordre en route ignore les autres clics. Switch muet : « Le switch n'a pas répondu. »
- État lu toutes les 10 s (3 s pendant un démarrage).

## Zone de surveillance

- `lib/useZone.ts`, `ZoneEditor`, `/zones` : bouton « Zone de surveillance » en direct, grand écran seulement.
- Polygone à réduire en glissant les coins ; rond au milieu d'un côté = nouveau sommet ; double clic ou clic droit sur un sommet = retrait ; « Toute l'image » remet tout.
- Enregistrée au relâchement (`PUT /zones/<caméra>`, `null` = toute l'image), appliquée par l'enregistreur dans la minute. Zoom au doigt coupé pendant le dessin.

## Caméra posée de côté

- Orientation « portrait » réglée dans House Sync : `camera.orientation` (direct), `event.orientation` (clip) ; une image prend celle de l'événement le plus récent avant son instant (`orientationShown`).
- Le média est tourné d'un quart de tour horaire (`components/RotatedMedia`, cadre 9/16, 298 px de large au plus). Textes remis droits (`upright`).
- Commandes du clip droites sous la vidéo (`controlsHost`).
- Sur téléphone, la vue en grand reste en portrait (`useBigView(turned)`, `portraitMedia`).
- Dans Home : `components/PortraitClip` (`../Home/CLAUDE.md`).

## Vue en grand et zoom

- `lib/useBigView.ts` : état de la page d'abord, puis `requestFullscreen` et verrou paysage ; un refus ne gêne pas.
- Verrou refusé et écran droit : le plein écran réel est quitté (il imposerait `transform: none`, cas du mode mobile de Chrome). Écran resté en portrait : vue tournée par CSS (`portrait:`).
- Zoom (`lib/usePinchZoom.ts`, jusqu'à ×6, `mediaGesture`) :
  - doigts : pincer, déplacer, double toucher ; actif en vue en grand et sur la vidéo du téléphone ;
  - molette : **seulement en vue en grand** (sinon la page défile) ;
  - remis à zéro à l'entrée, à la sortie et au changement de média.

## Défilement des images

- `components/FastScroll` : flèches ◀ ▶ à côté des durées, une fois une image choisie (pas pendant un clip). Vitesse ×1 à ×600 (`RATES`), `rate` de la frise ; retour au direct = ×1.
- `SnapshotImage` fond l'image suivante sur la précédente (`fadeFor`, 40 à 400 ms, plus court quand ça va vite).
