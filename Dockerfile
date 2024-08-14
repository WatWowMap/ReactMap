## Simple Dockerfile to build ReactMap (main branch)
# - Inside the container, the content of this git repo lives in /home/node/
## You have to mount your configs into the container:
# - mount local.json to /home/node/server/src/configs/local.json
# - mount areas.json to /home/node/server/src/configs/areas.json
# - Also mount every other configuration file necessary into the according directory.

FROM node:18-alpine

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /home/node
COPY package.json .
COPY yarn.lock .
RUN apk add git
RUN npm install -g yarn
COPY . .
RUN yarn install
RUN yarn build
