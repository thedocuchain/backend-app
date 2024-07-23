FROM node:20 AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

# DEVELOPMENT
FROM node:20-alpine AS development
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
CMD ["npm", "run", "start:dev"]

# BUILD
FROM node:20 AS build
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
ENV NODE_ENV production
RUN npm run build && npm prune

# PRODUCTION
FROM node:20 AS production
RUN set -o errexit -o nounset \
    && apt update && apt upgrade -y \
    && apt install build-essential \
    libcairo2-dev libpango1.0-dev libjpeg-dev \
    libgif-dev librsvg2-dev libreoffice -y \
    && rm -rf /var/apt/cache/*

USER node

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/package.json ./

ENV NODE_ENV production

CMD [ "npm", "run", "start:prod" ]
