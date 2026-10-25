# certs – la CA de la maison

Conteneur éphémère (`Dockerfile` : Alpine + openssl) qui lance `make-certs.sh` puis s'arrête. House Sync et l'API attendent qu'il ait fini (`depends_on: service_completed_successfully`).

- Crée une fois `data/certs/rootCA.pem` (la CA, à installer sur chaque appareil) et `rootCA-key.pem` (sa clé, jamais copiée ailleurs, mode 600).
- Crée un certificat pour les hôtes de `CERT_HOSTS` (IP du PC et `localhost`, en SAN : Chrome l'exige), signé par la CA, valable 820 jours ; refait si la liste change ou à moins de 30 jours de l'expiration.

Pour changer les hôtes : `CERT_HOSTS` dans `.env`, puis `docker compose up -d`. Pour réinstaller la CA sur Windows : `rootCA.crt` (copie du `.pem`) dans « Autorités de certification racines de confiance », utilisateur courant.
