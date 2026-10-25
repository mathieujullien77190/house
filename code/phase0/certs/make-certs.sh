#!/bin/sh
# Autorité de certification (CA) de la maison et certificat du PC, pour la WebApp (8080) et Frigate (8971).
# La CA est créée une fois : son certificat rootCA.pem s'installe sur chaque appareil (PC, téléphone), et
# le navigateur fait ensuite confiance à tout ce qu'elle signe. Sa clé rootCA-key.pem ne quitte jamais ce dossier.
# Le certificat du PC porte les adresses de CERT_HOSTS (IP ou noms) ; il est refait si la liste change
# ou s'il expire dans moins de 30 jours. Durée 820 jours : la limite acceptée par les téléphones Apple.
set -e
DIR="${CERT_DIR:-/certs}"
HOSTS="${CERT_HOSTS:-localhost}"
mkdir -p "$DIR/frigate"
cd "$DIR"

if [ ! -f rootCA.pem ] || [ ! -f rootCA-key.pem ]; then
  openssl req -x509 -newkey rsa:3072 -nodes -days 3650 -subj "/CN=House CA" \
    -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -keyout rootCA-key.pem -out rootCA.pem 2>/dev/null
  chmod 600 rootCA-key.pem
  echo "CA créée : rootCA.pem, à installer sur chaque appareil"
fi

# Chrome exige la liste des hôtes dans le certificat (SAN) : IP:… pour une adresse, DNS:… pour un nom.
SAN=$(echo "$HOSTS" | tr ',' '\n' | sed -E 's/^ *([0-9.]+) *$/IP:\1/; t; s/^ *(.*[^ ]) *$/DNS:\1/' | paste -sd, -)

if [ -f cert.pem ] && [ "$(cat hosts.txt 2>/dev/null)" = "$SAN" ] && openssl x509 -in cert.pem -checkend 2592000 >/dev/null; then
  echo "Certificat valide pour $SAN"
else
  openssl req -new -newkey rsa:2048 -nodes -subj "/CN=house" -keyout key.pem -out csr.pem 2>/dev/null
  printf 'subjectAltName=%s\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n' "$SAN" > ext.cnf
  openssl x509 -req -in csr.pem -CA rootCA.pem -CAkey rootCA-key.pem -CAcreateserial -days 820 -extfile ext.cnf -out cert.pem 2>/dev/null
  rm -f csr.pem ext.cnf
  echo "$SAN" > hosts.txt
  echo "Certificat créé pour $SAN"
fi

# L'API (utilisateur node) et Frigate lisent la clé du PC ; celle de la CA reste en 600.
chmod 644 key.pem cert.pem
# Frigate lit fullchain.pem et privkey.pem dans un sous-dossier monté seul chez lui, sans la clé de la CA.
cp cert.pem frigate/fullchain.pem
cp key.pem frigate/privkey.pem
