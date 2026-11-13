# Le site compilé (dossier www, fabriqué par deploy.sh : npm run build dans ce dossier) servi par nginx sans droits.
# Image nginx « unprivileged » : tourne en utilisateur 101, sans aucun droit Linux, écrit seulement dans /tmp.
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY www /usr/share/nginx/html
