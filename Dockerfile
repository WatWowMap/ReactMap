## Simple Dockerfile to build ReactMap (v2 branch)
# - Inside the container, the content of this git repo lives in /home/node/
## You have to mount your configs into the container:
# - mount local.json to /home/node/server/src/configs/local.json
# - mount areas.json to /home/node/server/src/configs/areas.json

FROM oven/bun:1.3.11-alpine

WORKDIR /home/node

RUN apk add --no-cache git

COPY . .
RUN bun install --frozen-lockfile
RUN bun run build

CMD ["bun", "."]
