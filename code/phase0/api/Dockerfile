# Le contexte de build est le dossier phase0. Deux étapes : la WebApp est compilée (Vite) dans la première,
# la seconde installe les dépendances de l'API (Express, sans celles de développement) et sert le dossier web.
FROM node:24-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev
COPY api/src ./src
COPY --from=web /web/dist ./web
USER node
EXPOSE 8080
CMD ["node", "src/index.ts"]
