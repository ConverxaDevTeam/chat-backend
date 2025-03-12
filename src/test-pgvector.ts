import { toSql, fromSql, SparseVector } from 'pgvector';
import { DataSource, EntitySchema } from 'typeorm';

async function testPgVector() {
  // Entity definition
  const Item = new EntitySchema({
    name: 'Item',
    tableName: 'typeorm_items',
    columns: {
      id: {
        type: Number,
        primary: true,
        generated: true,
      },
      embedding: {
        type: String,
      },
      half_embedding: {
        type: String,
      },
      binary_embedding: {
        type: String,
      },
      sparse_embedding: {
        type: String,
      },
    },
  });

  // Conexión a la base de datos
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.TYPEORM_HOST || 'localhost',
    port: parseInt(process.env.TYPEORM_PORT || '5432'),
    username: process.env.TYPEORM_USERNAME || 'postgres',
    password: process.env.TYPEORM_PASSWORD || 'Admin',
    database: process.env.TYPEORM_DB_NAME || 'sofia_chat_v2',
    logging: true,
    entities: [Item],
  });

  try {
    await AppDataSource.initialize();
    console.log('Conexión a la base de datos establecida');

    // Crear extensión pgvector si no existe
    await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('Extensión pgvector verificada');

    // Crear tabla para pruebas
    await AppDataSource.query('DROP TABLE IF EXISTS typeorm_items');
    await AppDataSource.query(
      'CREATE TABLE typeorm_items (id bigserial PRIMARY KEY, embedding vector(3), half_embedding halfvec(3), binary_embedding bit(3), sparse_embedding sparsevec(3))',
    );
    console.log('Tabla de prueba creada');

    // Repositorio para operaciones
    const itemRepository = AppDataSource.getRepository(Item);

    // Insertar datos de prueba
    await itemRepository.save({
      embedding: toSql([1, 1, 1]),
      half_embedding: toSql([1, 1, 1]),
      binary_embedding: '000',
      sparse_embedding: new SparseVector([1, 1, 1], 3).toString(),
    });
    await itemRepository.save({
      embedding: toSql([2, 2, 2]),
      half_embedding: toSql([2, 2, 2]),
      binary_embedding: '101',
      sparse_embedding: new SparseVector([2, 2, 2], 3).toString(),
    });
    await itemRepository.save({
      embedding: toSql([1, 1, 2]),
      half_embedding: toSql([1, 1, 2]),
      binary_embedding: '111',
      sparse_embedding: new SparseVector([1, 1, 2], 3).toString(),
    });
    console.log('Datos de prueba insertados');

    // Consulta con ordenamiento por similitud
    const items = await itemRepository
      .createQueryBuilder('item')
      .orderBy('embedding <-> :embedding')
      .setParameters({ embedding: toSql([1, 1, 1]) })
      .limit(5)
      .getMany();

    console.log('Resultados ordenados por similitud:');
    console.log(items.map((v) => v.id));

    // Verificar resultados
    if (items.length > 0) {
      console.log('Vector del primer resultado:', fromSql(items[0].embedding));
      console.log('Half vector del primer resultado:', fromSql(items[0].half_embedding));
      console.log('Binary del primer resultado:', items[0].binary_embedding);
      console.log('Sparse vector del primer resultado:', new SparseVector(items[0].sparse_embedding, 3).toArray());
    }

    console.log('Prueba completada con éxito');
  } catch (error) {
    console.error('Error durante la prueba:', error);
  } finally {
    // Limpiar
    if (AppDataSource.isInitialized) {
      await AppDataSource.query('DROP TABLE IF EXISTS typeorm_items');
      await AppDataSource.destroy();
      console.log('Conexión cerrada y tabla eliminada');
    }
  }
}

// Ejecutar prueba
testPgVector().catch(console.error);
