# Deux étapes : la page de House Sync (React, dossier web) est compilée dans la première ; la seconde ne garde
# que le script et le dossier web compilé, qu'il sert lui-même sur le port 8081.
FROM node:24-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY --from=web /web/dist ./web
USER node
CMD ["node", "src/index.ts"]
