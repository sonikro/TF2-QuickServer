import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("servers", (table) => {
        table.timestamp("terminatingAt").nullable();
    });

    await knex("servers")
        .where({ status: "terminating" })
        .update({ terminatingAt: knex.ref("createdAt") });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("servers", (table) => {
        table.dropColumn("terminatingAt");
    });
}
