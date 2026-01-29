import { envConfig } from "@/config/env-config"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"
export * from "./schema"

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: envConfig.DATABASE_URL,
})

export const db = drizzle(pool, { schema })
export { pool }

// Export schema for use in queries

// Helper to close database connection
export const closeDatabase = async () => {
  await pool.end()
}
