# Sécurité et accès distant de la pile

Pour tout ce qui touche à l'accès, au pare-feu, à la clé, aux certificats. Les règles d'architecture de la pile : `../CLAUDE.md`.

## Accès distant

Les applications ne sont **jamais ouvertes sur internet**, aucune redirection de ports. Hors de la maison, un téléphone ouvre un tunnel **WireGuard** vers la Freebox (serveur VPN intégré, un utilisateur WireGuard par appareil, un seul port UDP ouvert sur la box) : il reçoit une adresse du réseau `192.168.27.0/24` et voit le mini PC à **`192.168.27.139`** (`https://192.168.27.139:8080` pour la WebApp, `:8081` pour House Sync ; cette adresse est dans `CERT_HOSTS`). Alternative : Tailscale. Jamais de redirection de ports.

La seule exception pensée pour l'extérieur est la page invité (`guest/CLAUDE.md`, port 8090), derrière un lien secret et, pour internet, Tailscale Funnel.

## Ce qui est publié

Seulement l'API (8080), la page de House Sync (8081) et, si on la lance, la page invité (8090). go2rtc et l'API de l'enregistreur n'ont pas de mot de passe et ne sont joignables que par les autres conteneurs.

## Pare-feu du mini PC

`ufw`, entrant refusé par défaut. SSH (22), 8080 et 8081 ne sont ouverts qu'au réseau de la maison (`192.168.1.0/24`, et en IPv6 son préfixe local et les adresses `fe80::/10`) et au VPN WireGuard de la Freebox (`192.168.27.0/24`).

Docker contourne `ufw` pour les ports qu'il publie en IPv4 : un bloc `DOCKER-USER` en fin de `/etc/ufw/after.rules` refuse 8080 et 8081 à tout ce qui n'est ni du réseau de la maison ni de son VPN. Il ne vise que ces deux ports : il laisse passer 8090 (page invité, voulue).

## SSH par clé seulement

Depuis le 7 novembre 2026 : `/etc/ssh/sshd_config.d/00-house-hardening.conf` (`PasswordAuthentication no`, il passe avant `50-cloud-init.conf` qui autorisait les mots de passe) ; la seule clé autorisée est celle de `mathieu`. Pour revenir en arrière, supprimer ce fichier puis `sudo systemctl reload ssh`. Pour changer ce réglage sans risque : programmer d'abord un retour en arrière automatique (`systemd-run --on-active=300`), tester une nouvelle connexion, puis l'annuler.

## Une seule clé, session par cookie

`API_KEY` (en-tête `X-House-Key`) protège l'API et la page de House Sync. La saisie de la clé ouvre une **session par cookie** (`GET /auth` pour l'API, `POST /login` pour House Sync) : un jeton signé avec la clé (HMAC) et daté, valable **30 jours**, HttpOnly et Secure, rien en mémoire (il survit à un redémarrage). Le navigateur ne garde jamais la clé : une page rouverte se reconnecte avec le cookie. Changer `API_KEY` invalide tous les cookies ; « Oublier la clé » ou « Quitter » efface celui du navigateur. Le cookie sert aussi à ce qu'une balise `<img>` ou `<video>` charge sans en-tête, dont le direct.

## HTTPS

Certificat de la CA de la maison (`data/certs/rootCA.pem`, à installer une fois par appareil ; créé par `certs/`). Pour un téléphone, l'API propose le certificat **public** au téléchargement : `https://<adresse>:8080/rootCA.crt` (jamais la clé `rootCA-key.pem`). La WebApp marche sur n'importe quel hôte du certificat (IP du PC ou `localhost`).

## Secrets

Dans `.env` (ignoré par git), modèle dans `.env.example`. Jamais de mot de passe dans le code, la doc ou les commits : go2rtc lit celui de la caméra dans `REOLINK_PASSWORD`.
