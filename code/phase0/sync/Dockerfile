# Le contexte de build est le dossier phase0 (pour voir le paquet ui). Deux étapes : la page de House Sync
# (React, sync/web) est compilée dans la première avec le paquet ui qu'elle consomme en source (lien ../../ui) ;
# la seconde ne garde que le script et le dossier web compilé, qu'il sert lui-même sur le port 8081.
FROM node:24-alpine AS web
WORKDIR /build
COPY ui ./ui
COPY sync/web/package.json sync/web/package-lock.json ./sync/web/
WORKDIR /build/sync/web
RUN npm ci
COPY sync/web ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY sync/package.json ./
COPY sync/src ./src
COPY --from=web /build/sync/web/dist ./web
USER node
CMD ["node", "src/index.ts"]
