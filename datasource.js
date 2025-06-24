const { DataSource } = require('typeorm');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Función para obtener variables de entorno
const getEnv = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value;
};

// Buscar archivos de entidades para verificar si se están encontrando correctamente
const entitiesPath = path.join(__dirname, '/dist/src/**/*.entity.js');
console.log('Buscando entidades en:', entitiesPath);

// Configuración de la base de datos
const databaseConfig = {
  host: getEnv('TYPEORM_HOST', 'localhost'),
  port: parseInt(getEnv('TYPEORM_PORT', '5432')),
  user: getEnv('TYPEORM_USERNAME', 'postgres'),
  pass: getEnv('TYPEORM_PASSWORD', 'postgres'),
  name: getEnv('TYPEORM_DB_NAME', 'converxa_chat_v1'),
};

// Exportar la configuración de DataSource
module.exports = new DataSource({
  type: 'postgres',
  host: databaseConfig.host,
  port: databaseConfig.port,
  username: databaseConfig.user,
  password: databaseConfig.pass,
  database: databaseConfig.name,
  synchronize: false,
  migrationsRun: false,
  logging: true,
  entities: [path.join(__dirname, '/dist/src/**/*.entity.js')],
  migrations: [path.join(__dirname, '/dist/src/migrations/*.js')],
  useUTC: true,
});
