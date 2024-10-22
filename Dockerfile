## Build

FROM node:alpine as build

WORKDIR /app

COPY . .

RUN yarn install && yarn build

FROM node:alpine

WORKDIR /app

COPY --from=build /app/build build
COPY --from=build /app/package.json package.json
COPY --from=build /app/yarn.lock yarn.lock

RUN yarn install --production

CMD ["yarn", "start"]
