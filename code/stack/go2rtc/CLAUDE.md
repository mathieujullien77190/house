# go2rtc – les flux des caméras

Image `alexxit/go2rtc`, config `go2rtc.yaml`. **Une seule connexion RTSP** par caméra, partagée : `motion` lit son RTSP interne (8554), House API relaie son API (1984). Aucun des deux n'est publié (`../docs/securite.md`).

## Flux (huit par caméra)

| Flux | Rôle |
|---|---|
| `<nom>_main` | principal 4K H.265, enregistré en copie par `motion` |
| `<nom>_sub` | léger, pour la détection |
| `<nom>_sub_mjpeg` | léger en MJPEG, seulement tant qu'un onglet le regarde |
| `<nom>_main_mjpeg` | 4K en MJPEG (bouton « 4K »), bien plus lourd |
| `…_sub_mjpeg_m`, `…_main_mjpeg_m` | mêmes flux pour écrans de moins de 1024 px, cadence propre (4K à 10 i/s = 17 Mb/s, trop pour un téléphone : image à moitié grise) |
| `<nom>_guest_sub_mjpeg`, `<nom>_guest_main_mjpeg` | page invité (`../guest/CLAUDE.md`), 2 i/s au départ |

## Règles

- **Cadence du direct** : la section `ffmpeg` déclare des modèles `mjpeg1` à `mjpeg24`. House Sync change à chaud la source d'un flux `…_mjpeg` en `ffmpeg:<nom>_main#video=mjpegN` (ou `_sub`) par `PATCH /api/streams` (en mémoire : le fichier est monté en lecture seule).
- Après un redémarrage, les flux reviennent aux valeurs du fichier (25 i/s) jusqu'à ce que House Sync les remette (moins d'une minute). Le décodage H.265 reste complet, seuls l'encodage JPEG et le débit baissent.
- **Secrets** : le mot de passe vient de `REOLINK_PASSWORD` (`.env`), jamais du fichier. Adresse et compte : `CAMERA2_*` (`voliere-interieur`), `CAMERA3_*` (`salon-de-jardin`), `CAMERA4_*` (`voliere-toit`, 192.168.1.57). IP fixée par bail DHCP statique sur la box.
- **Son du direct** : House API lit `/api/stream.aac?src=<nom>_sub` tant qu'un onglet écoute. Rien à déclarer.
- **Ajouter une caméra** : huit lignes dans `streams` (les `_m` sont indispensables au téléphone, les `guest` à la page invité), puis son nom dans `CAMERAS` de `motion`.

Après un changement : `docker compose restart go2rtc`.
