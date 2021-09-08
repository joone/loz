FROM node:14.17.6-slim
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

COPY ./dist /dist
COPY ./package.json /package.json
COPY ./package-lock.json /package-lock.json

RUN NODE_ENV=$NODE_ENV npm install
CMD ["node", "dist/index.js"]
