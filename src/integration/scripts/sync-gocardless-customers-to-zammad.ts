import { GoCardlessCustomerCache } from '../../db';
import { chunk } from 'lodash';
import { ZammadUser, upsertZammadUser } from '../../zammad/zammad';
import { getPayAndSubscriptionDataFromGoCardlessCustomer } from '../../gocardless/gocardless';
import Phone from 'awesome-phonenumber';

const syncCustomersToZammad = async () => {
  console.log("Syncing GoCardless Customers to Zammad")
  const unsynced = await GoCardlessCustomerCache()
  const synced = []
  
  await Promise.all(chunk(unsynced, Math.ceil(unsynced.length / 3)).map(async (people) => {
    for (const { id, created_at, ...person } of people) {
      try {
        console.log(unsynced.length, synced.length)
        const paymentData = await getPayAndSubscriptionDataFromGoCardlessCustomer(id)
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

(async () => {
  await syncCustomersToZammad()
  process.exit()
})()