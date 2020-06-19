import { gocardless } from './gocardless';
import * as GoCardless from 'gocardless-nodejs';
import { ZetkinMemberGet } from './zetkin';
import { getOrCreateZetkinPersonByGoCardlessCustomer } from './gocardless-zetkin-sync';
// For each GoCardless customer, match to Zetkin member and update custom fields.

export const syncGoCardlessCustomersToZetkin = async (limit?: number) => {
  // Get GoCardless customers
  // @ts-ignore
  const matches: Array<{
    customer: GoCardless.Customer,
    zetkinMember: ZetkinMemberGet
  }> = []
  const { customers } = await gocardless.customers.list({ limit } as any)
  // For each, update or create a Zetkin person record
  for (const customer of customers) {
    const zetkinMember = await getOrCreateZetkinPersonByGoCardlessCustomer(customer)
    matches.push({ customer, zetkinMember })
  }
  // Update custom fields on that Zetkin person for GoCardless
  return matches
}