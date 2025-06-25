FROM node:23-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache \
    curl \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev \
    linux-headers

COPY package.json ./

RUN npm install -g @nestjs/cli
RUN npm install

COPY . .

RUN npm run build

# Expose both ports for blue-green
EXPOSE 3001 3002

CMD ["npm", "run", "start:proddocker"]
