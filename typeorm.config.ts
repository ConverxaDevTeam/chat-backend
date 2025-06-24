import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.TYPEORM_HOST || 'localhost',
  port: parseInt(process.env.TYPEORM_PORT || '5432'),
  username: process.env.TYPEORM_USERNAME || 'postgres',
  password: process.env.TYPEORM_PASSWORD || 'postgres',
  database: process.env.TYPEORM_DB_NAME || 'converxa_chat_v2',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/src/migrations/*{.ts,.js}'],
  synchronize: true,
  logging: true,
  migrationsRun: true,
  migrationsTableName: 'migrations',
};

module.exports = new DataSource(dataSourceOptions);
