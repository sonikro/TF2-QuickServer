import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("scheduled_servers", (table) => {
        table.string("id").primary();
        table.string("userId").notNullable();
        table.string("guildId").nullable();
        table.string("region").notNullable();
        table.string("variant").notNullable();
        table.timestamp("scheduledAt").notNullable();
        table.timestamp("triggerAt").notNullable();
        table.string("status").notNullable().defaultTo("scheduled");
        table.check("status IN ('scheduled','creating','created','failed','cancelled')");
        table.string("serverId").nullable();
        table.string("timezone").notNullable();
        table.timestamp("createdAt").defaultTo(knex.fn.now()).notNullable();
        table.timestamp("updatedAt").defaultTo(knex.fn.now()).notNullable();
        table.index(["userId"]);
        table.index(["status"]);
        table.index(["status", "triggerAt"]);
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("scheduled_servers");
}
