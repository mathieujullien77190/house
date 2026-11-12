# certs – la CA de la maison

Conteneur éphémère (Alpine + openssl) : lance `make-certs.sh` puis s'arrête. House Sync et l'API attendent sa fin (`service_completed_successfully`). Installation de la CA et usage : `../docs/securite.md` (section HTTPS).

- Crée une fois `data/certs/rootCA.pem` (à installer sur chaque appareil) et `rootCA-key.pem` (mode 600, jamais copiée ailleurs).
- Certificat pour les hôtes de `CERT_HOSTS` (IP du mini PC, `mini.local`, `localhost`, en SAN : Chrome l'exige), valable 820 jours ; refait si la liste change ou à moins de 30 jours de l'expiration.

Changer les hôtes : `CERT_HOSTS` dans `.env`, puis `docker compose up -d`.

Réinstaller la CA sur Windows : `rootCA.crt` (copie du `.pem`) dans « Autorités de certification racines de confiance », utilisateur courant.
