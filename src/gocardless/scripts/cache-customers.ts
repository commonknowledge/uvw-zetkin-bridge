import { getGoCardlessPaginatedList, getRelevantZetkinDataFromGoCardlessCustomer } from '../gocardless';
import db from '../../db';
import * as GoCardless from 'gocardless-nodejs';
import { chunk } from 'lodash';
import { upsertZammadUser, ZammadUser } from '../../zammad/zammad';
import Phone from 'awesome-phonenumber';
import { GoCardlessCustomerCache } from '../../db';

export const saveCustomersToDatabase = async (customers: GoCardless.Customer[], createIfNew = true, updateIfExisting = true) => {
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

export const syncCustomersToZammad = async () => {
  const unsynced = await GoCardlessCustomerCache()
  const synced = []
  
  await Promise.all(chunk(unsynced, Math.ceil(unsynced.length / 3)).map(async (people) => {
    for (const { id, created_at, ...person } of people) {
      try {
        console.log(unsynced.length, synced.length)
        const paymentData = await getRelevantZetkinDataFromGoCardlessCustomer(id)
        const newPerson: Partial<ZammadUser> = {
          ...person,
          ...paymentData,
          address: [
            person.address_line1,
            person.address_line2,
            person.address_line3,
            person.city,
            person.region
          ].filter(Boolean).join(",\n"),
          zip: person.postal_code,
          login: String(
            person.email || person.phone_number || `${person.given_name} ${person.family_name}`
          ).replace(/\s/mig, ''),
          firstname: person.given_name,
          lastname: person.family_name,
          mobile: person.phone_number ? new Phone(String(person.phone_number), 'GB').getNumber('e164') : undefined,
          phone: person.phone_number ? new Phone(String(person.phone_number), 'GB').getNumber('e164') : undefined
        }
        // Create/update Zammad
        const zammadUser = await upsertZammadUser(newPerson)
        // Store this in DB
        await GoCardlessCustomerCache()
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