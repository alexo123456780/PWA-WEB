FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci -w @fieldreport/web -w @fieldreport/shared
COPY . .
RUN npm run build:shared
WORKDIR /app/apps/web

FROM base AS dev
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM base AS build
# Vacío = misma origen (/api/v1, lo resuelve nginx). En Vercel/Netlify se pasa la URL pública de la API.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
