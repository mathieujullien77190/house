# Le contexte de build est le dossier phase0 : l'image contient l'API et la WebApp (dossier web).
FROM node:24-alpine
WORKDIR /app
COPY api/package.json ./
COPY api/src ./src
COPY web ./web
USER node
EXPOSE 8080
CMD ["node", "src/index.ts"]
