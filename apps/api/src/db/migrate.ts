import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../env.js';

async function main() {
  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });
  const dbm = drizzle(migrationClient);
  console.log('Migration başlıyor...');
  await migrate(dbm, { migrationsFolder: './drizzle' });
  console.log('Migration tamamlandı.');
  await migrationClient.end();
}

main().catch((err) => {
  console.error('Migration hatası:', err);
  process.exit(1);
});
