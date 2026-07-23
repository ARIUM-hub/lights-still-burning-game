FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY server ./server
COPY src ./src
COPY tsconfig.json ./

CMD ["npm", "run", "start:server"]
