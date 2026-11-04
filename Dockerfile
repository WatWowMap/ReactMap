# syntax=docker/dockerfile:1
## ReactMap Docker image
# - Inside the container, the app lives in /home/node/
# - `yarn start` builds the client with your config, then starts the server.
## You have to mount your configs into the container:
# - mount local.json to /home/node/server/src/configs/local.json
# - mount areas.json to /home/node/server/src/configs/areas.json
# - Also mount every other configuration file necessary into the according directory.

ARG NODE_IMAGE=node:22.23.4-alpine

# ---- build: full install + production build (verifies the bundle compiles) ----
FROM ${NODE_IMAGE} AS build
WORKDIR /home/node
# git is only needed to fetch git-URL dependencies during install
RUN apk add --no-cache git
ENV HUSKY=0

# Workspace manifests, packages and default config are needed by `postinstall`
COPY package.json yarn.lock ./
COPY packages ./packages
COPY config ./config
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile --network-timeout 600000

COPY . .
RUN yarn build

# ---- prune: drop devDependencies in place (native builds + masterfile are kept) ----
FROM build AS prune
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --production --frozen-lockfile --ignore-scripts --network-timeout 600000

# ---- runtime ----
FROM ${NODE_IMAGE}
# Kept for parity with previous images (global npm installs in derived images)
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
WORKDIR /home/node
COPY --from=prune /home/node /home/node

ARG GIT_SHA=""
ARG GIT_REF=""
ENV GIT_SHA=${GIT_SHA} \
    GIT_REF=${GIT_REF}

EXPOSE 8080
CMD ["yarn", "start"]
