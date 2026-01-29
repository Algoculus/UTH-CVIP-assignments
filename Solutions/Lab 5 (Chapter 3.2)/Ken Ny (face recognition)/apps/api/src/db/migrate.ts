import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import { envConfig } from "../config/env-config"

async function runMigrations() {
  const pool = new Pool({
    connectionString: envConfig.DATABASE_URL,
  })

  const db = drizzle(pool)

  console.log("Running migrations...")

  await migrate(db, { migrationsFolder: "./drizzle" })

  console.log("Migrations completed successfully!")

  await pool.end()
}

runMigrations().catch((error) => {
  console.error("Migration failed:", error)
  process.exit(1)
})
