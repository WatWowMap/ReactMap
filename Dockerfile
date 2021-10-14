## Simple Dockerfile to build ReactMap (main branch)
# - Inside the container, the content of this git repo lives in /home/node/
## You have to mount your configs into the container:
# - mount config.json to /home/node/server/src/configs/config.json
# - mount areas.json to /home/node/server/src/configs/areas.json
# - Also mount every other configuration file necessary into the according directory.

FROM node:14-alpine

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /home/node
COPY package.json .
RUN apk add git
RUN npm install -g yarn
COPY . .
RUN yarn install --ignore-optional
RUN yarn build
