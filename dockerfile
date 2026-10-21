# Immagine del backend Emergency Operations (API Express + frontend statico in public/)
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Prima solo le dipendenze: Docker le riusa dalla cache se package.json non cambia
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Poi il codice dell'applicazione
COPY src ./src
COPY public ./public

# Non gira come amministratore (piu sicuro)
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]