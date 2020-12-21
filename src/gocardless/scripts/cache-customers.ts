import { getGoCardlessPaginatedList, getPayAndSubscriptionDataFromGoCardlessCustomer } from '../gocardless';
import db from '../../db';
import * as GoCardless from 'gocardless-nodejs';
import { chunk } from 'lodash';
import { GoCardlessCustomerCache } from '../../db';

const saveCustomersToDatabase = async (customers: GoCardless.Customer[]) => {
  const cached = await GoCardlessCustomerCache().select('*')
  const cachedIds = cached.map(c => c.id)

  /**
   * Insert new records
   */

  const customersToAdd = customers.filter(d => !cachedIds.includes(d.id))

  for (const cs of chunk(customersToAdd, 250)) {
    await GoCardlessCustomerCache()
      .insert(cs.map(mapCustomerToDatabase))
  }

  /**
   * Update existing records
   */

  const customersToUpdate = customers.filter(d => cachedIds.includes(d.id))

  // https://stackoverflow.com/a/48069213/1053937
  await db.transaction(trx => {
    const queries = [];

    for (const customer of customersToUpdate) {
      const { id, ...newData } = mapCustomerToDatabase(customer)
      const query = GoCardlessCustomerCache()
        .update(newData)
        .where({ id: customer.id })
        .transacting(trx) // This makes every update be in the same transaction
      queries.push(query)
    }

    return Promise.all(queries) // Once every query is written
        .then(trx.commit) // We try to execute all of them
        .catch(trx.rollback); // And rollback in case any of them goes wrong
  });

  return customers
}

const mapCustomerToDatabase = (c: GoCardless.Customer) => {
  const { created_at, metadata,...desireableData } = c
  return desireableData
}

(async () => {
  const customers = await getGoCardlessPaginatedList<GoCardless.Customer>(
    'customers', { limit: 50000 }
  )
  await saveCustomersToDatabase(customers)
  process.exit()
})()