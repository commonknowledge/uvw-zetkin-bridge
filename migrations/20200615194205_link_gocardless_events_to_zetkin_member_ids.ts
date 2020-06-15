import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
  return knex.schema.table('events', function(t) {
    t.string('zetkinPersonId')
  });
}


export async function down(knex: Knex): Promise<any> {
  return knex.schema.table('events', function(t) {
    t.dropColumn('zetkinPersonId')
  });
}

