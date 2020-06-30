import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
  return knex.schema.table('events', function(t) {
    t.boolean('synced_to_zammad').defaultTo(false)
  });
}


export async function down(knex: Knex): Promise<any> {
  return knex.schema.table('events', function(t) {
    t.boolean('synced_to_zammad')
  });
}

