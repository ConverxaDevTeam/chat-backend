# Usar la imagen base de Node.js
FROM node:23-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar el archivo package.json y ejecutar npm install
COPY package.json ./
RUN npm install -g @nestjs/cli
RUN npm install

# Instalar PostgreSQL client (psql) para poder conectarte a la DB si es necesario
RUN apk add --no-cache postgresql-client

# Copiar el resto del proyecto al contenedor
COPY . .

# Ejecutar la construcción del proyecto
RUN npm run build

# Exponer el puerto de la aplicación
EXPOSE 3001

# Definir el comando para iniciar la aplicación
CMD ["npm", "run", "start:proddocker"]
