/**
 * Database client — Drizzle ORM over PostgreSQL
 *
 * Uses a single connection in development (avoids exhausting Supabase free tier).
 * In production (Vercel serverless), each function invocation gets its own
 * connection from the pool — this is expected behaviour.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Prevent multiple connections in development hot-reload
const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle> }

const client = postgres(process.env.DATABASE_URL!, {
  max: 1,              // Supabase free tier: max 60 connections total
  idle_timeout: 20,    // Close idle connections after 20s
  connect_timeout: 10, // Fail fast if DB is unreachable
})

export const db = globalForDb.db || drizzle(client, { schema })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db
}

export { schema }
export type Database = typeof db
