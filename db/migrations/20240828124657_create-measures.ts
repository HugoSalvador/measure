import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('measures', (table) => {
        table.uuid('id').primary()
        table.text('type').notNullable()
        table.text('image_url').notNullable()
        table.float('value').notNullable()
        table.specificType('date_measured', 'timestamp without time zone').notNullable()
        table.text('customer_code').notNullable()
        table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
        table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()
    })
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('measures')
}

