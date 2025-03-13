const { DataSource } = require('typeorm');

const installPgVector = async () => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await dataSource.initialize();
  await dataSource.query('CREATE EXTENSION IF NOT EXISTS vector;');
  await dataSource.destroy();
};

installPgVector().catch((error) => {
  console.error('Error installing pgvector:', error);
  process.exit(1);
});
