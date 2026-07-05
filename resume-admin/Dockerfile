# Stages: dev (Vite HMR) | build | runtime (nginx, legacy standalone)
# Prod bundles SPA into app via resume-api/Dockerfile.prod

FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV VITE_BASE=/admin/
EXPOSE 5174
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_API_URL=
ARG VITE_BASE=/admin/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE=$VITE_BASE
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
