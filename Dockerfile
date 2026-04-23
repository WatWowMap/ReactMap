## Simple Dockerfile to build ReactMap (main branch)
# - Inside the container, the content of this git repo lives in /home/node/
## You have to mount your configs into the container:
# - mount local.json to /home/node/server/src/configs/local.json
# - mount areas.json to /home/node/server/src/configs/areas.json
# - Also mount every other configuration file necessary into the according directory.

FROM node:22-alpine AS builder

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /home/node

# Install minimal build deps
RUN apk add --no-cache git python3 make g++

# Install yarn (node:22 includes corepack but ensure yarn v1 available)
RUN npm install -g yarn@1.22.19

# Copy package manifests first for better layer caching
COPY package.json yarn.lock ./
COPY packages ./packages
COPY server ./server
COPY public ./public
COPY ReactMap.js ./ReactMap.js

# Copy remaining source needed for build (excluding node_modules via .dockerignore)
COPY . .

# Capture git metadata for update checks in Docker builds.
RUN if [ -d .git ]; then \
    git rev-parse HEAD > .gitsha; \
    ref="$(git symbolic-ref -q HEAD || true)"; \
    if [ -z "$ref" ]; then ref="refs/heads/main"; fi; \
    printf '%s\n' "$ref" > .gitref; \
  fi

# Install all deps and build
RUN yarn install --frozen-lockfile
RUN yarn build

# Reinstall only production dependencies to a clean node_modules folder
RUN rm -rf node_modules && HUSKY=0 yarn install --production --frozen-lockfile


# Final runtime image
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
WORKDIR /home/node

# Install yarn in runtime if you need it (keeps compatibility).
RUN npm install -g yarn@1.22.19

# Copy production node_modules and built assets from builder
COPY --from=builder /home/node/node_modules ./node_modules
COPY --from=builder /home/node/package.json ./package.json
COPY --from=builder /home/node/server ./server
COPY --from=builder /home/node/public ./public
COPY --from=builder /home/node/dist ./dist
COPY --from=builder /home/node/ReactMap.js ./ReactMap.js
COPY --from=builder /home/node/packages ./packages
COPY --from=builder /home/node/config ./config
COPY --from=builder /home/node/.gitsha ./.gitsha
COPY --from=builder /home/node/.gitref ./.gitref
