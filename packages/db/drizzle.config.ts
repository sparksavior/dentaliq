import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema/*',
  out: './src/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: `file:${process.env.DATABASE_PATH ?? 'dentaliq.db'}`,
  },
})
