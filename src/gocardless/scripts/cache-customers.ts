import { getGoCardlessPaginatedList } from '../gocardless';
import db from '../../db';
import * as GoCardless from 'gocardless-nodejs';
import { chunk } from 'lodash';
import { upsertZammadUser } from '../../zammad/zammad';
import Phone from 'awesome-phonenumber';

const saveAllCustomersToDatabase = async () => {
  const customers = await getGoCardlessPaginatedList<GoCardless.Customer>
    ('customers', { limit: 50000 })

  const cached = await db<GoCardless.Customer>('gocardless_customers').select('*')
  const cachedIds = cached.map(c => c.id)

  const customersToAdd = customers.filter(d => !cachedIds.includes(d.id))

  for (const cs of chunk(customersToAdd, 250)) {
    await db<GoCardless.Customer>('gocardless_customers')
      .insert(cs.map(mapCustomerToDatabase))
  }

  return customers
}

const syncCustomersToZammad = async () => {
  const unsynced = await db<GoCardless.Customer>('gocardless_customers')
    .whereNot({ synced_to_zammad: true } as any)
  const synced = []
  
  await Promise.all(chunk(unsynced, Math.ceil(unsynced.length / 3)).map(async (people) => {
    for (const { id, created_at, ...person } of people) {
      try {
        console.log(unsynced.length, synced.length)
        const newPerson = {
          login: String(
            person.email || person.phone_number || `${person.given_name} ${person.family_name}`
          ).replace(/\s/mig, ''),
          ...person,
          mobile: new Phone(person.phone_number, 'GB').getNumber('e164')
        }
        // Create/update Zammad
        const zammadUser = await upsertZammadUser(newPerson)
        // Store this in DB
        await db<GoCardless.Customer>('gocardless_customers')
          .update({ synced_to_zammad: true } as any)
          .where({ id })
        synced.push(zammadUser)
      } catch (e) {
        console.error(e)
      }
    }
  }))
}

const mapCustomerToDatabase = (c: GoCardless.Customer) => {
  const { created_at, metadata,...desireableData } = c
  return desireableData
}

(async () => {
  await saveAllCustomersToDatabase()
  await syncCustomersToZammad()
  process.exit()
})()