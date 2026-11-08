# go2rtc – les flux de la caméra

Image `alexxit/go2rtc`, configuration dans `go2rtc.yaml`. Il ouvre **une seule connexion RTSP** vers chaque caméra et la partage : l'enregistreur (`motion`) lit son RTSP interne (8554), House API relaie son API (1984) pour le direct. Ni l'un ni l'autre n'est publié (`../docs/securite.md`). Les deux caméras (`voliere-exterieur`, `voliere-interieur`) passent par ce même go2rtc.

## Les flux (huit par caméra)

| Flux | Rôle |
|---|---|
| `<nom>_main` | le principal, 4K H.265, enregistré en copie par `motion` |
| `<nom>_sub` | le léger, pour la détection |
| `<nom>_sub_mjpeg` | le léger transcodé en MJPEG par un ffmpeg, seulement tant qu'un onglet le regarde |
| `<nom>_main_mjpeg` | le 4K transcodé en MJPEG (bouton « 4K » du direct) : bien plus lourd pour le processeur et le réseau |
| `<nom>_sub_mjpeg_m`, `<nom>_main_mjpeg_m` | les mêmes deux flux pour les écrans de moins de 1024 px (téléphone), avec leur propre cadence réglée dans House Sync (un 4K à 10 images/s fait environ 17 Mb/s : trop pour un téléphone, l'image arrive à moitié grise) |
| `<nom>_guest_sub_mjpeg`, `<nom>_guest_main_mjpeg` | ceux de la page invité (`../guest/CLAUDE.md`), 2 images/s au démarrage |

## Règles

- **Cadence du direct** : la section `ffmpeg` de `go2rtc.yaml` déclare des modèles `mjpeg1` à `mjpeg24` (MJPEG à N images par seconde). House Sync change à chaud la source d'un flux `…_mjpeg` (et `…_m`, `…_guest_…`) en `ffmpeg:<nom>_main#video=mjpegN` (ou `_sub`) par `PATCH /api/streams` (en mémoire : `PUT` écrit le fichier, monté en lecture seule), selon les curseurs de sa page. Après un redémarrage de go2rtc, les flux reviennent à leur valeur du fichier (25 images/s pour le direct) le temps que House Sync les remette (moins d'une minute). Le décodage H.265 reste complet ; seuls l'encodage JPEG et le débit baissent.
- Le mot de passe de la caméra vient de `REOLINK_PASSWORD` (variable du conteneur, depuis `.env`), jamais du fichier. L'adresse et le compte de `voliere-interieur` viennent de `CAMERA2_*`. L'IP d'une caméra est fixée par un bail DHCP statique sur la box.
- **Ajouter une caméra** : huit lignes dans `streams` (les deux « _m » sont indispensables : sans eux, le direct du téléphone ne marche pas ; les deux « guest » servent à la page invité), puis son nom dans `CAMERAS` du conteneur `motion`.

Après un changement : `docker compose restart go2rtc`.
