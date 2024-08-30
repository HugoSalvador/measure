import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('measures', (table) => {
        table.boolean('confirm_measure').notNullable()
    })
}


export async function down(knex: Knex): Promise<void> {}

