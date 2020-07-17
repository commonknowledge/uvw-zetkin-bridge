import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTableIfNotExists('zammad_users', function(t) {
    t.timestamps(false, true);
    t.integer('id').unique().primary().notNullable()
    t.jsonb('data').nullable()
  });
}


export async function down(knex: Knex): Promise<any> {
  knex.schema.dropTableIfExists('zammad_users')
}

