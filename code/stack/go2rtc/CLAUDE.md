# go2rtc – les flux de la caméra

Image `alexxit/go2rtc`, configuration dans `go2rtc.yaml`. Il ouvre **une seule connexion RTSP** vers chaque caméra et la partage : l'enregistreur (`motion`) lit son RTSP interne (8554), House API relaie son API (1984) pour le direct. Ni l'un ni l'autre n'est publié.

- Par caméra, quatre flux : `<nom>_main` (le principal, 4K H.265, enregistré en copie), `<nom>_sub` (le léger, pour la détection), `<nom>_sub_mjpeg` (le léger transcodé en MJPEG par un ffmpeg, seulement tant qu'un onglet le regarde) et `<nom>_main_mjpeg` (le 4K transcodé en MJPEG, pour le bouton « 4K » du direct ; même principe, mais bien plus lourd pour le processeur et le réseau).
- **Cadence du direct (4K et léger)** : la section `ffmpeg` de `go2rtc.yaml` déclare des modèles `mjpeg1` à `mjpeg24` (MJPEG à N images par seconde). House Sync change à chaud la source de `<nom>_main_mjpeg` ou `<nom>_sub_mjpeg` en `ffmpeg:<nom>_main#video=mjpegN` (ou `_sub`) (API `PATCH /api/streams`, en mémoire : l'API `PUT` écrit le fichier, monté en lecture seule) selon le curseur de sa page ; après un redémarrage de go2rtc, le flux revient à 25 images par seconde le temps que House Sync le remette (moins d'une minute). Le décodage H.265 reste complet ; seuls l'encodage JPEG et le débit baissent.
- Le mot de passe de la caméra vient de `REOLINK_PASSWORD` (variable d'environnement du conteneur, depuis `.env`), jamais du fichier. L'IP de la caméra est fixée par un bail DHCP statique sur la box.
- Pour ajouter une caméra : trois lignes dans `streams`, puis son nom dans `CAMERAS` du conteneur `motion`.

Les deux caméras (`portail` et `camera2`) passent par ce même go2rtc ; l'adresse et le compte de `camera2` viennent de `CAMERA2_*` dans `.env`. Une autre machine aurait son propre go2rtc : voir `CLAUDE.md` de `code/stack`.

Après un changement : `docker compose restart go2rtc`.
