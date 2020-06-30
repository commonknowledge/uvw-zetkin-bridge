import * as Knex from "knex";


export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTableIfNotExists('gocardless_customers', function(t) {
    t.timestamps(false, true);
    t.string('id').unique().primary().notNullable()
    t.string('address_line1').nullable()
    t.string('address_line2').nullable()
    t.string('address_line3').nullable()
    t.string('city').nullable()
    t.string('company_name').nullable()
    t.string('country_code').nullable()
    t.string('danish_identity_number').nullable()
    t.string('email').nullable()
    t.string('family_name').nullable()
    t.string('given_name').nullable()
    t.string('language').nullable()
    t.string('phone_number').nullable()
    t.string('postal_code').nullable()
    t.string('region').nullable()
    t.string('swedish_identity_number').nullable()
  });
}


export async function down(knex: Knex): Promise<any> {
  knex.schema.dropTableIfExists('gocardless_customers')
}
