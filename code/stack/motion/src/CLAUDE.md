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
- `GET /api/events?merged_after=<s>` rend les fusionnés, absorbés compris.

## 5. Commandes de House Sync

- **Détection** : `PUT /api/cameras/<caméra>/detection?enabled=0|1`. Éteinte : ffmpeg du flux léger arrêté, événement ouvert fermé. Allumée par défaut ; House Sync la coupe si les clips de la caméra ne sont pas gardés et répète son état chaque minute.
- **Sensibilité** (`sensitivity.ts`) : `PUT .../sensitivity?level=1..5` (3 = seuils de base). Niveau 5 : seuils à 0,45 et 0,3 fois la base ; niveau 1 : 1,6 et 3 fois. Appliqué sans relancer ffmpeg.
- **Zone** (`zone.ts`) : `PUT .../zone` avec `{"points": [[x, y], ...]}` (3 à 32 sommets, parts de 0 à 1) ou `{"points": null}` (toute l'image).
  - Polygone converti en masque sur l'image 160×90 ; la part de pixels changés ne se calcule que dans la zone.
  - Un polygone qui couvre tout ou rien ne met pas de masque.
- Sensibilité et zone sont en mémoire : House Sync les remet chaque minute, retour aux défauts (3, toute l'image) au redémarrage en attendant.

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

## 9. Yeux qui brillent (`eyes.ts`, `POST /api/eyes`)

- La nuit, l'œil d'un animal est un petit point blanc **saturé** sur fond sombre en infrarouge monochrome.
- House Sync envoie un JPEG (corps, 3 Mo max, 413 au-delà) ; ffmpeg le décode en gris (10 s max). Réponse `{found, pair, distance, eyes: [{x, y, size, peak, contrast}]}`, 400 si illisible.
- **Règle volontairement simple** (constantes en tête de `eyes.ts`, pour des images 1280×720) :
  - amas de pixels ≥ 250 (`PEAK_MIN`) de 3 à 25 pixels (`AREA_MIN`, `AREA_MAX`) ;
  - anneau de 3 à 6 pixels autour de gris moyen < 120 (`RING_MAX`) ;
  - œil trop près du bord ignoré.
- Image chargée (plus de 8 amas de 2 pixels et plus à ≥ 250, `BLOBS_MAX`) : rien. Mesuré de nuit, sauf `voliere-toit` toutes les scènes sont pleines de points saturés.
- Deux yeux voisins (4 à 30 pixels) donnent `pair: true` : un indice, pas une condition.
- Prudent : un chat raté vaut mieux que des fausses alertes.

## 10. Événement de l'extérieur (`trigger.ts`)

- `POST /api/cameras/<caméra>/trigger?reason=eyes`, appelé par House Sync après un œil trouvé.
- Ouvre maintenant un événement de `label` `eyes`, ou prolonge celui d'un appel précédent (`extended: true`). Sans nouvel appel pendant `TRIGGER_HOLD_SECONDS` (10 s), il est fermé à l'instant du dernier appel.
- Raison inconnue : 400 ; caméra inconnue : 404.
- House Sync décide si le clip est copié (`keepsClip`) et limite les appels (un par caméra toutes les 30 s). Indépendant du détecteur : les deux événements peuvent se recouvrir, la fusion les réunit.

## 11. Contours du mouvement (`shapes.ts`)

- Par image avec mouvement (assez de pixels, pas un changement de lumière), `changedShapes` (`detector.ts`) regroupe les pixels changés à 3 pixels ou moins (`GROUP_DISTANCE`) et en fait l'enveloppe convexe : 8 polygones au plus, les plus grands.
- `index.ts` découpe chaque polygone par la zone (`clipToZone`, Sutherland-Hodgman) et le note dans `<RECORDINGS_DIR>/<caméra>/shapes/<tranche de 10 min>.jsonl` (gardé comme les segments).
- `buildShapesClip` produit `<id>.shapes.json` : `{frames: [[secondes depuis le début du clip, [[[x, y], ...], ...]], ...]}`. L'événement porte `has_shapes`.
- **Décalage** : le flux léger livre ses images environ 2,8 s après la 4K. `SHAPES_DELAY_SECONDS` (2,77, réglé à l'œil) avance les contours **et** le début et la fin de l'événement (`store.open`, `store.close`) : la barre bleue de la frise commence au premier contour.
- Clips antérieurs : pas de contours (404), rien n'est retraité. Jamais écrit dans la vidéo : House Sync copie le fichier, House API le sert (`/clips/<id>/shapes`), la WebApp dessine par-dessus. La fusion l'efface avec le clip.
