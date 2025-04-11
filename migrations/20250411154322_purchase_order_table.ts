import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("credit_orders", (table) => {
        table.uuid("id").primary();
        table.decimal("amount", 14, 2).notNullable();
        table.integer("credits").notNullable();
        table.string("currency", 3).notNullable();
        table.uuid("userId").notNullable();
        table.timestamp("createdAt").defaultTo(knex.fn.now()).notNullable();
        table.timestamp("updatedAt").defaultTo(knex.fn.now()).notNullable();
        table.enu("status", ["pending", "paid", "failed"]).notNullable();
        table.string("link").notNullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("credit_orders");
}

