import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTableIfNotExists('request_log', function(t) {
    t.increments('id').primary();
    t.timestamps(false, true);
    t.jsonb('headers').nullable();
    t.jsonb('body').nullable();
  });
}

export async function down(knex: Knex): Promise<any> {
  knex.schema.dropTableIfExists('request_log')
}

