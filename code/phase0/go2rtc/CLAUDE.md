# go2rtc – les flux de la caméra

Image `alexxit/go2rtc`, configuration dans `go2rtc.yaml`. Il ouvre **une seule connexion RTSP** vers chaque caméra et la partage : l'enregistreur (`motion`) lit son RTSP interne (8554), House API relaie son API (1984) pour le direct. Ni l'un ni l'autre n'est publié.

- Par caméra, trois flux : `<nom>_main` (le principal, 4K H.265, enregistré en copie), `<nom>_sub` (le léger, pour la détection) et `<nom>_sub_mjpeg` (le léger transcodé en MJPEG par un ffmpeg, seulement tant qu'un onglet le regarde).
- Le mot de passe de la caméra vient de `REOLINK_PASSWORD` (variable d'environnement du conteneur, depuis `.env`), jamais du fichier. L'IP de la caméra est fixée par un bail DHCP statique sur la box.
- Pour ajouter une caméra : trois lignes dans `streams`, puis son nom dans `CAMERAS` du conteneur `motion`.

Un second enregistreur a son propre go2rtc (`go2rtc2.yaml`, caméra `camera2`, réglée par `CAMERA2_*` dans `.env`), dans le profil `second` du compose : voir `CLAUDE.md` de phase0.

Après un changement : `docker compose restart go2rtc`.
