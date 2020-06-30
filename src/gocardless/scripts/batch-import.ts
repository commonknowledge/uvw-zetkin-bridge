import { getGoCardlessPaginatedList } from '../gocardless';
import * as GoCardless from 'gocardless-nodejs';
import { ZetkinMemberGet, getZetkinCustomData } from '../../zetkin/zetkin';
import { getOrCreateZetkinPersonByGoCardlessCustomer } from '../zetkin-sync';
import { chunk } from 'lodash';
import { aggressivelyRetry } from '../../zetkin/auth';
// For each GoCardless customer, match to Zetkin member and update custom fields.

export const syncGoCardlessCustomersToZetkin = async (
  limit: number = 1,
  customers?: GoCardless.Customer[]
) => {
  const matches: Array<{
    customer: GoCardless.Customer,
    zetkinMember: ZetkinMemberGet
  }> = []
  try {
    // Get GoCardless customers
    // @ts-ignore
    if (!customers) {
      customers = await getGoCardlessPaginatedList('customers', { limit })
    }
    console.log(`Syncing ${customers.length} to Zetkin`)
    // For each, update or create a Zetkin person record
    // await Promise.all(chunk(customers, Math.ceil(customers.length)).map(async c => {
      for (const customer of customers) {
        try {
          const zetkinMember = await getOrCreateZetkinPersonByGoCardlessCustomer(
            customer,
            // Don't update the member if it matches the current customer
            // In order to limit the number on requests made to Zetkin
            async (member) => {
              const customFields = await getZetkinCustomData(member.id)
              const gocardlessURL = customFields.find(field => field.field.slug === 'gocardless_url')?.value
              return !gocardlessURL.includes(customer.id)
            }
          )
          matches.push({ customer, zetkinMember })
          console.log(`${customers.length - matches.length} of ${customers.length} to go`)
        } catch (e) {
          console.error('Sync failed for member', { gocardlessId: customer.id }, e)
        }
      }
    // }))
    // Update custom fields on that Zetkin person for GoCardless
  } catch (e) {
    console.error(e)
  } finally {
    return matches
  }
}