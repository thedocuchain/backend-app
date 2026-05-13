FROM node:20-bookworm AS deps
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
FROM node:20-bookworm AS build
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
ENV NODE_ENV production
RUN npm run build && npm prune

# PRODUCTION
FROM node:20-bookworm AS production
RUN set -o errexit \
    && rm -rf /usr/share/doc/* /usr/share/man/* /tmp/* /root/.npm /opt/yarn-* \
    && apt-get update -o Acquire::AllowInsecureRepositories=true \
    && apt-get install -y --no-install-recommends --allow-unauthenticated \
       libreoffice-writer \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/* /usr/share/doc/* /usr/share/man/*

USER node

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/package.json ./

ENV NODE_ENV production

CMD [ "npm", "run", "start:prod" ]
