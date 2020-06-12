// Update with your config settings.
import './env'
import path from 'path'

const migrations = {
  extension: 'ts',
  tableName: "knex_migrations",
  directory: path.join(__dirname, './migrations'),
}

module.exports = {
  test: {
    client: "sqlite3",
    connection: { filename: ":memory:" },
    pool: { min: 1, max: 1 },
    migrations
  },

  development: {
    client: "postgresql",
    connection: {
      host: '127.0.0.1',
      port: process.env.POSTGRES_PUBLIC_PORT,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations
  },

  production: {
    client: "postgresql",
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations
  }
};