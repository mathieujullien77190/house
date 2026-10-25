# Conteneur éphémère : crée la CA de la maison et le certificat du PC, puis s'arrête (voir make-certs.sh).
FROM alpine:3
RUN apk add --no-cache openssl
COPY make-certs.sh /make-certs.sh
ENTRYPOINT ["sh", "/make-certs.sh"]
