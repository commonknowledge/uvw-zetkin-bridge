import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTableIfNotExists('events', function(t) {
    t.string('id').unique().primary().notNullable()
    t.jsonb('data').notNullable()
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
    t.string('resource_type').notNullable()
    t.string('action').notNullable()
  });
}


export async function down(knex: Knex): Promise<any> {
  knex.schema.dropTableIfExists('events')
}

