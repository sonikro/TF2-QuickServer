import type { Knex } from 'knex';

const config: Knex.Config = {
    client: 'sqlite3',
    connection: {
      filename: './db/database.sqlite3'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    },
    pool: {
      afterCreate: (connection: any, cb: any) => {
        connection.run('PRAGMA foreign_keys=ON', cb); // Enable foreign key constraints on SQLITE3
      }
    }
  }

export default config;
