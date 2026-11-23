# motion/src – ce que fait l'enregistreur

Vue d'ensemble et réglages : `../CLAUDE.md`. Par caméra de `CAMERAS` :

## 1. Segments

- Flux `rtsp://go2rtc:8554/<caméra>_main` (4K H.265), `-c copy -f segment`, segments de `SEGMENT_SECONDS` (10 s).
- Fichiers `data/recordings/<caméra>/<heure en secondes>.ts`, gardés `RETENTION_HOURS` (6 h), nettoyage chaque minute.

## 2. Détection

- Flux léger `<caméra>_sub` : images grises 160×90, 5 par seconde, comparées à la précédente (`detector.ts`).
- Un événement s'ouvre quand le mouvement dure au moins `minSeconds` (1 par défaut, 0 à 30 par caméra : `PUT /api/cameras/<caméra>/min-seconds?seconds=N`, 0 = le premier mouvement compte). Il commence à l'instant où le mouvement a commencé.
- Un calme de plus de `GAP_SECONDS` (1 s) avant `minSeconds` fait oublier le début (goutte, insecte, parasite). Pas de filtre pluie : la durée minimale s'en charge.
- Fermeture après `END_SECONDS` de calme. Une part de pixels au-delà de `lightChangeThreshold` = changement de lumière, ignoré.
- Un ffmpeg sans image depuis 20 s est relancé ; un mouvement ouvert quand ffmpeg s'arrête est fermé.

## 3. Clips

- Fait quand tous les segments sont écrits (`postSeconds` après la fin + un segment + 3 s).
- Segments de `start − PRE_SECONDS` à `end + POST_SECONDS` mis bout à bout, MP4 sans transcodage (`-tag:v hvc1` pour H.265, `VIDEO_TAG`), dans `<CLIPS_DIR>/<id>.mp4` (sur le mini PC `data/clips/clips/`).
- Début réel gardé dans `clip_start`, envoyé à House Sync dans l'en-tête `X-Clip-Start`.
- **Copie légère** `<id>.h264.mp4` : H.264 720p, 300 kb/s à 1 Mb/s (`buildWebClip`, `libx264 veryfast crf 28`, écrite en `.part.mp4` puis renommée). Nécessaire : la 4K H.265 n'est lue que par Safari et quelques Chrome.
- Les clips sans copie la reçoivent au démarrage ; un clip illisible n'est pas réessayé avant le prochain démarrage ; les segments vides sont sautés.

## 4. Fusion (`merge.ts`)

- Un mouvement qui reprend peu après un autre donne deux clips qui se chevauchent (marges 5 s, segments 10 s).
- Quand le dernier d'une chaîne est fini depuis `MERGE_DELAY_MINUTES` (30, vérifié chaque minute), le plus ancien survit (même id, fin repoussée, clip et copie refaits) et les autres sont absorbés (`merged_into`).
- `GET /api/events?merged_after=<s>` rend les fusionnés, absorbés compris. `?labelled_after=<s>` rend ceux dont l'étiquette a été calculée après cet instant (§ 10).

## 5. Commandes de House Sync

- **Détection** : `PUT /api/cameras/<caméra>/detection?enabled=0|1`. Éteinte : ffmpeg du flux léger arrêté, événement ouvert fermé. Allumée par défaut ; House Sync la coupe si les clips de la caméra ne sont pas gardés et répète son état chaque minute.
- **Sensibilité** (`sensitivity.ts`) : `PUT .../sensitivity?level=1..5` (3 = seuils de base). Niveau 5 : seuils à 0,45 et 0,3 fois la base ; niveau 1 : 1,6 et 3 fois. Appliqué sans relancer ffmpeg.
- **Zone** (`zone.ts`) : `PUT .../zone` avec `{"points": [[x, y], ...]}` (3 à 1000 sommets, parts de 0 à 1) ou `{"points": null}` (toute l'image).
  - Polygone converti en masque sur l'image 160×90 ; la part de pixels changés ne se calcule que dans la zone.
  - Un polygone qui couvre tout ou rien ne met pas de masque.
- Zone, sensibilité et durée minimale sont gardées dans `detection.json` (à côté de `events.json`, `/data/detection.json`) et reprises au démarrage ; House Sync les renvoie chaque minute. Sans ce fichier (premier démarrage), retour aux défauts (3, toute l'image) jusqu'au premier envoi : un mouvement de feuillage hors zone pouvait alors ouvrir un événement (vu le 19 nov. 2026 à 2 h 48).

- **Caméras liées** : `LINKS` = des **groupes** (`a+b+c,d+e`, compose : `voliere-toit+voliere-interieur`) + `PUT …/link?enabled=0|1` sur la caméra (réglage « Clip sur la caméra liée » de House Sync, **éteint** tant qu'il ne l'a pas dit, répété chaque minute). Les caméras dont l'interrupteur est sur ON sont **liées entre elles** : quand l'une voit un mouvement **ou** des yeux, un événement s'ouvre sur **chaque autre caméra liée (ON) du groupe**. Une caméra OFF est indépendante : elle ne déclenche rien, ne reçoit rien, et ne réagit qu'à ses propres mouvements ; il se ferme quand la dernière caméra qui l'a demandé a fini (`openLinked`, `closeLinked` dans `index.ts`). Un événement lié n'en déclenche pas d'autre. Les segments sont toujours enregistrés, le clip se fait comme les autres. Distinct de l'événement propre de la cible : s'ils se recouvrent, la fusion les réunit.

## 6. Enregistrement manuel

- `GET`, `POST`, `DELETE /api/cameras/<caméra>/record` (bouton « Enregistrer un clip »).
- `POST` ouvre un événement `manual: true` ; `DELETE` le ferme, sinon arrêt à 3 minutes (`MAX_MANUAL_SECONDS`). Clip fait comme un vrai mouvement. Un redémarrage le ferme (`closeOrphans`).

## 7. Son des clips (`audio.ts`)

- `AUDIO_CAMERAS` (vide par défaut ; compose : `voliere-interieur`). Le micro doit être activé dans l'appli Reolink (sinon silence pur, −91 dB).
- ffmpeg copie la piste audio du flux léger (AAC 16 kHz mono) en fichiers `.aac` de `AUDIO_SEGMENT_SECONDS` (10 s) dans `<RECORDINGS_DIR>/<caméra>/audio/`, gardés 6 h. **Le son n'est gardé que pour les clips de mouvement.**
- `buildAudioClip` produit `<CLIPS_DIR>/<id>.aac` : fichiers concaténés, coupés au début de la vidéo (`clip_start`, à 64 ms près) et à sa fin. L'événement porte `has_audio`.
- Amplifié de `AUDIO_GAIN_DB` (24 dB, avec limiteur ; 0 = tel quel). Segments, clips et copies restent sans son (`-an`). La fusion l'efface avec le clip.

## 8. API pour House Sync (`server.ts`)

Forme de l'ancienne API Frigate, gardée pour que House Sync n'ait pas changé.

- `GET /api/config`, `GET /api/events` (`after`, `before`, `has_clip`, `in_progress`, `limit`, `merged_after`), `GET /api/events/<id>`.
- `/clip.mp4` (original), `/clip.h264.mp4` (copie légère, 404 tant que non faite), `/clip.aac` (404 sans son).
- `GET /api/<caméra>/latest.jpg?h=` : image du flux principal prise par go2rtc.

## 9. Recherche des yeux (`eyes.ts`)

- **Réglage de House Sync** (réglage « Recherche des yeux » de chaque caméra, à côté du mode pluie, éteint par défaut) : `PUT /api/cameras/<caméra>/eyes?enabled=0|1`, répété chaque minute. House Sync ne l'allume que **de 30 min après le coucher du soleil à 30 min avant son lever**, quand la détection de la caméra tourne.
- Allumée, un ffmpeg lit le flux principal `<caméra>_main` en **images clés seulement** (`-skip_frame nokey`, une toutes les 2 s : peu de processeur), réduites à 1280×720 en gris. Chacune est comparée à la précédente (au moins 1,5 s avant).
- Un pixel est un reflet s'il est **dans la zone surveillée**, clair (≥ 235) et d'au moins 150 plus clair que tous les pixels voisins (±2 px) de l'image d'avant. Les pixels voisins (2 px) sont groupés ; une tache de 2 à 150 pixels donne un cadre (`findEyes`). Plus petite : bruit ; plus grande : le corps du chat.
- **Un reflet compte comme un mouvement** (le détecteur est forcé tant que des yeux ont été vus depuis 1,5 s) et son cadre est ajouté aux contours (§11) : la vidéo des clips le dessine en rouge comme le mouvement.
- L'événement où des yeux sont vus prend l'étiquette `eyes` (`store.setLabel`) : la frise de la WebApp le montre en violet.
- Les yeux n'apparaissent que quand le chat regarde la caméra : à 1 image toutes les 2 s, certains passages ne donnent qu'un ou deux reflets.
- La suppression de l'ancienne recherche (`POST /api/eyes`, `trigger.ts`) date de novembre 2026 ; les anciens événements de `label` `eyes` restent lisibles.

## 10. Étiquette d'un mouvement : feuillage et pluie (`stats.ts`)

**Calculée après coup, pas à la volée** : un événement reste orange (`motion`) jusqu'à ce qu'il soit fini depuis `MERGE_DELAY_MINUTES` (30 min). La fusion (§ 4) passe d'abord, puis `classifyEvents` (`index.ts`, chaque minute) donne à chaque événement non étiqueté son étiquette, calculée sur **tout le mouvement fusionné**. Une fusion efface `labelled_at` du survivant : il est recalculé sur la nouvelle durée. House Sync recopie les étiquettes changées (`GET /api/events?labelled_after=`).

- **Journal des hauteurs** : à chaque image avec mouvement, `appendStats` écrit `{t, h: [hauteur en % de l'image de chaque zone]}` (**toutes** les zones cherchées, jusqu'à 60, `COUNTED_SHAPES` ; le journal des contours § 11 n'en garde que 8) dans `<RECORDINGS_DIR>/<caméra>/stats/<tranche de 10 min>.jsonl`, gardé comme les segments (6 h). Les zones sont celles **dans la zone surveillée**.
- **Fenêtre** : de `start_time + SHAPES_DELAY_SECONDS − 1` à `end_time + SHAPES_DELAY_SECONDS + 1` (les images sont notées à l'arrivée du flux léger, en retard sur l'événement qui a été avancé).
- **Feuillage** (réglage par caméra de House Sync, `PUT /api/cameras/<caméra>/foliage?zones=0..60`, 0 = coupé, par défaut) : au moins `zones` zones sur **30 % des images** du mouvement (`FOLIAGE_SHARE`, au moins 5 images) : étiquette `foliage` (vert dans la frise).
- **Pluie** (§ 10 ter) : étiquette `rain` (bleu). **Priorité** : `eyes` (violet, posé en direct, jamais écrasé) > `rain` > `foliage` > `motion`.
- **Événement d'avant le journal des hauteurs** : le calcul relit le journal des contours (§ 11, `readShapeStats`, 8 zones par image au plus, les plus grandes) ; `labelled_from` dit d'où viennent les zones (`stats`, `shapes` ou `none`).
- **Plus aucune zone** (journaux effacés au bout de 6 h) : l'étiquette ne bouge pas, `labelled_from: none`. Tant que des zones peuvent exister, l'événement est réessayé chaque minute.
- Gardé dans `detection.json` avec la zone et la sensibilité (clés `foliage` et `rain`).

## 10 ter. Pluie

- Réglage par caméra de House Sync (`PUT /api/cameras/<caméra>/rain?zones=0..60&height=1..100`, zones 0 = coupé, par défaut ; hauteur de 10 % par défaut) : la pluie fait des zones **allongées à la verticale** (les mêmes que les contours rouges du clip, regroupement à 3 pixels, `GROUP_DISTANCE`).
- **`zones` par minute, en moyenne** : on compte toutes les zones d'au moins `height` % de hauteur, toutes images confondues, on les divise par la durée **du clip** (marges de début et de fin comprises, au moins 10 s, `MIN_RAIN_SECONDS`) et on ramène à la minute : sur un clip de 2 min, 6 par minute demandent 12 zones (`tallPerMinute`, `stats.ts`) ; si la moyenne atteint `zones`, l'étiquette est `rain` (**bleu** dans la frise). Une zone qui reste plusieurs images compte à chaque image. Un long mouvement et un court se comparent donc au même seuil.
- Calculé après la fusion (§ 10) : la fusion de deux clips de pluie additionne leurs zones, un clip fusionné ne perd pas l'étiquette.

## 10 bis. Retiré

Le déclenchement d'événement de l'extérieur (`trigger.ts`, `POST …/trigger`) a été retiré en novembre 2026. Les numéros de section sont gardés pour que les renvois ne bougent pas. Les anciens événements de `label` `eyes` restent lisibles dans le fichier.

## 11. Contours du mouvement (`shapes.ts`)

- Par image avec mouvement (assez de pixels, pas un changement de lumière), `changedShapes` (`detector.ts`) regroupe les pixels changés à 3 pixels ou moins (`GROUP_DISTANCE`) et en fait l'enveloppe convexe : 8 polygones au plus, les plus grands.
- `index.ts` découpe chaque polygone par la zone (`clipToZone`, Sutherland-Hodgman) et le note dans `<RECORDINGS_DIR>/<caméra>/shapes/<tranche de 10 min>.jsonl` (gardé comme les segments).
- `buildShapesClip` produit `<id>.shapes.json` : `{frames: [[secondes depuis le début du clip, [[[x, y], ...], ...]], ...]}`. L'événement porte `has_shapes`.
- **Décalage** : le flux léger livre ses images environ 2,8 s après la 4K. `SHAPES_DELAY_SECONDS` (2,77, réglé à l'œil) avance les contours **et** le début et la fin de l'événement (`store.open`, `store.close`) : la barre orange de la frise commence au premier contour.
- Clips antérieurs : pas de contours (404), rien n'est retraité. Jamais écrit dans la vidéo : House Sync copie le fichier, House API le sert (`/clips/<id>/shapes`), la WebApp dessine par-dessus. La fusion l'efface avec le clip.
