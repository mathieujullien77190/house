# La page invité : un script Node 24 sans dépendance, qui ne sert que le direct léger des caméras (voir CLAUDE.md).
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
USER node
EXPOSE 8090
CMD ["node", "src/index.ts"]
