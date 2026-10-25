# frigate – détection et enregistrement

Image `ghcr.io/blakeblackshear/frigate:stable` (0.18), configuration dans `config/config.yml`. Frigate réécrit ce fichier au format de sa version (ordre des clés, `version:`) : c'est normal, on garde sa forme.

- **go2rtc** ouvre une seule connexion RTSP vers la caméra (flux principal 4K H.265 pour l'enregistrement, flux léger H.264 640×360 pour la détection) ; le mot de passe vient de `FRIGATE_REOLINK_PASSWORD` (`.env`). L'IP de la caméra est fixée par un bail DHCP statique sur la box.
- **Détection** : `person` seulement, CPU, seuils abaissés (`min_score` 0,4, `threshold` 0,6) car la caméra voit de près.
- **Enregistrement** sur mouvement seulement, gardé **6 h** (`0.25` jour, pour `motion`, `alerts` et `detections`) : House Sync copie les clips et garde une image par minute, Frigate n'a besoin que d'une marge si House Sync est arrêté. Le ménage passe toutes les heures.
- **Direct de la WebApp** : le flux go2rtc `portail_sub_mjpeg` (`ffmpeg:portail_sub#video=mjpeg`) que House API relaie ; go2rtc (1984) n'est jamais publié. Un flux `<flux>_mjpeg` par caméra.
- **Vue direct de Frigate** (administration) : deux flux déclarés (`Léger` en premier, celui que House Sync met dans l'adresse du direct).
- Authentification activée, port 8971 publié, port 5000 jamais publié. Comptes : `admin` et `sync` (viewer, pour House Sync). Certificat de la maison monté depuis `data/certs/frigate`.
- Ce que Frigate écrit à côté de `config.yml` (base, secret JWT, caches, fichiers cachés) est ignoré par git et par le glob du site.

Après un changement de `config.yml` : `docker compose restart frigate`, puis vérifier dans ses logs qu'il n'y a pas d'erreur de configuration.
