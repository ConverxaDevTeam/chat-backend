const { Client } = require('pg');

const client = new Client({
  user: process.env.TYPEORM_USERNAME || 'postgres',
  host: process.env.TYPEORM_HOST || 'localhost',
  database: process.env.TYPEORM_DB_NAME || 'postgres',
  password: process.env.TYPEORM_PASSWORD || 'postgres',
  port: parseInt(process.env.TYPEORM_PORT) || 5432,
});

client.connect()
  .then(() => client.query('CREATE EXTENSION IF NOT EXISTS vector;'))
  .catch((error) => {
    console.error('Error installing pgvector:', error);
    process.exit(1);
  })
  .finally(() => client.end());
