FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Injected at build time from Railway service variables (never commit real values).
ARG VITE_GAMES_SERVER_URL
ARG VITE_HOCUSPOCUS_URL
ENV VITE_GAMES_SERVER_URL=$VITE_GAMES_SERVER_URL
ENV VITE_HOCUSPOCUS_URL=$VITE_HOCUSPOCUS_URL

RUN npm run build

FROM node:20-alpine
WORKDIR /app

RUN npm install -g serve@14.2.4

COPY --from=build /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT}"]
