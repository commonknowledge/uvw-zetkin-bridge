import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
  return knex.schema.table('zammad_users', function(t) {
    t.string('email').nullable()
    t.string('phone').nullable()
    t.string('mobile').nullable()
  });
}


export async function down(knex: Knex): Promise<any> {
  return knex.schema.table('zammad_users', function(t) {
    t.dropColumn('email')
    t.dropColumn('phone')
    t.dropColumn('mobile')
  });
}

