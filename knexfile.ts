import type { Knex } from 'knex';

const config: Knex.Config = {
    client: 'sqlite3',
    connection: {
      filename: './db/database.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    }
  }

export default config;
