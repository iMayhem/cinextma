FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY . .

ARG NEXT_PUBLIC_TMDB_ACCESS_TOKEN
ENV NEXT_PUBLIC_TMDB_ACCESS_TOKEN=$NEXT_PUBLIC_TMDB_ACCESS_TOKEN
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
