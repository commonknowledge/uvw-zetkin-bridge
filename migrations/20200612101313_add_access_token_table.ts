import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTableIfNotExists('tokens', function(t) {
    t.timestamps(false, true);
    t.string('access_token').unique().primary();
    t.integer('expires_in');
    t.dateTime('expiry_time');
    t.string('refresh_token').unique().nullable();
    t.string('token_type').nullable();
    t.string('origin').nullable();
  });
}


export async function down(knex: Knex): Promise<any> {
  knex.schema.dropTableIfExists('tokens')
}

