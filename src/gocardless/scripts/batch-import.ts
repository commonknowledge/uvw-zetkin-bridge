import { getGoCardlessPaginatedList } from '../gocardless';
import * as GoCardless from 'gocardless-nodejs';
import { ZetkinMemberGet } from '../../zetkin/zetkin';
import { getOrCreateZetkinPersonByGoCardlessCustomer } from '../zetkin-sync';
// For each GoCardless customer, match to Zetkin member and update custom fields.

export const syncGoCardlessCustomersToZetkin = async (
  limit: number = 1,
  customers?: GoCardless.Customer[]
) => {
  // Get GoCardless customers
  // @ts-ignore
  const matches: Array<{
    customer: GoCardless.Customer,
    zetkinMember: ZetkinMemberGet
  }> = []
  if (!customers) {
    customers = await getGoCardlessPaginatedList('customers', { limit })
  }
  console.log(`Syncing ${customers.length} to Zetkin`)
  // For each, update or create a Zetkin person record
  for (const customer of customers) {
    try {
      console.log(`${customers.length - matches.length} of ${customers.length} to go`)
      const zetkinMember = await getOrCreateZetkinPersonByGoCardlessCustomer(customer)
      matches.push({ customer, zetkinMember })
    } catch (e) {
      console.error(e)
    }
  }
  // Update custom fields on that Zetkin person for GoCardless
  return matches
}