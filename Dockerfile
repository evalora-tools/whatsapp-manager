# Build stage para el cliente
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Build stage para el servidor
FROM node:18-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./

# Stage final
FROM node:18-alpine
WORKDIR /app

# Copiar el servidor
COPY --from=server-build /app/server ./server

# Copiar el build del cliente al servidor (para servir estáticos)
COPY --from=client-build /app/client/build ./client/build

# Instalar serve para servir archivos estáticos
RUN npm install -g serve

WORKDIR /app/server

# Exponer puertos
EXPOSE 3001 3000

# Script para iniciar ambos servicios
CMD ["sh", "-c", "node index.js & serve -s ../client/build -l 3000"]
