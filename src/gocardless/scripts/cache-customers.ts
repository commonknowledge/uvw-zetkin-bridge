import { getGoCardlessPaginatedList } from '../gocardless';
import db from '../../db';
import * as GoCardless from 'gocardless-nodejs';
import { chunk } from 'lodash';

const saveAllCustomersToDatabase = async () => {
  const customers = await getGoCardlessPaginatedList<GoCardless.Customer>
    ('customers', { limit: 50000 })

  for (const cs of chunk(customers, 250)) {
    await db<GoCardless.Customer>('gocardless_customers')
      .insert(cs.map(mapCustomerToDatabase))
  }

  return customers
}

const mapCustomerToDatabase = (c: GoCardless.Customer) => {
  const { created_at, metadata,...desireableData } = c
  return desireableData
}

(async () => {
  await saveAllCustomersToDatabase()
  process.exit()
})()