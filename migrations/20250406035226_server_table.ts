import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("servers", (table) => {
        table.string("serverId").primary();
        table.string("region").notNullable();
        table.string("variant").notNullable();
        table.string("hostIp").nullable();
        table.integer("hostPort").nullable();
        table.string("tvIp").nullable();
        table.integer("tvPort").nullable();
        table.string("rconPassword").nullable();
        table.string("hostPassword").nullable();
        table.string("rconAddress").nullable();
        table.string("tvPassword").nullable();
        table.timestamp("createdAt").defaultTo(knex.fn.now());
        table.string("createdBy").nullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("servers");
}

