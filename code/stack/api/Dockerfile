# Le contexte de build est le dossier stack. Deux étapes : la WebApp est compilée (Vite) dans la première,
# avec le paquet ui qu'elle consomme en source (lien ../ui) ; la seconde installe les dépendances de l'API
# (Express et swagger-ui-dist pour /docs, sans celles de développement ni les fichiers de Swagger UI inutiles) et sert le dossier web compilé.
FROM node:24-alpine AS web
WORKDIR /build
COPY ui ./ui
COPY web/package.json web/package-lock.json ./web/
WORKDIR /build/web
RUN npm ci
COPY web ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev && rm -f node_modules/swagger-ui-dist/*.map node_modules/swagger-ui-dist/swagger-ui-es-bundle* node_modules/swagger-ui-dist/swagger-ui.js node_modules/swagger-ui-dist/swagger-ui-standalone-preset.js node_modules/swagger-ui-dist/log.*
COPY api/src ./src
COPY --from=web /build/web/dist ./web
USER node
EXPOSE 8080
CMD ["node", "src/index.ts"]
